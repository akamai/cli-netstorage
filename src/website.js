"use strict";

let Luna = require('./luna');
let EdgeGrid = require('edgegrid');
let util = require('util');
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
    STAGING: "STAGING",
    PRODUCTION: "PRODUCTION"
};

//export default class WebSite {
class WebSite {

    constructor(contractId, groupId, config = {path:"~/.edgerc", lunasection: "luna", section: "default"}) {
        this._contractId = contractId;
        this._groupId = groupId;
        this._edge = new EdgeGrid({path: untildify(config.path), section: config.section});
        this._propertyList = {};
        this._stagingHostnameList = {};
        this._prodHostnameList = {};
    }

    static sleep (time) {
        return new Promise((resolve) => setTimeout(resolve, time));
    }

    init() {
        _populateHosts();
    }

    _populateHosts() {
        let groupcontractList = [];
        if (Object.keys(this._propertyList).length > 0)
            return new Promise(resolve => resolve());

        console.info("Populating Hostname Tree (Environment -> Hostname -> Property -> Group ->Contract)");
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
                console.log("... retrieving properties from %s groups", groupcontractList.length);
                return Promise.all(groupcontractList.map(v => {
                    return this._getPropertyList(v.contractId, v.groupId);
                }));
            })
            .then(propList => {
                let promiseList = [];

                propList.map(v => {
                    return v.properties.items.map(item => {
                        this._propertyList[item.propertyId] = item;
                        promiseList.push(this._getHostnameList(item.propertyId, null, LATEST_VERSION.STAGING));
                        promiseList.push(this._getHostnameList(item.propertyId, null, LATEST_VERSION.PRODUCTION));
                    });
                });

                console.log("... retrieving Hosts from %s properties", Object.keys(this._propertyList).length);
                return Promise.all(promiseList);
            })
            .then(hostListList => {
                this._propertyList = {};
                hostListList.map(hostList => {

                    if (!this._propertyList[hostList.propertyId])
                        this._propertyList[hostList.propertyId] = hostList;
                    else delete this._propertyList[hostList.propertyId].environment;

                    hostList.hostnames.items.map(host => {
                        if (!hostList.environment || hostList.environment === LATEST_VERSION.STAGING)
                            this._stagingHostnameList[host.cnameFrom] = hostList;
                        if (!hostList.environment || hostList.environment === LATEST_VERSION.PRODUCTION)
                            this._prodHostnameList[host.cnameFrom] = hostList;
                    })
                });
                return new Promise(resolve => resolve(true));
            });
    };

    //TODO: ugh, I hate this tupil property overload. should rewrite.
    //TODO: refactor as a Proxy class
    _getPropertyIdTupil(propertyID) {
        let tupil = this._propertyList[propertyID] || {propertyID: propertyID, contractId:this._contractId, groupId:this._groupId};

        // do we have the contract and groupId already?
        if (tupil.groupId && tupil.contractId) {
            //noop - pass the property back
            return new Promise (resolve => resolve(tupil));
        }

        //lookup the hostname to find the propertyId
        return this._populateHosts()
            .then(() => {
                return new Promise(resolve => resolve(this._propertyList[propertyID]))
            });
    };

    _getPropertyId(property, envOverride = LATEST_VERSION.STAGING) {
        //were we passed the propertyId? or a hostname as a colloquial expression for the propertyId?
        if (property.includes("prp_")) {
            //noop - pass the property back
            return new Promise (resolve => {resolve(property)})
        }

        // in case where the hostname is associated with a different property in different environments
        // lookup the hostname by environment to find the propertyId.
        return this._populateHosts()
            .then(() => {
                return new Promise(resolve => {
                    if (envOverride === LATEST_VERSION.STAGING)
                        resolve(this._stagingHostnameList[property].propertyId);
                    else
                        resolve(this._prodHostnameList[property].propertyId);
                })
            });
    };

    _getGroupList() {
        return new Promise((resolve, reject) => {
            console.info("... retrieving list of Group Ids");

            let request = {
                method: 'GET',
                path:  util.format('/papi/v0/groups'),
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
            //console.info("... retrieving list of properties {%s : %s}", contractId, groupId);

            let request = {
                method: 'GET',
                path:  util.format('/papi/v0/properties?contractId=%s&groupId=%s', contractId, groupId),
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

    _getHostnameList(propertyId, versionReq, env) {
        let contractId;
        let groupId;

        return this._getPropertyIdTupil(propertyId)
            .then((data) => {
                //set basic data like contract & group
                contractId = data.contractId;
                groupId = data.groupId;

                // get the version if it wasn't provided -> use the environment
                if (!versionReq) {
                    return this._getLatestVersion(propertyId, env);
                }
                return new Promise(resolve => {
                    resolve(versionReq)
                })
            })
            .then(version => {

                return new Promise((resolve, reject) => {
                    //console.info("... retrieving list of hostnames {%s : %s : %s}", contractId, groupId, propertyId);

                    let request = {
                        method: 'GET',
                        path:  util.format('/papi/v0/properties/%s/versions/%s/hostnames?contractId=%s&groupId=%s', propertyId, version, contractId, groupId),
                        followRedirect: false
                    };
                    this._edge.auth(request);

                    this._edge.send(function(data, response) {
                        if (response.statusCode >= 200 && response.statusCode  < 400) {
                            let parsed = JSON.parse(response.body);
                            if (env) parsed.environment = env;
                            resolve(parsed);
                        }
                        else {
                            reject(response);
                        }
                    });
                });
            });
    };

    _getLatestVersion(propertyId, env = LATEST_VERSION) {
        let contractId;
        let groupId;

        return this._getPropertyIdTupil(propertyId)
            .then((data) => {
                contractId = data.contractId;
                groupId = data.groupId;
                return new Promise((resolve, reject) => {
                    console.info("... retrieving latest version {%s : %s : %s}", contractId, groupId, propertyId);

                    let request = {
                        method: 'GET',
                        path: util.format('/papi/v0/properties/%s?contractId=%s&groupId=%s', propertyId, contractId, groupId),
                        followRedirect: false,
                        followAllRedirects: false
                    };
                    this._edge.auth(request);

                    this._edge.send(function (data, response) {
                        if (response.statusCode >= 200 && response.statusCode < 400) {
                            let parsed = JSON.parse(response.body);
                            let latestVersion = parsed.properties.items[0].latestVersion;
                            let stageVersion = parsed.properties.items[0].stagingVersion || latestVersion;
                            let prodVersion = parsed.properties.items[0].productionVersion || stageVersion;
                            if (env === LATEST_VERSION.PRODUCTION)
                                resolve(prodVersion);
                            else if (env === LATEST_VERSION.STAGING)
                                resolve(stageVersion);
                            else
                                resolve(latestVersion);
                        }
                        else {
                            reject(response);
                        }
                    });
                })
            });
    };

    _copyPropertyVersion(propertyId, versionId) {
        let contractId;
        let groupId;

        return this._getPropertyIdTupil(propertyId)
            .then((data) => {
                contractId = data.contractId;
                groupId = data.groupId;
                return new Promise((resolve, reject) => {
                    console.info("... copy property {%s : %s}", propertyId, versionId);
                    let body = {};
                    body.createFromVersion = versionId;

                    let request = {
                        method: 'POST',
                        path: util.format('/papi/v0/properties/%s/versions?contractId=%s&groupId=%s', propertyId, contractId, groupId),
                        body: body
                    };

                    this._edge.auth(request);

                    this._edge.send(function (data, response) {
                        if (/application\/json/.test(response.headers['content-type'])) {
                            let parsed = JSON.parse(response.body);
                            let matches = !parsed.versionLink ? null : parsed.versionLink.match("versions/(\\d+)?");
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

    _getPropertyRules(propertyId, versionId) {
        let contractId;
        let groupId;

        return this._getPropertyIdTupil(propertyId)
            .then((data) => {
                //set basic data like contract & group
                contractId = data.contractId;
                groupId = data.groupId;
                return new Promise((resolve, reject) => {
                    console.info("... retrieving property {%s : %s}", propertyId, versionId);

                    let request = {
                        method: 'GET',
                        path: util.format('/papi/v0/properties/%s/versions/%s/rules?contractId=%s&groupId=%s', propertyId, versionId, contractId, groupId)
                    };

                    this._edge.auth(request);

                    this._edge.send(function (data, response) {
                        let parsed = JSON.parse(response.body);
                        resolve(parsed);
                    });
                });
            });
    };

    _updatePropertyRules(propertyId, versionId, rules) {
        let contractId;
        let groupId;

        return this._getPropertyIdTupil(propertyId)
            .then((data) => {
                //set basic data like contract & group
                contractId = data.contractId;
                groupId = data.groupId;
                return new Promise((resolve, reject) => {
                    console.info("... updating property {%s : %s}", propertyId, versionId);

                    let request = {
                        method: 'PUT',
                        path: util.format('/papi/v0/properties/%s/versions/%s/rules?contractId=%s&groupId=%s', propertyId, versionId, contractId, groupId),
                        body: rules
                    };

                    this._edge.auth(request);

                    this._edge.send(function (data, response) {
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
    _activateProperty(propertyId, versionId, env = LATEST_VERSION.STAGING, notes = "", email=["test@example.com"], acknowledgeWarnings=[], autoAcceptWarnings=true) {
        let contractId;
        let groupId;

        return this._getPropertyIdTupil(propertyId)
            .then((data) => {
                //set basic data like contract & group
                contractId = data.contractId;
                groupId = data.groupId;
                return new Promise((resolve, reject) => {
                    console.info("... activating property {%s : %s}", propertyId, versionId);

                    let activationData = {
                        propertyVersion: versionId,
                        network: env,
                        note: notes,
                        notifyEmails: email,
                        acknowledgeWarnings: acknowledgeWarnings,
                        complianceRecord: {
                            noncomplianceReason: "NO_PRODUCTION_TRAFFIC"
                        }
                    };
                    let request = {
                        method: 'POST',
                        path: util.format(':/papi/v0/properties/%s/activations?contractId=%s&groupId=%s', propertyId, contractId, groupId),
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
                if (body.type && body.type.includes("warnings-not-acknowledged")) {
                    let messages = [];
                    console.info("... automatically acknowledging %s warnings!", body.warnings.length);
                    body.warnings.map(warning => {
                        //TODO report these warnings?
                        //console.trace(body.warnings[i]);
                        messages.push(warning.messageId);
                    });
                    //TODO: check that this doesn't happen more than once...
                    return this._activateProperty(propertyId, versionId, env, notes, email, messages);
                }
                else
                    return new Promise((resolve, reject) => {
                        let matches = !body.activationLink ? null : body.activationLink.match("activations/([a-z0-9_]+)\\b");
                        if (!matches) {
                            reject(body);
                        }
                        else {
                            resolve(matches[1])
                        }
                    });
            });
    };

    _pollActivation(propertyId, activationID) {
        let contractId;
        let groupId;

        return this._getPropertyIdTupil(propertyId)
            .then(data => {
                //set basic data like contract & group
                contractId = data.contractId;
                groupId = data.groupId;
                return new Promise((resolve, reject) => {
                    console.info("... polling property {%s : %s}", propertyId, activationID);

                    let request = {
                        method: 'GET',
                        path: util.format(':/papi/v0/properties/%s/activations/%s?contractId=%s&groupId=%s', propertyId, activationID, contractId, groupId)
                    };

                    this._edge.auth(request);

                    this._edge.send(function (data, response) {
                        if (response.statusCode === 200 && /application\/json/.test(response.headers['content-type'])) {
                            let parsed = JSON.parse(response.body);
                            resolve(parsed);
                        }
                        if (response.statusCode === 500) {
                            console.error("Activation caused a 500 response. Retrying...")
                            resolve({activations:{items:[{status:"PENDING"}]}});
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
                    pending = pending || "PENDING" === status.status;
                    active = !pending && active && "ACTIVE" === status.status;
                });
                if (pending) {
                    console.info("... waiting 30s");
                    return WebSite.sleep(30000).then(() => {return this._pollActivation(propertyId, activationID);});
                }
                else
                    return new Promise((resolve, reject) => {if (active) resolve(true); else reject(data);});

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
        return this._getPropertyId(property, env);
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
     * @param hostOrPropertyId {string} either colloquial host name (www.example.com) or canonical PropertyId (prp_123456).
     *     If the host name is moving between property configurations, use lookupPropertyIdFromHost()
     * @param version {number} specify the version or use LATEST_VERSION.PRODUCTION / STAGING / latest
     * @returns {Promise} with the property rules as the {TResult}
     */
    retrieve(hostOrPropertyId, version = LATEST_VERSION.LATEST) {
        console.info("[Get Site]");
        let propertyId = hostOrPropertyId;
        return this._getPropertyId(hostOrPropertyId)
            .then(localPropId => {
                propertyId = localPropId;
                if (version && version > 0)
                    return new Promise(resolve => {resolve(version)});
                return this._getLatestVersion(propertyId, version);
            })
            .then(lookupVersion => {
                return this._getPropertyRules(propertyId, lookupVersion)
            });
    }

    /**
     *
     * @param hostOrPropertyId {string} either colloquial host name (www.example.com) or canonical PropertyId (prp_123456).
     *     If the host name is moving between property configurations, use lookupPropertyIdFromHost()
     * @param newRules {Object} of the configuration to be updated. Only the {object}.rules will be copied.
     * @returns {Promise} with the property rules as the {TResult}
     */
    update(hostOrPropertyId, newRules) {
        console.info("[Update Site]");
        let propertyId = hostOrPropertyId;
        return this._getPropertyId(hostOrPropertyId)
            .then(localPropId => { propertyId = localPropId; return this._getLatestVersion(propertyId)})
            .then(versionId => {return this._copyPropertyVersion(propertyId, versionId);})
            .then(newVersionId => {return this.retrieve(propertyId, newVersionId);})
            .then(oldRules => {
                let updatedRules = newRules;
                updatedRules.rules = newRules.rules;
                return this._updatePropertyRules(propertyId, oldRules.propertyVersion, updatedRules);
            });
    }

    /**
     * Create a new version of a property, copying the rules from a file stream. This allows storing the property configuration
     * in a version control system and then updating the Akamai system when it becomes live. Only the Object.rules from the file
     * will be used to update the property
     *
     * @param hostOrPropertyId {string} either colloquial host name (www.example.com) or canonical PropertyId (prp_123456).
     *     If the host name is moving between property configurations, use lookupPropertyIdFromHost()
     * @param fromFile the filename to read a previously saved (and modified) form of the property configuration.
     *     Only the {Object}.rules will be copied
     * @returns {Promise} returns a promise with the updated form of the
     */
    updateFromFile(hostOrPropertyId, fromFile) {
        return new Promise((resolve, revoke) => {
                console.info("[Reading %s Rules: %s]", hostOrPropertyId, fromFile);
                fs.readFile(fromFile, (err, data) => {
                    if (err)
                        revoke(err);
                    else
                        resolve(JSON.parse(data));
                });
            })
            .then(rules => {return this.update(hostOrPropertyId, rules)});
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
                console.info("[Copy %s to %s]", fromProperty, toProperty);
                return this.update(toProperty, fromRules)
            });
    }

    deleteConfig() {
        //TODO
    }

    /**
     * Convenience method to promote the STAGING version of a property to PRODUCTION
     *
     * @param hostOrPropertyId {string} either colloquial host name (www.example.com) or canonical PropertyId (prp_123456).
     *     If the host name is moving between property configurations, use lookupPropertyIdFromHost()
     * @param notes {string} describe the reason for activation
     * @param email {Array} notivation email addresses
     * @returns {Promise} returns a promise with the TResult of boolean
     */
    promoteStagingToProd(hostOrPropertyId, notes="", email=["test@example.com"]) {
        let propertyId = hostOrPropertyId;
        let stagingVersion;
        console.info("[Activating to %s]", AKAMAI_ENV.PRODUCTION);
        //todo: make sure email is an array
        return this._getPropertyId(hostOrPropertyId)
            .then(localPropId => {  propertyId = localPropId; return this._getLatestVersion(propertyId, LATEST_VERSION.STAGING) })
            .then(version => {stagingVersion = version; return this._getLatestVersion(propertyId, LATEST_VERSION.PRODUCTION) })
            .then(prodVersion => {
                if (prodVersion !== stagingVersion) {
                    return this.activate(hostOrPropertyId, stagingVersion, AKAMAI_ENV.PRODUCTION, notes, email)
                }
                else new Promise(resolve => resolve(true));
            });
    }

    /**
     * Activate a property to either STAGING or PRODUCTION. This function will poll (30s) incr. until the property has
     * successfully been promoted.
     *
     * @param hostOrPropertyId {string} either colloquial host name (www.example.com) or canonical PropertyId (prp_123456).
     *     If the host name is moving between property configurations, use lookupPropertyIdFromHost()
     * @param version {number} version to activate
     * @param networkEnv Akamai environment to activate the property (either STAGING or PRODUCTION)
     * @param notes {string} describe the reason for activation
     * @param email {Array} notivation email addresses
     * @returns {Promise} returns a promise with the TResult of boolean
     */
    activate(hostOrPropertyId, version = LATEST_VERSION.LATEST, networkEnv = AKAMAI_ENV.STAGING, notes="", email=["test@example.com"]) {
        console.info("[Activating to %s]", networkEnv);
        //todo: make sure email is an array
        //todo: change the version lookup
        let propertyId = hostOrPropertyId;
        return this._getPropertyId(hostOrPropertyId)
            .then(localPropId => {
                propertyId = localPropId;
                if (version && version > 0)
                    return new Promise(resolve => {resolve(version)});
                return this._getLatestVersion(propertyId, versionEnv);
            })
            .then(lookupVersion => {return this._activateProperty(propertyId, lookupVersion, networkEnv, notes, email)})
            .then(activationId => {return this._pollActivation(propertyId, activationId);})
    }

    /**
     *
     * @param hostOrPropertyId
     * @param networkEnv
     */
    //POST /platformtoolkit/service/properties/deActivate.json?accountId=B-C-1FRYVMN&aid=10357352&gid=64867&v=12
    //{"complianceRecord":{"unitTested":false,"peerReviewedBy":"","customerEmail":"","nonComplianceReason":"NO_PRODUCTION","otherNoncomplianceReason":"","siebelCase":""},"emailList":"colinb@akamai.com","network":"PRODUCTION","notes":"","notificationType":"FINISHED","signedOffWarnings":[]}
    deactivate(hostOrPropertyId, networkEnv = AKAMAI_ENV.STAGING) {
        //TODO
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
}