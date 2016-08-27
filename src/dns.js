let Luna = require('./luna');
let EdgeGrid = require('edgegrid');
let util = require('util');
let untildify = require('untildify')

DNS.prototype._DEFAULT_ZONE = {
    "token": "new",
    "zone": {
        "name": "example.com",
        "soa": {
            "contact": "hostmaster.akamai.com.",
            "expire": 604800,
            "minimum": 180,
            "originserver": "www.example.com.",
            "refresh": 900,
            "retry": 300,
            "serial": 12345,
            "ttl": 900
        }
    }
};

let DNS = function(zoneName, config = {path:"~/.edgerc", lunasection: "luna", section: "default"}) {
    this._zone = zoneName;
    this._luna = new Luna({path: config.path, section: config.lunasection});
    this._edge = new EdgeGrid({path: untildify(config.path), section: config.section});
};

/**
 * Retrieve the default Account ID. To do this we log into luna and retrieve the html value <input name="param_acg_to_add" ... />
 *
 * GET /portal/adns/adns_add.jsp
 *
 * @returns {Promise} the value of the Account ID
 * @private
 */
DNS.prototype._getDefaultAccount = function() {
    let url = "/portal/adns/adns_add.jsp";
    return this._luna.request('GET', url)
        .then((response) => {
            return new Promise((resolve, reject) => {
                console.info("... retrieving default account id");
                //TODO: check auth
                //console.info(body);
                let matches = response.body.match(/name=["']param_acg_to_add["' ]+value=["']([^'"]+)["']/i);
                //let parsed = JSON.parse(body);
                //something like the jpath below. Faster/more convenient to use a regex...
                //parsed.tabs[.name==="Configure"].columns[.mainMenuItems[.name==="Organization"]].mainMenuItems[.name==="Organization"].subMenuItems[.name==="Manage APIs"].url

                if (matches) {
                    let accountID = matches[1];
                    resolve(accountID);
                }
                else {
                    reject(Error("ERROR: cannot find the default accountID"));
                }
            });
        });

};


/**
 * STEP 1: use luna to create the zone. For some reason you can't create a zone via only APIs
 *
 * POST https://control.akamai.com/portal/adns/adns_add.jsp
 *      action=add&childZoneOverride=false&param_acg_to_add=$ACCOUNT&adnsType=primary&adnsNotify=yes&adnsTsigAlgorithm=HMAC-MD5.SIG-ALG.REG.INT&adnsTsigKeyName=&adnsTsigKey=&adnsTsig=no&adnsNS=&adnsNS=&adnsNS=&adnsNS4=&adnsNewZones=$ZONES
 *
 * @param zoneName
 * @returns {Promise} no return value on success
 * @private
 */
DNS.prototype._createDNSZone = function(zoneName) {
    let url = "/portal/adns/adns_add.jsp";
    return this._luna.login()
        .then(() => this._getDefaultAccount())
        .then((accountID) => {
            let postData = {
                "action": "add",
                "childZoneOverride": "false",
                "param_acg_to_add": accountID,
                "adnsType": "primary",
                "adnsNotify": "yes",
                "adnsTsigAlgorithm": "HMAC-MD5.SIG-ALG.REG.INT",
                "adnsTsigKeyName": "",
                "adnsTsigKey": "",
                "adnsTsig": "no",
                "adnsNS":"",
                "adnsNewZones": zoneName
            };
            return this._luna.request('POST', url, {form: postData});

        })
        .then((response) => {
            console.info("... creating zone {zone: %s}", zoneName);
            return new Promise((resolve, reject) => {
                if (response.statusCode != 200 ) {
                    reject(Error('create failure!'));
                } else {
                    resolve();
                }
            });
        });
};

/**
 * Call the Open API to retrieve DNS Zone
 *
 * @param zoneName the DNS zone name (example.com) NB: it should _not_ be fully qualified bind - no trailing '.'
 * @returns {Promise} with zone details object
 * @private
 */
DNS.prototype._getDNSZone = function(zoneName) {
    return new Promise((resolve, reject) => {
        console.info("... retrieving zone {%s}", zoneName);

        let request = {
            method: 'GET',
            path:  util.format('/config-dns/v1/zones/%s', zoneName)
        };

        this._edge.auth(request);

        this._edge.send(function(data, response) {
            if (response.statusCode === 200 && /application\/json/.test(response.headers['content-type'])) {
                let parsed = JSON.parse(response.body);
                resolve(parsed);
            }
            else if (response.statusCode === 404) {
                resolve({});
            }
            else {
                reject(response);
            }
        });
    });
};

/**
 * Call the OPEN API to update a DNS Zone. We will make sure that the zone token is preserved and serial is incremented
 * between updates automatically.
 *
 * @param {string} zone dns name
 * @returns {Promise} with zone details object
 * @private
 */
DNS.prototype._updateDNSZone = function(zone) {

    let p;
    if (typeof zone === 'string') {
        let zoneName = zone;
        zone = new Object(this._DEFAULT_ZONE);
        zone.zone.name = zoneName;
        zone.zone.soa.originserver = zoneName + "."; //must be fully qualified
        p = new Promise(resolve => { resolve(zone) });
    }
    else {
        p = this._getDNSZone(zone.zone.name);
    }

    return p.then(oldZoneDetails => {
        return new Promise((resolve, reject) => {
            console.info("... updating zone {%s}", zone.zone.name);
            zone.token = oldZoneDetails.token;
            zone.zone.soa.serial = oldZoneDetails.zone.soa.serial + 1;
            let request = {
                method: 'POST',
                path:  util.format('/config-dns/v1/zones/%s', zone.zone.name),
                body: zone
            };

            this._edge.auth(request);

            this._edge.send(function(data, response) {
                if (response.statusCode === 201 || response.statusCode === 204) {
                    resolve(zone);
                }
                else {
                    reject(Error("Unexpected response from DNS API: %s", response.statusCode));
                }
            });
        });
    });
};



/**
 * Use luna to delete a zone. For some reason you cannot delete via the API. Only the last of the HTTP calls is neessary
 * for the service but it does require the use of the zone's Id #
 *
 * GET https://control.akamai.com/portal/adns/adns_delete.jsp
 *      <label for="delzone_220074" id="yui-gen126">mnot.net</label>
 *
 * POST https://control.akamai.com/portal/adns/adns_delete.jsp
 *      action=deleteconfirm&adns_del_type=schedule&toggle=on&delzone_348338=on
 *
 * POST https://control.akamai.com/portal/adns/adns_delete.jsp
 *      delzone_348338=foo&action=delete&ednsicdelete=false
 *
 * @param {object} zoneDetails from retrieve()
 * @returns {Promise} with the zone name if successful
 * @private
 */
DNS.prototype._deleteDNSZone = function(zoneDetails) {
    let url = "/portal/adns/adns_delete.jsp";
    return this._luna.login()
        .then(() => {
            let postData = {
                "action": "delete",
                "ednsicdelete": false
            };
            postData["delzone_" + zoneDetails.zone.id ] = "foo";
            return this._luna.request('POST', url, {form: postData});

        })
        .then((response) => {
            console.info("... deleting zone {zone: %s}", zoneDetails.zone.name);
            return new Promise((resolve, reject) => {
                if (response.statusCode != 200 ) {
                    reject(Error('delete failure!'));
                } else {
                    resolve(zoneDetails.zone.name);
                }
            });
        });
};

/**
 * Create a new primary DNZ zone. We will populate with the default SOA record and NS values.
 *
 * @returns {Promise} zoneDetails from a successful deployment
 */
DNS.prototype.create = function() {
    //TODO check for pre-existence
    return this._createDNSZone(this._zone)
        .then(() => this._updateDNSZone(this._zone));
};

/**
 * Retrieve the entire zone file
 *
 * @returns {Promise} zoneDetails. {} if the zone doesn't exist
 */
DNS.prototype.retrieve = function() {
    //TODO do a zonecheck
    return this._getDNSZone(this._zone);
};

/**
 * Delete the entire zone. Careful! this will impact production immediately!
 *
 * @returns {Promise} zone name (example.com) if successful
 */
DNS.prototype.delete = function() {
    //TODO do a zonecheck
    return this._getDNSZone(this._zone)
        .then((zoneDetails) => this._deleteDNSZone(zoneDetails));
};

/**
 * Retrieve a record from the zone. Use recordName = null for apex zone (applicable to A, AAAA, SRV, and MX records).
 * Use recordName = "*" for a catchall value.
 *
 * @param {string} recordName the record name. Should _not_ be qualified. Eg: "www"
 * @param {string} type the DNS record type. case does not matter
 * @returns {Promise} zoneDetails after the record has been updated
 */
DNS.prototype.getRecord = function(recordName = "", type="NS") {
    //TODO do a zonecheck
    if (!recordName || recordName === "")
        recordName = null;


    return this._getDNSZone(this._zone)
        .then(zoneDetails => {
            return new Promise(resolve => {
                let records = zoneDetails.zone[type.toLowerCase()] || [];

                records = records.filter(val => "*" === recordName || val.name === recordName);
                resolve(records);
            });
        });
};

/**
 * Add additional records (does not remove or replace pre-existing). NB: Use the appropriate field values for each record type.
 * Default values of `ttl=30` and `active=true` will be used.
 *
 * As a shortcut for A/AAAA/CNAME you simply specify the target value instead of a record object
 *
 * @param {string} recordName the record name. Should _not_ be qualified. Eg: "www"
 * @param {string} or {object} records to be added
 * @param {string} type the DNS record type. case does not matter
 * @returns {Promise} zoneDetails after the record has been updated
 */
DNS.prototype.addRecord = function(recordName, records=[{target: "www.example.com", ttl: 30, active: true}], type="CNAME") {
    //TODO do a zonecheck
    if (!recordName || recordName === "")
        recordName = null;

    if (typeof records === 'string')
        records = [{target:records}];

    if (!Array.isArray(records))
        records = [records];

    records = records.map(v => {
        v.active = v.active || true;
        v.name = v.name || recordName;
        v.ttl = v.ttl || 30;
        return v;
    });

    return this._getDNSZone(this._zone)
        .then(zoneDetails => {
            records = records.concat(zoneDetails.zone[type.toLowerCase()] || []);
            zoneDetails.zone[type.toLowerCase()] = records;
            return this._updateDNSZone(zoneDetails);
        });
};

/**
* Like Add, Updates existing records (or add if missing). NB: Use the appropriate field values for each record type.
* Default values of `ttl=30` and `active=true` will be used.
*
* As a shortcut for A/AAAA/CNAME you simply specify the target value instead of a record object
*
* @param {string} recordName the record name. Should _not_ be qualified. Eg: "www"
* @param {object} records  (or {string}) to be added
* @param {string} type the DNS record type. case does not matter
* @returns {Promise} zoneDetails after the record has been updated
*/

DNS.prototype.updateRecord = function(recordName, records=[{target: "www.example.com", ttl: 30, active: true}], type="CNAME") {
    //TODO do a zonecheck
    if (!recordName || recordName === "")
        recordName = null;

    if (typeof records === 'string')
        records = [{target:records}];

    if (!Array.isArray(records))
        records = [records];

    records = records.map(v => {
        v.active = v.active || true;
        v.name = v.name || recordName;
        v.ttl = v.ttl || 30;
        return v;
    });

    return this._getDNSZone(this._zone)
        .then(zoneDetails => {
            let oldRecords = zoneDetails.zone[type.toLowerCase()] || [];
            oldRecords = oldRecords.filter(v => v.name !== recordName);
            records = records.concat(oldRecords);
            zoneDetails.zone[type.toLowerCase()] = records;
            return this._updateDNSZone(zoneDetails);
        });
};

/**
 * Delete a single DNS record from the zone Zone.
 *
 * @param {string} recordName the record name. Should _not_ be qualified. Eg: "www"
 * @param {string} type the DNS record type. case does not matter
 * @returns {Promise} zoneDetails after the record has been updated
 */
DNS.prototype.deleteRecord = function(recordName, type="CNAME") {
    //TODO do a zonecheck
    if (!recordName || recordName === "")
        recordName = null;

    return this._getDNSZone(this._zone)
        .then(zoneDetails => {
            let records = zoneDetails.zone[type.toLowerCase()] || [];
            records = records.filter(v => v.name !== recordName);

            zoneDetails.zone[type.toLowerCase()] = records;
            return this._updateDNSZone(zoneDetails);
        });
};

module.exports = DNS;