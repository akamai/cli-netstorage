// Copyright 2017 Akamai Technologies, Inc. All Rights Reserved
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

let EdgeGrid = require('edgegrid');
let untildify = require('untildify');
let fs = require('fs');

//export
const LATEST_VERSION = {
    STAGING: -2,
    PRODUCTION: -1,
    LATEST: 0
};

//export
const AKAMAI_ENV = {
    STAGING: 'STAGING',
    PRODUCTION: 'PRODUCTION'
};

function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

/**
 * WebSite configuration and manipulation. Use this class to control the workflow of your Akamai configuration for which
 * you normally would use the Property Manager apis.
 * @author Colin Bendell
 */

//export default class WebSite {
class WebSite {

    /**
     * Default constructor. By default the `~/.edgerc` file is used for authentication, using the `[default]` section.
     * @param auth {Object} providing the `path`, and `section` for the authentication. Alternatively, you can pass in
     *     `clientToken`, `clientSecret`, `accessToken`, and `host` directly.
     */
    constructor(auth = {path:"~/.edgerc", section: "papi"}) {

        if (auth.clientToken && auth.clientSecret && auth.accessToken && auth.host)
            this._edge = new EdgeGrid(auth.clientToken. auth.clientSecret, auth.accessToken, auth.host, auth.debug);
        else
            this._edge = new EdgeGrid({path: untildify(auth.path), section: auth.section, debug: auth.debug});
        this._propertyById = {};
        this._propertyByName = {};
        this._propertyByHost = {};
        this._initComplete = false;
        this._propertyHostnameList = {};
        this._accountId = "";
        if (auth.create) {
            this._initComplete = true;
        }
    }

    _init() {
        if (this._initComplete )
            return Promise.resolve();
        if (Object.keys(this._propertyById).length > 0) {
            this._initComplete = true;
            return Promise.resolve();
        }

        let groupcontractList = [];
        console.time('Init PropertyManager cache');
        console.info('Init PropertyManager cache (hostnames and property list)');
        return this._getGroupList()
            .then(data => {
                return new Promise((resolve, reject) => {

                    //TODO: move this to use system tmp or cache dirs
                    if (fs.existsSync("hostlist.json")) {
                        fs.readFile("hostlist.json", function(err, hostlist) {
                            data.propertyHostnameList = JSON.parse(hostlist);
                            return resolve(data);
                        })
                    } else {
                        return resolve(data);
                    }
                })
            })
            .then(data => {
                this._propertyHostnameList = data.propertyHostnameList;
                this._accountId = data.accountId;
                data.groups.items.map(item => {
                    item.contractIds.map(contractId => {
                        // if we have filtered out the contract and group already through the constructor, limit the list appropriately
                        if ((!this._groupId || this._groupId === item.groupId) && (!this._contractId || this._contractId === contractId))
                            groupcontractList.push({contractId: contractId, groupId: item.groupId});
                    });
                });
                // get the  list of all properties for the known list of contracts and groups now
                console.info('... retrieving properties from %s groups', groupcontractList.length);
                return Promise.all(groupcontractList.map(v => {
                    return this._getPropertyList(v.contractId, v.groupId);
                }));
            })
            .then(propList => {
                let promiseList = [];

                propList.map(v => {
                    return v.properties.items.map(item => {

                        //TODO: should use toJSON() instead of the primative toString()
                        item.toString = function() {return this.propertyName;};
                        this._propertyByName[item.propertyName] = item;
                        this._propertyById[item.propertyId] = item;
                        if (item.productionVersion != null)
                            promiseList.push(this._getHostnameList(item.propertyId, item.productionVersion));
                        if (item.productionVersion && item.productionVersion != item.stagingVersion)
                            promiseList.push(this._getHostnameList(item.propertyId, item.stagingVersion));
                        if (item.productionVersion == null)
                            promiseList.push(this._getHostnameList(item.propertyId, item.latestVersion))
                    });
                });

                console.info('... retrieving Hosts from %s properties', Object.keys(this._propertyById).length);
                return Promise.all(promiseList);
            })
            .then(hostListList => {
                hostListList.map(hostList => {
                    let prop = this._propertyById[hostList.propertyId];
                    let version = hostList.propertyVersion;
                    if (!this._propertyHostnameList[hostList.propertyId]) {
                        this._propertyHostnameList[hostList.propertyId] = {}
                    }
                    this._propertyHostnameList[hostList.propertyId][version] = hostList;

                    if (prop.stagingVersion && prop.stagingVersion === hostList.propertyVersion)
                        prop.stagingHosts = hostList.hostnames.items;
                    if (prop.productionVersion && prop.productionVersion === hostList.propertyVersion)
                        prop.productionHosts = hostList.hostnames.items;
                    hostList.hostnames.items.map(host => {
                        let hostRef = this._propertyByHost[host.cnameFrom];
                        if (!hostRef)
                            hostRef = this._propertyByHost[host.cnameFrom] = {};

                        if (prop.stagingVersion && prop.stagingVersion === hostList.propertyVersion)
                            hostRef.staging = prop;
                        if (prop.productionVersion && prop.productionVersion === hostList.propertyVersion)
                            hostRef.production = prop;
                    })
                });
                console.timeEnd('Init PropertyManager cache');
                return new Promise((resolve, reject) => {
                    fs.writeFile("hostlist.json", JSON.stringify(this._propertyHostnameList,null,' '), (err) => {
                        if (err)
                            reject(err);
                        else
                            resolve(true);
                    });
                });
            });
    };

    _getProperty(propertyLookup, hostnameEnvironment = LATEST_VERSION.STAGING) {
        if (propertyLookup && propertyLookup.groupId && propertyLookup.propertyId && propertyLookup.contractId)
            return Promise.resolve(propertyLookup);
        return this._init()
            .then(() => {
                let prop = this._propertyById[propertyLookup] || this._propertyByName[propertyLookup];
                if (!prop) {
                    let host = this._propertyByHost[propertyLookup];
                    if (host)
                        prop = hostnameEnvironment === LATEST_VERSION.STAGING ? host.staging : host.production;
                }

                if (!prop)
                    return Promise.reject(Error(`Cannot find property: ${propertyLookup}`));
                return Promise.resolve(prop);
            });
    };

     _getGroupList(config) {

        return new Promise((resolve, reject) => {
            console.info('... retrieving list of Group Ids');

            let request = {
                method: 'GET',
                path: '/papi/v0/groups',
                followRedirect: false,
                followAllRedirects: false
            };
            this._edge.auth(request);

            this._edge.send(function(data, response) {
                if (response.statusCode >= 200 && response.statusCode  < 400) {
                    let parsed = JSON.parse(response.body);
                    resolve(parsed);
                }
                else {
                    reject(response);
                }
            });
        });
    };


    _getMainProduct(config) {
        if (config.productId) {
            return Promise.resolve(config);
        }

        return new Promise((resolve, reject) => {
            console.info('... retrieving list of Products for this contract');

            let request = {
                method: 'GET',
                path: `/papi/v0/products?contractId=${config.contractId}&groupId=${config.groupId}`,
                followRedirect: false,
                followAllRedirects: false
            };
            this._edge.auth(request);

            this._edge.send(function(data, response) {
                if (response.statusCode >= 200 && response.statusCode  < 400) {
                    let parsed = JSON.parse(response.body);
                    parsed.products.items.map(item => {
                        if (item.productId == "prd_SPM") {
                            config.productId = "prd_SPM";
                            config.productName = "SPM";
                            resolve(config);
                        }
                    });
                } else {
                    reject(response);
                }
                resolve();
            });
        });
    };

    _getPropertyList(contractId, groupId) {
        return new Promise((resolve, reject) => {
            //console.info('... retrieving list of properties {%s : %s}', contractId, groupId);

            let request = {
                method: 'GET',
                path:  `/papi/v0/properties?contractId=${contractId}&groupId=${groupId}`,
            };
            this._edge.auth(request);

            this._edge.send(function(data, response) {
                if (response.statusCode >= 200 && response.statusCode  < 400) {
                    let parsed = JSON.parse(response.body);
                    resolve(parsed);
                }
                else {
                    reject(response);
                }
            });
        });
    };

    //TODO: this will only be called for LATEST, CURRENT_PROD and CURRENT_STAGE. How do we handle collecting hostnames fo different versions?
    _getHostnameList(propertyId, version) {
        return this._getProperty(propertyId)
            .then(property => {
                //set basic data like contract & group
                const contractId = property.contractId;
                const groupId = property.groupId;
                const propertyId = property.propertyId;

                return new Promise((resolve, reject) => {
                    //console.info('... retrieving list of hostnames {%s : %s : %s}', contractId, groupId, propertyId);
                    if (version == null) {
                        version = 1;
                    }
                    if (this._propertyHostnameList && 
                        this._propertyHostnameList[propertyId] && 
                        this._propertyHostnameList[propertyId][version]) {
                        resolve(this._propertyHostnameList[propertyId][version]);
                    } else {

                        let request = {
                            method: 'GET',
                            path: `/papi/v0/properties/${propertyId}/versions/${version}/hostnames?contractId=${contractId}&groupId=${groupId}`,
                            followRedirect: false
                        };
                        this._edge.auth(request);

                        this._edge.send(function(data, response) {
                            if (response && response.statusCode >= 200 && response.statusCode  < 400) {
                                let parsed = JSON.parse(response.body);
                                resolve(parsed);
                            }
                            else {
                                console.log(response);
                                reject(response);
                            }
                        })}
                    });
                });
            };
    

    _getCloneConfig(config) {
        config.cloneFrom = {};
        return this._getProperty(config.srcProperty)
            .then(property => {
                config.cloneFrom.propertyId = property.propertyId;
                return WebSite._getLatestVersion(property)
            })
            .then(version => {
                config.cloneFrom.version = version;
                return new Promise((resolve, reject) => {
                    //console.info('... retrieving list of hostnames {%s : %s : %s}', contractId, groupId, propertyId);
                    
                    let request = {
                        method: 'GET',
                        path: `/papi/v0/properties/${config.cloneFrom.propertyId}/versions/${config.cloneFrom.version}?contractId=${config.contractId}&groupId=${config.groupId}`,
                        followRedirect: false
                    };
                    this._edge.auth(request);

                    this._edge.send(function(data, response) {
                        if (response.statusCode >= 200 && response.statusCode  < 400) {
                            let parsed = JSON.parse(response.body);
                            config.cloneFrom.cloneFromVersionEtag = parsed.versions.items[0]["etag"];
                            console.log(config);
                            resolve(config);
                        }
                        else {
                            reject(response);
                        }
                    });
                });
            });
    };

    static _getLatestVersion(property, env = LATEST_VERSION) {
        if (env === LATEST_VERSION.PRODUCTION)
            return property.productionVersion;
        else if (env === LATEST_VERSION.STAGING)
            return property.stagingVersion;
        else
            return property.latestVersion;
    };

    _copyPropertyVersion(propertyLookup, versionId) {
        return this._getProperty(propertyLookup)
            .then((data) => {
                const contractId = data.contractId;
                const groupId = data.groupId;
                const propertyId = data.propertyId;
                return new Promise((resolve, reject) => {
                    console.time('... copy');
                    console.info(`... copy property (${propertyLookup}) v${versionId}`);
                    let body = {};
                    body.createFromVersion = versionId;

                    let request = {
                        method: 'POST',
                        path: `/papi/v0/properties/${propertyId}/versions?contractId=${contractId}&groupId=${groupId}`,
                        body: body
                    };

                    this._edge.auth(request);

                    this._edge.send(function (data, response) {
                        console.timeEnd('... copy');
                        if (/application\/json/.test(response.headers['content-type'])) {
                            let parsed = JSON.parse(response.body);
                            let matches = !parsed.versionLink ? null : parsed.versionLink.match('versions/(\\d+)?');
                            if (!matches) {
                                reject(Error('cannot find version'));
                            } else {
                                resolve(matches[1]);
                            }
                        }
                        else if (response.statusCode === 404) {
                            resolve({});
                        }
                        else {
                            reject(response);
                        }
                    });
                });
            });
    };

    _getPropertyRules(propertyLookup, version) {
        return this._getProperty(propertyLookup)
            .then((data) => {
                //set basic data like contract & group
                const contractId = data.contractId;
                const groupId = data.groupId;
                const propertyId = data.propertyId;
                return new Promise((resolve, reject) => {
                    console.time('... retrieving');
                    console.info(`... retrieving property (${propertyLookup}) v${version}`);
                    let request = {
                        method: 'GET',
                        path: `/papi/v0/properties/${propertyId}/versions/${version}/rules?contractId=${contractId}&groupId=${groupId}`,
                    };

                    this._edge.auth(request);

                    this._edge.send((data, response) => {
                        console.timeEnd('... retrieving');
                        if (response.statusCode >= 200 && response.statusCode < 400) {
                            let parsed = JSON.parse(response.body);
                            resolve(parsed);
                        } 
                        else {
                            reject(response);
                        }
                    });
                });
            });
    };

    _updatePropertyRules(propertyLookup, version, rules) {
        return this._getProperty(propertyLookup)
            .then((data) => {
                //set basic data like contract & group
                const contractId = data.contractId;
                const groupId = data.groupId;
                const propertyId = data.propertyId;
                return new Promise((resolve, reject) => {
                    console.time('... updating');
                    console.info(`... updating property (${propertyLookup}) v${version}`);

                    let request = {
                        method: 'PUT',
                        path: `/papi/v0/properties/${propertyId}/versions/${version}/rules?contractId=${contractId}&groupId=${groupId}`,
                        body: rules
                    };

                    this._edge.auth(request);

                    this._edge.send(function (data, response) {
                        console.timeEnd('... updating');
                        if (response.statusCode >= 200 && response.statusCode < 400) {
                            let newRules = JSON.parse(response.body);
                            resolve(newRules);
                        }
                        else {
                            reject(response);
                        }
                    });
                });
            });
    };

    /**
     * Internal function to activate a property
     *
     * @param propertyId
     * @param versionId
     * @param env
     * @param notes
     * @param email
     * @param acknowledgeWarnings
     * @param autoAcceptWarnings
     * @returns {Promise.<TResult>}
     * @private
     */
    _activateProperty(propertyLookup, versionId, env = LATEST_VERSION.STAGING, notes = '', email=['test@example.com'], acknowledgeWarnings=[], autoAcceptWarnings=true) {
        return this._getProperty(propertyLookup)
            .then((data) => {
                //set basic data like contract & group
                const contractId = data.contractId;
                const groupId = data.groupId;
                const propertyId = data.propertyId;
                return new Promise((resolve, reject) => {
                    console.time('... activating');
                    console.info(`... activating property (${propertyLookup}) v${versionId}`);

                    let activationData = {
                        propertyVersion: versionId,
                        network: env,
                        note: notes,
                        notifyEmails: email,
                        acknowledgeWarnings: acknowledgeWarnings,
                        complianceRecord: {
                            noncomplianceReason: 'NO_PRODUCTION_TRAFFIC'
                        }
                    };
                    let request = {
                        method: 'POST',
                        path: `/papi/v0/properties/${propertyId}/activations?contractId=${contractId}&groupId=${groupId}`,
                        body: activationData
                    };

                    this._edge.auth(request);

                    this._edge.send(function (data, response) {
                        if (response.statusCode >= 200 && response.statusCode <= 400) {
                            let parsed = JSON.parse(response.body);
                            resolve(parsed);
                        }
                        else {
                            reject(response.body);
                        }
                    });
                });
            })
            .then(body => {
                console.timeEnd('... activating');
                if (body.type && body.type.includes('warnings-not-acknowledged')) {
                    let messages = [];
                    console.info('... automatically acknowledging %s warnings!', body.warnings.length);
                    body.warnings.map(warning => {
                        console.info('Warnings: %s', warning.detail);
                        //TODO report these warnings?
                        //console.trace(body.warnings[i]);
                        messages.push(warning.messageId);
                    });
                    //TODO: check that this doesn't happen more than once...
                    return this._activateProperty(propertyLookup, versionId, env, notes, email, messages);
                }
                else
                    //TODO what about errors?
                    return new Promise((resolve, reject) => {
                        //TODO: chaise redirect?
                        console.time('Activation Time');
                        let matches = !body.activationLink ? null : body.activationLink.match('activations/([a-z0-9_]+)\\b');

                        if (!matches) {
                            reject(body);
                        }
                        else {
                            resolve(matches[1])
                        }
                    });
            });
    };

    //POST /platformtoolkit/service/properties/deActivate.json?accountId=B-C-1FRYVMN&aid=10357352&gid=64867&v=12
    //{"complianceRecord":{'unitTested":false,"peerReviewedBy":"","customerEmail":"","nonComplianceReason":"NO_PRODUCTION","otherNoncomplianceReason":"","siebelCase":""},"emailList":"colinb@akamai.com","network":"PRODUCTION","notes":"","notificationType":"FINISHED","signedOffWarnings":[]}

    _deactivateProperty(propertyLookup, versionId, env = LATEST_VERSION.STAGING, notes = '', email=['test@example.com']) {
            return this._getProperty(propertyLookup)
                .then((data) => {
                    //set basic data like contract & group
                    const contractId = data.contractId;
                    const groupId = data.groupId;
                    const propertyId = data.propertyId;
                    return new Promise((resolve, reject) => {
                        console.time('... deactivating');
                        console.info(`... deactivating property (${propertyLookup}) v${versionId}`);

                        let activationData = {
                            propertyVersion: versionId,
                            network: env,
                            notifyEmails: email,
                            activationType: "DEACTIVATE",
                            complianceRecord: {
                                noncomplianceReason: 'NO_PRODUCTION_TRAFFIC'
                            }

                        };
                        let request = {
                            method: 'POST',
                            path: `/papi/v0/properties/${propertyId}/activations?contractId=${contractId}&groupId=${groupId}`,
                            body: activationData
                        };

                        this._edge.auth(request);

                        this._edge.send(function (data, response) {
                            console.info(response.statusCode);
                            console.info(response.body);
                            if (response.statusCode >= 200 && response.statusCode <= 400) {
                                let parsed = JSON.parse(response.body);
                                let matches = !parsed.activationLink ? null : parsed.activationLink.match('activations/([a-z0-9_]+)\\b');

                                if (!matches) {
                                    reject(parsed);
                                }
                                else {
                                    resolve(matches[1])
                                }
                            }
                            else {
                                reject(response.body);
                            }
                        });
                    });
                })
    }
    _pollActivation(propertyLookup, activationID) {
        return this._getProperty(propertyLookup)
            .then(data => {
                //set basic data like contract & group
                const contractId = data.contractId;
                const groupId = data.groupId;
                const propertyId = data.propertyId;
                return new Promise((resolve, reject) => {
//                    console.info('... polling property {%s : %s}', propertyId, activationID);

                    let request = {
                        method: 'GET',
                        path: `/papi/v0/properties/${propertyId}/activations/${activationID}?contractId=${contractId}&groupId=${groupId}`,
                    };

                    this._edge.auth(request);

                    this._edge.send(function (data, response) {
                        if (response.statusCode === 200 && /application\/json/.test(response.headers['content-type'])) {
                            let parsed = JSON.parse(response.body);
                            resolve(parsed);
                        }
                        if (response.statusCode === 500) {
                            console.error('Activation caused a 500 response. Retrying...')
                            resolve({activations:{items:[{status:'PENDING'}]}});
                        }
                        else {
                            reject(response);
                        }
                    });
                })
            })
            .then(data => {
                let pending = false;
                let active = false;
                data.activations.items.map(status => {
                    pending = pending || 'PENDING' === status.status;
                    active = !pending && 'ACTIVE' === status.status;
                });
                if (pending) {
                    console.info('... waiting 30s');
                    return sleep(30000).then(() => {return this._pollActivation(propertyLookup, activationID);});
                }
                else {
                    console.timeEnd('Activation Time');
                    return active ? Promise.resolve(true) : Promise.reject(data);
                }

            });
    };

    /**
     * Lookup the PropertyId using the associated Host name. Provide the environment if the Hostname association is
     * moving between configurations.
     *
     * @param {string} hostname for example www.example.com
     * @param {string} env for the latest version lookup (PRODUCTION | STAGING | latest)
     * @returns {Promise} the {object} of Property as the {TResult}
     */
    lookupPropertyIdFromHost(hostname, env = LATEST_VERSION.PRODUCTION) {
        return this._getProperty(hostname, env);
    }


    /**
     * Retrieve the configuration rules for a given property. Use either Host or PropertyId to use as the lookup
     * for the rules
     *
     * @param {string} propertyLookup either colloquial host name (www.example.com) or canonical PropertyId (prp_123456).
     *     If the host name is moving between property configurations, use lookupPropertyIdFromHost()
     * @param {number} versionLookup specify the version or use LATEST_VERSION.PRODUCTION / STAGING / latest
     * @returns {Promise} with the property rules as the {TResult}
     */
    retrieve(propertyLookup, versionLookup = LATEST_VERSION.LATEST) {
        let propertyId;
        return this._getProperty(propertyLookup)
            .then(property => {
                let version = (versionLookup && versionLookup > 0) ? versionLookup : WebSite._getLatestVersion(property, versionLookup)
                console.info(`Retrieving ${property} v${version}`);
                return this._getPropertyRules(property.propertyId, version)
            });
    }

    /**
     * Create a new version of a property, copying the rules from a file stream. This allows storing the property configuration
     * in a version control system and then updating the Akamai system when it becomes live. Only the Object.rules from the file
     * will be used to update the property
     *
     * @param {string} propertyLookup either colloquial host name (www.example.com) or canonical PropertyId (prp_123456).
     *     If the host name is moving between property configurations, use lookupPropertyIdFromHost()
     * @param {number} versionLookup specify the version or use LATEST_VERSION.PRODUCTION / STAGING / latest
     * @param {string} toFile the filename to read a previously saved (and modified) form of the property configuration.
     *     Only the {Object}.rules will be copied
     * @returns {Promise} returns a promise with the updated form of the
     */
    retrieveToFile(propertyLookup, versionLookup = LATEST_VERSION.LATEST, toFile) {
        return this.retrieve(propertyLookup, versionLookup)
            .then(data => {
                console.info(`Writing ${propertyLookup} rules to ${toFile}`);
                if (toFile === '-') {
                    console.log(JSON.stringify(data));
                    return Promise.resolve(data);
                }
                else {
                    return new Promise((resolve, reject) => {
                        fs.writeFile(untildify(toFile), JSON.stringify(data), (err) => {
                            if (err)
                                reject(err);
                            else
                                resolve(data);
                        });
                    });
                }
            });
    }


    /**
     *
     * @param {string} propertyLookup either colloquial host name (www.example.com) or canonical PropertyId (prp_123456).
     *     If the host name is moving between property configurations, use lookupPropertyIdFromHost()
     * @param {Object} newRules of the configuration to be updated. Only the {object}.rules will be copied.
     * @returns {Promise} with the property rules as the {TResult}
     */
    update(propertyLookup, newRules) {
        let property = propertyLookup;
        return this._getProperty(propertyLookup)
            .then(localProp => {
                property = localProp;
                console.info(`Updating ${property}`);
                const version = WebSite._getLatestVersion(property);
                return this._copyPropertyVersion(property, version);
            })
            .then(newVersionId => {
		property.latestVersion = newVersionId;
		return this.retrieve(property, newVersionId);
	    })
            .then(oldRules => {
                let updatedRules = newRules;
                // fallback in case the object is just the rules and not the full proeprty manager response
                updatedRules.rules = newRules.rules ? newRules.rules : newRules;
                return this._updatePropertyRules(property, oldRules.propertyVersion, updatedRules);
            });
    }

    /**
     * Create a new version of a property, copying the rules from a file stream. This allows storing the property configuration
     * in a version control system and then updating the Akamai system when it becomes live. Only the Object.rules from the file
     * will be used to update the property
     *
     * @param {string} propertyLookup either colloquial host name (www.example.com) or canonical PropertyId (prp_123456).
     *     If the host name is moving between property configurations, use lookupPropertyIdFromHost()
     * @param {string} fromFile the filename to read a previously saved (and modified) form of the property configuration.
     *     Only the {Object}.rules will be copied
     * @returns {Promise} returns a promise with the updated form of the
     */
    updateFromFile(propertyLookup, fromFile) {
        return new Promise((resolve, reject) => {
                console.info(`Reading ${propertyLookup} rules from ${fromFile}`);
                fs.readFile(untildify(fromFile), (err, data) => {
                    if (err)
                        reject(err);
                    else
                        resolve(JSON.parse(data));
                });
            })
            .then(rules => {return this.update(propertyLookup, rules)});
    }

    /**
     * Create a new property
     *
     * @param {object} config
     * File should contain a layout similar to the following:
     * {
     *   "productId": "prd_Alta",
     *   "propertyName": "my.new.property.com",
     *   "cloneFrom": {  <<<<==== optional section, only needed for cloning
     *     "propertyId": "prp_175780",
     *     "version": 2,
     *     "cloneFromVersionEtag": "a9dfe78cf93090516bde891d009eaf57",
     *     "copyHostnames": true
     *   }
     *
     *
     */
    //TODO: remove config dependencies
    //TODO: expose two constructors: `create(hostnames[], configName=null, contract=null)` and `create(srcProperty, srcVersion, cloneHostname=false, configName=null, contract=null)`
    createProperty(config) {
        return this.create(config);
    }

    //TODO: remove config dependencies
    setConfig(configFile) {
        let config = {};
        return new Promise((resolve, reject) => {
            fs.stat(untildify(configFile), function(err, stat) {
                if (err==null) {
                    fs.readFile(untildify(configFile), (err, data) => {
                    if (err)
                        reject(err);
                    else
                        resolve(JSON.parse(data));
                    });
                } else if (err.code == "ENOENT") {
                     resolve(config);
                }
            })
        })
    }

    /**
     * Create a new version of a property, copying the rules from another seperate property configuration. The common use
     * case is to migrate the rules from a QA setup to the WWW setup. If the version is not provided, the LATEST version
     * will be assumed.
     *
     * @param {string} fromProperty either colloquial host name (www.example.com) or canonical PropertyId (prp_123456).
     *     If the host name is moving between property configurations, use lookupPropertyIdFromHost()
     * @param {number} fromVersion optional version number. Will assume LATEST_VERSION.LATEST if none are specified
     * @param {string} toProperty either colloquial host name (www.example.com) or canonical PropertyId (prp_123456)
     * @returns {Promise} returns a promise with the TResult of boolean
     */
    copy(fromProperty, fromVersion = LATEST_VERSION.LATEST, toProperty) {
        return this.retrieve(fromProperty, fromVersion)
            .then(fromRules => {
                console.info(`Copy ${fromProperty} v${fromRules.propertyVersion} to ${toProperty}`);
                return this.update(toProperty, fromRules)
            });
    }

    /**
     * Convenience method to promote the STAGING version of a property to PRODUCTION
     *
     * @param {string} propertyLookup either colloquial host name (www.example.com) or canonical PropertyId (prp_123456).
     *     If the host name is moving between property configurations, use lookupPropertyIdFromHost()
     * @param {string} notes describe the reason for activation
     * @param {string[]} email notivation email addresses
     * @returns {Promise} returns a promise with the TResult of boolean
     */
    promoteStagingToProd(propertyLookup, notes='', email=['test@example.com']) {
        let propertyId = propertyLookup;
        let stagingVersion;
        //todo: make sure email is an array
        return this._getProperty(propertyLookup)
            .then(property => {
                if (!property.stagingVersion)
                    new Promise(resolve => reject(`No version in Staging for ${propertyLookup}`));
                else if (property.productionVersion !== property.stagingVersion)
                    return this.activate(propertyLookup, stagingVersion, AKAMAI_ENV.PRODUCTION, notes, email);
                else
                    new Promise(resolve => resolve(true));
            });
    }

    /**
     * Activate a property to either STAGING or PRODUCTION. This function will poll (30s) incr. until the property has
     * successfully been promoted.
     *
     * @param {string} propertyLookup either colloquial host name (www.example.com) or canonical PropertyId (prp_123456).
     *     If the host name is moving between property configurations, use lookupPropertyIdFromHost()
     * @param {number} version version to activate
     * @param {string} networkEnv Akamai environment to activate the property (either STAGING or PRODUCTION)
     * @param {string} notes describe the reason for activation
     * @param {string[]} email notivation email addresses
     * @param {boolean} wait whether the Promise should return after activation is completed across the Akamai
     *     platform (wait=true) or if it should return immediately after submitting the job (wait=false)
     * @returns {Promise} returns a promise with the TResult of boolean
     */
    activate(propertyLookup, version = LATEST_VERSION.LATEST, networkEnv = AKAMAI_ENV.STAGING, notes='', email=['test@example.com'], wait=true) {
        //todo: change the version lookup
        let emailNotification = email;
        if (!Array.isArray(emailNotification))
            emailNotification = [email];
        let activationVersion = version;
        let property = propertyLookup;

        return this._getProperty(propertyLookup)
            .then(data => {
                property = data;
                if (!version || version <= 0)
                    activationVersion = WebSite._getLatestVersion(property, version);

                console.info(`Activating ${propertyLookup} to ${networkEnv}`);
                return this._activateProperty(property, activationVersion, networkEnv, notes, emailNotification)
            })
            .then(activationId => {
                if (networkEnv === AKAMAI_ENV.STAGING)
                    property.stagingVersion = activationVersion;
                else
                    property.productionVersion = activationVersion;
                if (wait)
                    return this._pollActivation(propertyLookup, activationId);
                return Promise.resolve(activationId);
            })
    }

    /**
     * De-Activate a property to either STAGING or PRODUCTION. This function will poll (30s) incr. until the property has
     * successfully been promoted.
     *
     * @param {string} propertyLookup either colloquial host name (www.example.com) or canonical PropertyId (prp_123456).
     *     If the host name is moving between property configurations, use lookupPropertyIdFromHost()
     * @param {string} networkEnv Akamai environment to activate the property (either STAGING or PRODUCTION)
     * @param {string} notes describe the reason for activation
     * @param {Array} email notivation email addresses
     * @param {boolean} wait whether the Promise should return after activation is completed across the Akamai
     *     platform (wait=true) or if it should return immediately after submitting the job (wait=false)
     * @returns {Promise} returns a promise with the TResult of boolean
     */
    deactivate(propertyLookup, networkEnv = AKAMAI_ENV.STAGING, notes='', email=['test@example.com'], wait=true) {
        if (!Array.isArray(email))
            email = [email];

        let property = propertyLookup;
        return this._getProperty(propertyLookup)
            .then(data => {
                property = data;
                console.info(`Deactivating ${propertyLookup} to ${networkEnv}`);
                let deactivationVersion = WebSite._getLatestVersion(property, networkEnv == AKAMAI_ENV.STAGING ? LATEST_VERSION.STAGING : LATEST_VERSION.PRODUCTION);
                return this._deactivateProperty(property, deactivationVersion, networkEnv, notes, email)
            })
            .then(activationId => {
                if (networkEnv === AKAMAI_ENV.STAGING)
                    property.stagingVersion = null;
                else
                    property.productionVersion = null;
                if (wait)
                    return this._pollActivation(propertyLookup, activationId);
                return Promise.resolve(activationId);
            })
    }

    /**
     * TODO collapse deletePRoperty and property; property is a reserved word
     */
    deleteProperty(propertyLookup) {
        return this._getProperty(propertyLookup)
            .then(property => {
                console.info(`Deleting ${propertyLookup}`);
                return this.delete(property)
            })
    }

    // TODO: move to an internal (model) method and move above)
    delete(property) {
        return new Promise((resolve, reject) => {
            console.time('... deleting property');
            let request = {
                method: 'DELETE',
                path: `/papi/v0/properties/${property.propertyId}?contractId=${property.contractId}&groupId=${property.groupId}`
            }
            this._edge.auth(request);
            this._edge.send((data, response) => {
                console.timeEnd('... deleting property');
                if (response.statusCode >= 200 && response.statusCode < 400) {        
                    let parsed = JSON.parse(response.body);
                    console.log(parsed);
                    resolve(parsed);
                } else {
                    reject(parsed);
                }
            })
        })
    }

    // TODO: move to model (internal) method and move above
    // TODO: use crud naming. rename getNew to _create
    _getNewCPCode(config) {
        return new Promise((resolve, reject) => {
            console.info('Creating new CPCode for property');
            console.time('... creating new CPCode');
            let cpCode = {
                 "productId": config.productId,
                 "cpcodeName": config.propertyName
            }
            let request = {
                method: 'POST',
                path: `/papi/v0/cpcodes?contractId=${config.contractId}&groupId=${config.groupId}`,
                body: cpCode
            };

            this._edge.auth(request);

            this._edge.send((data, response) => {
                console.timeEnd('... creating new CPCode');
                if (response.statusCode >= 200 && response.statusCode < 400) {        
                    let parsed = JSON.parse(response.body);
                    config.cpcode = parsed["cpcodeLink"].split('?')[0].split("/")[4].split('_')[1];
                    resolve(config);
                } else {
                    reject(response);
                }
            });
        });
    }

    //TODO: move above, rename to _retrieve
    //TODO: expose an public creatCPCode method
    _populateCPCode(config) {
        return new Promise((resolve, reject) => {
            let cpcode = config.cpcode;
            console.info('Retrieving information for cpcode:'+ config.cpcode);
            console.time('... retrieving CPCode info');
            let request = {
                method: 'GET',
                path: `/papi/v0/cpcodes/cpc_${cpcode}?contractId=${config.contractId}&groupId=${config.groupId}`,
            };

            this._edge.auth(request);

            this._edge.send((data, response) => {
                console.timeEnd('... retrieving CPCode info');
                if (response.statusCode >= 200 && response.statusCode < 400) {                        
                    let parsed = JSON.parse(response.body);
                    let cpCodeInfo = parsed.cpcodes.items[0];
                    let datestring = cpCodeInfo.createdDate;
                    config.cpcode = {
                        "id": cpcode,
                        "description":cpCodeInfo.cpcodeName,
                        "name":cpCodeInfo.cpcodeName,
                        "products":[config.productName],
                        "createdDate":datestring
                    };
                    resolve(config);
                } else {
                    reject(config);
                }
            })
        });
    }

    _assignHostname(property) {
        return new Promise((resolve, reject) => {
            console.info('Assigning hostname to property');
            console.time('... assigning hostname');

            let assignHostnameObj =  [{
                "cnameType": "EDGE_HOSTNAME",
                "edgeHostnameId": property.edgeHostnameId,
                "cnameFrom": property.propertyName
            }]

            let request = {
                method: 'PUT',
                path: `/papi/v0/properties/${property.propertyId}/versions/1/hostnames?contractId=${property.contractId}&groupId=${property.groupId}`,
                body: assignHostnameObj
             }

            this._edge.auth(request);
            this._edge.send((data, response) => {
                console.timeEnd('... assigning hostname');
                if (response.statusCode >= 200 && response.statusCode < 400) {
                    response = JSON.parse(response.body);
                    resolve(response);
                } else {
                    reject(response);
                }
 
            })
        })
    }

    //TODO: how is this different than above?
    //TODO: move
    _getEdgeHostnames(property) {
        return new Promise((resolve, reject) => {
            console.info('Checking for existing edge hostname');
            console.time('... checking edge hostnames');
            let request = {
                method: 'GET',
                path: `/papi/v0/edgehostnames?contractId=${property.contractId}&groupId=${property.groupId}`
            }

            this._edge.auth(request);
            this._edge.send((data, response) => {
                console.timeEnd('... checking edge hostnames');
                if (response.statusCode >= 200 && response.statusCode < 400) {
                    response = JSON.parse(response.body);
                    resolve(response);
                } else {
                    reject(response);
                }
 
            })
        })
    }

    //TODO: should only return one edgesuite host name, even if multiple are called - should lookup to see if there is alrady an existing association
    //TODO: should use the internal cache for the hostnames
    //TODO: move
    _createHostname(property) {
        return this._getEdgeHostnames(property)
            .then( edgeHostnames => {
                edgeHostnames.edgeHostnames.items.map(item => {
                    if (item["domainPrefix"] === property.propertyName) {
                        console.info("Hostname already exists");
                        property.edgeHostnameId = item["edgeHostnameId"];
                    }
                });
                return Promise.resolve(property);
            })
            .then(property => {
                if (property.edgeHostnameId) {
                    return Promise.resolve(property);
                } else {
                    console.info('Creating edge hostname for property:'+ property.propertyId);
                    console.time('... creating hostname');
                    let hostnameObj = {
                        "productId": property.productId,
                            "domainPrefix": property.propertyName,
                            "domainSuffix": "edgesuite.net",
                            "secure": false,
                            "ipVersionBehavior": "IPV4",
                    };

                    let request = {
                        method: 'POST',
                        path: `/papi/v0/edgehostnames?contractId=${property.contractId}&groupId=${property.groupId}`,
                        body: hostnameObj
                    };

                    this._edge.auth(request);

                    this._edge.send((data, response) => {
                        console.timeEnd('... creating hostname');
                        if (response.statusCode >= 200 && response.statusCode < 400) {
                            //TODO: make response more robust
                            let hostnameResponse = JSON.parse(response.body);
                            response = hostnameResponse["edgeHostnameLink"].split('?')[0].split("/")[4];

                            return Promise.resolve(response);
                        } else {
                            console.log(response.body);
                            return Promise.reject(response);
                        }
                    })
                }
            })
    }

    /**
     * Create a new website configuration on Akamai with a hostname and a base set of rules
     *
     * @param {string} hostname either colloquial host name (www.example.com) or canonical PropertyId (prp_123456).
     *     If the host name is moving between property configurations, use lookupPropertyIdFromHost()
     * @param {Object} newRules of the configuration to be updated. Only the {object}.rules will be copied.
     * @returns {Promise} with the property rules as the {TResult}
     */
    //TODO: remove the config usage
    //TODO: exception should be thrown if more than one ctract exists and null passed
    //TODO: refactor to separate controller and model
    //TODO: move and convert to internal
    create(config) {
	    let property = new WebSite({path:"~/.edgerc", section: "papi"});
        let contractId, groupId;
        
        return property._getGroupList(config)
           .then(data => {
               if (config.contractId && config.groupId) {
                   Promise.resolve(config);
               }
               return new Promise((resolve, reject) => {
                  data.groups.items.map(item => {
                    let queryObj = {};
                    item.contractIds.map(contract => {
                        if (!item.parentGroupId) {
                            config.contractId = contract;
                            config.groupId = item.groupId;
                            resolve (config);
                    }
               })
              });
           })
        }).then(config => {
            return this._getMainProduct(config);
        }).then(config => {
            if (config.srcProperty) {
                return this._getCloneConfig(config);
            } else {
                return Promise.resolve(config);
            }
        }).then(config => {
            return new Promise((resolve, reject) => {
                contractId = config.contractId;
                groupId = config.groupId;
                console.time('... creating');
                console.info(`... creating property ${config.propertyName}`);

                let request = {
                    method: 'POST',
                    path: `/papi/v0/properties/?contractId=${contractId}&groupId=${groupId}`,
                    body: config
                };

                this._edge.auth(request);

                this._edge.send(function (data, response) {
                    console.timeEnd('... creating');
                    if (response.statusCode >= 200 && response.statusCode < 400) {
                        let propertyResponse = JSON.parse(response.body);
                        response = propertyResponse["propertyLink"].split('?')[0].split("/")[4];
                        config.propertyId = response;
                        resolve(config);
                    }
                    else {
                        console.log(response);
                        reject(response);
                    }
                });
            })
        })
        .then(config => {
            config.cpcode = 548751;
            if (config.cpcode) {
                return Promise.resolve(config);
            } else {
                return this._getNewCPCode(config);
            }
        }).then(config => {
            return this._populateCPCode(config);
        })
        .then(config => {
            // If we're not cloning we need to grab the rules
            if (!config.srcProperty) {
                console.info(`... retrieving rules for ${config.propertyName}`);
                return this.retrieve(config.propertyName)
            } else {
                return Promise.resolve();
            }
        })
        .then(property => {
            // If we're cloning we can just skip this step
            if (!property) return Promise.resolve();
            let behaviors = [];
            let children_behaviors = [];

            property.accountId = this._accountId;
            property.contractId = config.contractId;
            property.groupId = config.groupId;
            property.propertyId = config.propertyId;
            property.propertyName = config.propertyName;
            property.rules.behaviors.map(behavior => {
                if (behavior.name == "origin") {
                    behavior.options.hostname = "origin-" + property.propertyName
                }
                if (behavior.name == "cpCode") {
                    behavior.options.cpcode = config.cpcode;
                    delete config.cpcode;
                }
                behaviors.push(behavior);
            })
            property.rules.behaviors = behaviors;

            property.rules.children.map(child => {
                child.behaviors.map(behavior => {
                    if (behavior.name == "sureRoute") {
                        behavior.options.sr_stat_key_mode = "default";
                        behavior.options.sr_test_object_url = "/akamai/sureroute-testobject.html"
                    }
                    children_behaviors.push(behavior);
                })
            })
            property.rules.children.behaviors = children_behaviors;

            delete property.errors;
            return this._updatePropertyRules(property, 1, property);
        })
        .then(property => {
            property.productId = config.productId;
            return property;
        })
        .then(property => {
            return this._createHostname(property);
        })
        .then(property => {
            return this._assignHostname(property);
        })
    }
}
WebSite.AKAMAI_ENV = Object.freeze(AKAMAI_ENV);
WebSite.LATEST_VERSION = Object.freeze(LATEST_VERSION);

module.exports = WebSite;
