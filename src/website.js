'use strict';

let Luna = require('./luna');
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

//export default class WebSite {
class WebSite {

    constructor(config = {path:"~/.edgerc", lunasection: "luna", section: "default"}) {
        if (config.clientToken && config.clientSecret && config.accessToken && config.host)
            this._edge = new EdgeGrid(config.clientToken. config.clientSecret, config.accessToken, config.host);
        else
            this._edge = new EdgeGrid({path: untildify(config.path), section: config.section});
        this._propertyById = {};
        this._propertyByName = {};
        this._propertyByHost = {};
        this._initComplete = false;
    }

    static sleep (time) {
        return new Promise((resolve) => setTimeout(resolve, time));
    }

    init() {
        if (this._initComplete)
            return new Promise(resolve => resolve());
        if (Object.keys(this._propertyById).length > 0) {
            this._initComplete = true;
            return new Promise(resolve => resolve());
        }

        let groupcontractList = [];
        console.time('Init PropertyManager cache');
        console.info('Init PropertyManager cache (hostnames and property list)');
        return this._getGroupList()
            .then(data => {
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
                        item.toString = function() {return this.propertyName;};
                        this._propertyByName[item.propertyName] = item;
                        this._propertyById[item.propertyId] = item;
                        if (item.productionVersion)
                            promiseList.push(this._getHostnameList(item.propertyId, item.productionVersion));
                        if (item.productionVersion && item.productVersion != item.stagingVersion)
                            promiseList.push(this._getHostnameList(item.propertyId, item.stagingVersion));
                    });
                });

                console.info('... retrieving Hosts from %s properties', Object.keys(this._propertyById).length);
                return Promise.all(promiseList);
            })
            .then(hostListList => {
                hostListList.map(hostList => {
                    let prop = this._propertyById[hostList.propertyId];
                    if (prop.stagingVersion && prop.stagingVersion === hostList.propertyVersion)
                        prop.stagingHosts = hostList.hostnames.items;
                    if (prop.productionVersion && prop.productionVersion === hostList.propertyVersion)
                        prop.productionHosts = hostList.hostnames.items;

                    hostList.hostnames.items.map(host => {
                        let hostRef = this._propertyByHost[host];
                        if (!hostRef)
                            hostRef = this._propertyByHost[host] = {};

                        if (prop.stagingVersion && prop.stagingVersion === hostList.propertyVersion)
                            hostRef.staging = prop;
                        if (prop.productionVersion && prop.productionVersion === hostList.propertyVersion)
                            hostRef.production = prop;
                    })
                });
                console.timeEnd('Init PropertyManager cache');
                return new Promise(resolve => resolve(true));
            });
    };

    //TODO: ugh, I hate this tupil property overload. should rewrite.
    //TODO: refactor as a Proxy class
    _getProperty(propertyLookup, hostnameEnvironment = LATEST_VERSION.STAGING) {
        if (propertyLookup && propertyLookup.groupId && propertyLookup.propertyId && propertyLookup.contractId)
            return new Promise(resolve => resolve(propertyLookup));
        return this.init()
            .then(() => {
                return new Promise((resolve, reject) => {
                    let prop = this._propertyById[propertyLookup] || this._propertyByName[propertyLookup];
                    if (!prop) {
                        let host = this._propertyByHost[propertyLookup];
                        if (host)
                            prop = hostnameEnvironment === LATEST_VERSION.STAGING ? host.staging : host.production;
                    }

                    if (!prop)
                        reject(Error(`Cannot find property: ${propertyLookup}`));
                    else
                        resolve(prop);
                });
            });
    };

    _getGroupList() {
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

    _getHostnameList(propertyId, version) {
        return this._getProperty(propertyId)
            .then(property => {
                //set basic data like contract & group
                const contractId = property.contractId;
                const groupId = property.groupId;
                const propertyId = property.propertyId;

                return new Promise((resolve, reject) => {
                    //console.info('... retrieving list of hostnames {%s : %s : %s}', contractId, groupId, propertyId);

                    let request = {
                        method: 'GET',
                        path: `/papi/v0/properties/${propertyId}/versions/${version}/hostnames?contractId=${contractId}&groupId=${groupId}`,
                        followRedirect: false
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
            });
    };

    static _getLatestVersion(property, env = LATEST_VERSION) {
//        let property = this._getPropertyIdTupil(propertyId);
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
                        let parsed = JSON.parse(response.body);
                        resolve(parsed);
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
                        console.time('... activating');
                        console.info(`... activating property (${propertyLookup}) v${versionId}`);

                        let activationData = {
                            propertyVersion: versionId,
                            network: env,
                            notifyEmails: email,
                            activationType: "DEACTIVATE",
                            complianceRecord: {
                                noncomplianceReason: 'NO_PRODUCTION_TRAFFIC'
                            }

                        };
                        console.info(activationData);
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
                let active = true;
                data.activations.items.map(status => {
                    pending = pending || 'PENDING' === status.status;
                    active = !pending && active && 'ACTIVE' === status.status;
                });
                if (pending) {
                    console.info('... waiting 30s');
                    return WebSite.sleep(30000).then(() => {return this._pollActivation(propertyLookup, activationID);});
                }
                else {
                    console.timeEnd('Activation Time');
                    return new Promise((resolve, reject) => {if (active) resolve(true); else reject(data);});
                }

            });
    };

    /**
     * Lookup the PropertyId using the associated Host name. Provide the environment if the Hostname association is
     * moving between configurations.
     *
     * @param hostname {string} for example www.example.com
     * @param env for the latest version lookup (PRODUCTION | STAGING | latest)
     * @returns {string} the PropertyId
     */
    lookupPropertyIdFromHost(hostname, env = LATEST_VERSION.PRODUCTION) {
        return this._getProperty(property, env).propertyId;
    }


    /**
     * @param hostOrPropertyId {string} either colloquial host name (www.example.com) or canonical PropertyId (prp_123456).
     *     If the host name is moving between property configurations, use lookupPropertyIdFromHost()
     * @param newRules {Object} of the configuration to be updated. Only the {object}.rules will be copied.
     * @returns {Promise} with the property rules as the {TResult}
     */
    create(hostOrPropertyId, newRules) {
        //TODO:
    }

    /**
     * Retrieve the configuration rules for a given property. Use either Host or PropertyId to use as the lookup
     * for the rules
     *
     * @param propertyLookup {string} either colloquial host name (www.example.com) or canonical PropertyId (prp_123456).
     *     If the host name is moving between property configurations, use lookupPropertyIdFromHost()
     * @param versionLookup {number} specify the version or use LATEST_VERSION.PRODUCTION / STAGING / latest
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
     *
     * @param propertyLookup {string} either colloquial host name (www.example.com) or canonical PropertyId (prp_123456).
     *     If the host name is moving between property configurations, use lookupPropertyIdFromHost()
     * @param newRules {Object} of the configuration to be updated. Only the {object}.rules will be copied.
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
            .then(newVersionId => {return this.retrieve(property, newVersionId);})
            .then(oldRules => {
                let updatedRules = newRules;
                updatedRules.rules = newRules.rules;
                return this._updatePropertyRules(property, oldRules.propertyVersion, updatedRules);
            });
    }

    /**
     * Create a new version of a property, copying the rules from a file stream. This allows storing the property configuration
     * in a version control system and then updating the Akamai system when it becomes live. Only the Object.rules from the file
     * will be used to update the property
     *
     * @param propertyLookup {string} either colloquial host name (www.example.com) or canonical PropertyId (prp_123456).
     *     If the host name is moving between property configurations, use lookupPropertyIdFromHost()
     * @param fromFile the filename to read a previously saved (and modified) form of the property configuration.
     *     Only the {Object}.rules will be copied
     * @returns {Promise} returns a promise with the updated form of the
     */
    updateFromFile(propertyLookup, fromFile) {
        return new Promise((resolve, revoke) => {
                console.info(`Reading ${propertyLookup} rules from ${fromFile}`);
                fs.readFile(fromFile, (err, data) => {
                    if (err)
                        revoke(err);
                    else
                        resolve(JSON.parse(data));
                });
            })
            .then(rules => {return this.update(propertyLookup, rules)});
    }

    /**
     * Create a new version of a property, copying the rules from another seperate property configuration. The common use
     * case is to migrate the rules from a QA setup to the WWW setup. If the version is not provided, the LATEST version
     * will be assumed.
     *
     * @param fromProperty {string} either colloquial host name (www.example.com) or canonical PropertyId (prp_123456).
     *     If the host name is moving between property configurations, use lookupPropertyIdFromHost()
     * @param fromVersion {number} optional version number. Will assume LATEST_VERSION.LATEST if none are specified
     * @param toProperty {string} either colloquial host name (www.example.com) or canonical PropertyId (prp_123456)
     * @returns {Promise} returns a promise with the TResult of boolean
     */
    copy(fromProperty, fromVersion = LATEST_VERSION.LATEST, toProperty) {
        return this.retrieve(fromProperty, fromVersion)
            .then(fromRules => {
                console.info(`Copy ${fromProperty} v${fromRules.propertyVersion} to ${toProperty}`);
                return this.update(toProperty, fromRules)
            });
    }

    deleteConfig() {
        //TODO
    }

    /**
     * Convenience method to promote the STAGING version of a property to PRODUCTION
     *
     * @param propertyLookup {string} either colloquial host name (www.example.com) or canonical PropertyId (prp_123456).
     *     If the host name is moving between property configurations, use lookupPropertyIdFromHost()
     * @param notes {string} describe the reason for activation
     * @param email {Array} notivation email addresses
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
     * @param propertyLookup {string} either colloquial host name (www.example.com) or canonical PropertyId (prp_123456).
     *     If the host name is moving between property configurations, use lookupPropertyIdFromHost()
     * @param version {number} version to activate
     * @param networkEnv Akamai environment to activate the property (either STAGING or PRODUCTION)
     * @param notes {string} describe the reason for activation
     * @param email {Array} notivation email addresses
     * @returns {Promise} returns a promise with the TResult of boolean
     */
    activate(propertyLookup, version = LATEST_VERSION.LATEST, networkEnv = AKAMAI_ENV.STAGING, notes='', email=['test@example.com']) {
        //todo: change the version lookup
        let emailNotification = email;
        if (!Array.isArray(emailNotification))
            emailNotification = [email];

        return this._getProperty(propertyLookup)
            .then(property => {
                console.info(`Activating ${propertyLookup} to ${networkEnv}`);
                let activationVersion = version;
                if (!version || version <= 0)
                    activationVersion = WebSite._getLatestVersion(property, version);
                return this._activateProperty(property, activationVersion, networkEnv, notes, emailNotification)
            })
            .then(activationId => {return this._pollActivation(propertyLookup, activationId);})
    }
    //POST /platformtoolkit/service/properties/deActivate.json?accountId=B-C-1FRYVMN&aid=10357352&gid=64867&v=12
    //{"complianceRecord":{'unitTested":false,"peerReviewedBy":"","customerEmail":"","nonComplianceReason":"NO_PRODUCTION","otherNoncomplianceReason":"","siebelCase":""},"emailList":"colinb@akamai.com","network":"PRODUCTION","notes":"","notificationType":"FINISHED","signedOffWarnings":[]}

    deactivate(propertyLookup, version = LATEST_VERSION.LATEST, networkEnv = AKAMAI_ENV.STAGING, notes='', email=['test@example.com']) {
        if (!Array.isArray(email))
            email = [email];
        return this._getProperty(propertyLookup)
            .then(property => {
                console.info(`Deactivating ${propertyLookup} to ${networkEnv}`);
                let deactivationVersion = version;
                if (!version || version <= 0)
                    deactivationVersion = WebSite._getLatestVersion(property, version);
                return this._deactivateProperty(property, deactivationVersion, networkEnv, notes, email)
            })
    }
}



// function createCPCode() {
//
// }
//
// function createTLSCertificate() {
//
// }

module.exports = {
    LATEST_VERSION: LATEST_VERSION,
    AKAMAI_ENV: AKAMAI_ENV,
    WebSite: WebSite
};