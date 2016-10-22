let Luna = require('./luna');
let EdgeGrid = require('edgegrid');
let util = require('util');
let untildify = require('untildify');
var fs = require('fs');

function sleep (time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

let WebSite = function(contractId, groupId, config = {path:"~/.edgerc", lunasection: "luna", section: "default"}) {
    this._contractId = contractId;
    this._groupId = groupId;
    this._edge = new EdgeGrid({path: untildify(config.path), section: config.section});
    this._propertyList = {};
    this._stagingHostnameList = {};
    this._prodHostnameList = {};
};

WebSite.prototype._populateHosts = function() {
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
                    promiseList.push(this._getHostnameList(item.propertyId, null, WebSite.STAGING));
                    promiseList.push(this._getHostnameList(item.propertyId, null, WebSite.PRODUCTION));
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
                    if (!hostList.environment || hostList.environment === WebSite.STAGING)
                        this._stagingHostnameList[host.cnameFrom] = hostList;
                    if (!hostList.environment || hostList.environment === WebSite.PRODUCTION)
                        this._prodHostnameList[host.cnameFrom] = hostList;
                })
            });
            return new Promise(resolve => resolve(true));
        });
};

//TODO: ugh, I hate this tupil property overload. should rewrite.
WebSite.prototype._getPropertyIdTupil = function(propertyID) {
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

WebSite.prototype._getPropertyId = function(property, envOverride = WebSite.STAGING) {
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
                if (envOverride === WebSite.STAGING)
                    resolve(this._stagingHostnameList[property].propertyId);
                else
                    resolve(this._prodHostnameList[property].propertyId);
            })
        });
};

WebSite.prototype._getGroupList = function() {
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

WebSite.prototype._getPropertyList = function(contractId, groupId) {
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

WebSite.prototype._getHostnameList = function(propertyId, versionReq, env) {
    let contractId;
    let groupId;

    return this._getPropertyIdTupil(propertyId)
        .then((data) => {
            //set basic data like contract & group
            contractId = data.contractId;
            groupId = data.groupId;

            // get the version if it wasn't provided -> use the environment
            if (!versionReq) {
                return this._getPropertyLatest(propertyId, env);
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

WebSite.prototype._getPropertyLatest = function(propertyId, env = WebSite.LATEST) {
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
                        if (env === WebSite.PRODUCTION)
                            resolve(prodVersion);
                        else if (env === WebSite.STAGING)
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

WebSite.prototype._copyPropertyVersion = function(propertyId, versionId) {
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

WebSite.prototype._getPropertyRules = function(propertyId, versionId) {
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

WebSite.prototype._updatePropertyRules = function(propertyId, versionId, rules) {
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

WebSite.prototype._activateProperty = function(propertyId, versionId, env = WebSite.STAGING, notes = "", email=["test@example.com"], acknowledgeWarnings=[], autoAcceptWarnings=true) {
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

WebSite.prototype._pollActivation = function(propertyId, activationID) {
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
                return sleep(30000).then(() => {return this._pollActivation(propertyId, activationID);});
            }
            else
                return new Promise((resolve, reject) => {if (active) resolve(true); else reject(data);});

        });
};

WebSite.prototype.lookupPropertyIdFromHost = function(hostname, env = WebSite.PRODUCTION) {
    return this._getPropertyId(property, env);
};

WebSite.prototype.getSite = function(hostOrPropertyId, versionId, versionEnv = WebSite.LATEST) {
    console.info("[Get Site]");
    let propertyId = hostOrPropertyId;
    return this._getPropertyId(hostOrPropertyId)
        .then(localPropId => {
            propertyId = localPropId;
            if (versionId && versionId > 0)
                return new Promise(resolve => {resolve(versionId)});
            return this._getPropertyLatest(propertyId, versionEnv);
        })
        .then(versionId => {
            return this._getPropertyRules(propertyId, versionId)
        });
};

WebSite.prototype.updateSite = function (hostOrPropertyId, newRules) {
    console.info("[Update Site]");
    let propertyId = hostOrPropertyId;
    return this._getPropertyId(hostOrPropertyId)
        .then(localPropId => { propertyId = localPropId; return this._getPropertyLatest(propertyId)})
        .then(versionId => {return this._copyPropertyVersion(propertyId, versionId);})
        .then(newVersionId => {return this.getSite(propertyId, newVersionId);})
        .then(oldRules => {
            let updatedRules = newRules;
            updatedRules.rules = newRules.rules;
            return this._updatePropertyRules(propertyId, oldRules.propertyVersion, updatedRules);
        });
};

WebSite.prototype.updateSiteFromFile = function (hostOrPropertyId, fromFile) {
    return new Promise((resolve, revoke) => {
        console.info("[Reading %s Rules: %s]", hostOrPropertyId, fromFile);
        fs.readFile(fromFile, function (err, data) {
            if (err)
                revoke(err);
            else
                resolve(JSON.parse(data));
        });
    })
    .then(rules => {return this.updateSite(hostOrPropertyId, rules)});
};

WebSite.prototype.copySite = function (fromProperty, fromVersion, toProperty) {
    return this.getSite(fromProperty, fromVersion)
        .then(fromRules => {
            console.info("[Copy %s to %s]", fromProperty, toProperty);
            return this.updateSite(toProperty, fromRules)
        });
};

WebSite.prototype.promoteStagingToProd = function(hostOrPropertyId, notes="", email=["test@example.com"]) {
    let propertyId = hostOrPropertyId;
    let stagingVersion;
    console.info("[Activating to %s]", env);
    //todo: make sure email is an array
    return this._getPropertyId(hostOrPropertyId)
        .then(localPropId => {  propertyId = localPropId; return this._getPropertyLatest(propertyId, WebSite.STAGING) })
        .then(version => {stagingVersion = version; return this._getPropertyLatest(propertyId, WebSite.PRODUCTION) })
        .then(prodVersion => {
            if (prodVersion !== stagingVersion) {
                return this.activateSite(hostOrPropertyId, stagingVersion, WebSite.PRODUCTION, notes, email)
            }
            else console.info("%s is already active in PRODUCTION!", stagingVersion);
        });
};

WebSite.prototype.activateSite = function(hostOrPropertyId, versionId, env = WebSite.STAGING, notes="", email=["test@example.com"]) {
    let propertyId = hostOrPropertyId;
    console.info("[Activating to %s]", env);
    //todo: make sure email is an array
    return this._getPropertyId(hostOrPropertyId)
        .then(localPropId => { propertyId = localPropId; return this._activateProperty(propertyId, versionId, env, notes, email)})
        .then(activationId => {return this._pollActivation(propertyId, activationId);})
        .then(() => {console.info("Successfully Active!")});
};

// function createCPCode() {
//
// }
//
// function createTLSCertificate() {
//
// }
//
// function createConfig() {
//
// }
// function deleteConfig() {
//
// }
//
// function deactivate() {
//     //TODO
// }

module.exports = {
    WebSite: WebSite,
    STAGING: 'STAGING',
    PRODUCTION: 'PRODUCTION',
    LATEST: 'latest'
};