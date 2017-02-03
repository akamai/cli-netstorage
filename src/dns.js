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


let Luna = require('./luna');
let EdgeGrid = require('edgegrid');
let util = require('util');
let untildify = require('untildify');

const _DEFAULT_ZONE = {
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
            "serial": 12344,
            "ttl": 900
        }
    }
};

/**
 * DNS Activities
 */
class DNS {

    /**
     * Default constructor for dns management library. By default the `~/.edgerc` file is used for authentication,
     * using the `[default]` section for standard API calls. Luna credentials are also required for Domain creation.  
     * @param domain {string} the zone name (domain) to be managed. For example, `akamai.com` or `example.com`
     * @param auth {Object} providing the path, section and lunasection for the authentication. We require the
     */
    constructor(domain, auth = {path: "~/.edgerc", lunasection: "luna", section: "default"}) {
        this._zone = domain;
        this._luna = new Luna({path: untildify(auth.path), section: auth.lunasection});
        if (auth.clientToken && auth.clientSecret && auth.accessToken && auth.host)
            this._edge = new EdgeGrid(auth.clientToken. config.clientSecret, auth.accessToken, auth.host);
        else
            this._edge = new EdgeGrid({path: untildify(auth.path), section: auth.section});
    }

    /**
     * Retrieve the default Account ID. To do this we log into luna and retrieve the html value <input name="param_acg_to_add" ... />
     *
     * GET /portal/adns/adns_add.jsp
     *
     * @returns {Promise} the value of the Account ID
     * @private
     */
    _getDefaultAccount() {
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

    }


    /**
     * STEP 1: use luna to create the zone. For some reason you can't create a zone via only APIs
     *
     * POST https://control.akamai.com/portal/adns/adns_add.jsp
     *      action=add&childZoneOverride=false&param_acg_to_add=$ACCOUNT&adnsType=primary&adnsNotify=yes&adnsTsigAlgorithm=HMAC-MD5.SIG-ALG.REG.INT&adnsTsigKeyName=&adnsTsigKey=&adnsTsig=no&adnsNS=&adnsNS=&adnsNS=&adnsNS4=&adnsNewZones=$ZONES
     *
     * POST /portal/adns/adns_add.jsp
     *      action=add&childZoneOverride=false&param_acg_to_add=C-1FRYVV3&adnsType=alias&aliasOf=bendell.ca&adnsNotify=yes&adnsTsigAlgorithm=HMAC-MD5.SIG-ALG.REG.INT&adnsTsigKeyName=&adnsTsigKey=&adnsTsig=no&adnsNS=&adnsNS=&adnsNS=&adnsNS=&adnsNewZones=colinb.com
     *
     * @param zoneName
     * @param options
     * @returns {Promise} no return value on success
     * @private
     */
    _createDNSZone(zoneName, options = {aliasOf: null}) {
        let url = "/portal/adns/adns_add.jsp";
        return this._getDefaultAccount()
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
                    "adnsNS": "",
                    "adnsNewZones": zoneName
                };
                return this._luna.request('POST', url, {form: postData});

            })
            .then((response) => {
                console.info(`... creating zone ${zoneName}`);
                return new Promise((resolve, reject) => {
                    if (response.statusCode == 200
                        && (response.body.includes("The zones were successfully submitted.")
                        || response.body.includes("Failed to add zones as zones with the following names already exist"))) {
                        resolve();
                    } else {
                        reject(Error('create failure!'));
                    }
                });
            });
    }

    /**
     * Call the Open API to retrieve DNS Zone
     *
     * @param zoneName the DNS zone name (example.com) NB: it should _not_ be fully qualified bind - no trailing '.'
     * @returns {Promise} with zone details object
     * @private
     */
    _getDNSZone(zoneName) {
        return new Promise((resolve, reject) => {
            console.info("... retrieving zone {%s}", zoneName);

            let request = {
                method: 'GET',
                path: util.format('/config-dns/v1/zones/%s', zoneName)
            }

            this._edge.auth(request);

            this._edge.send(function (data, response) {
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
    }

    static _initZone(zoneName) {
        let zone = new Object(DNS._DEFAULT_ZONE);
        zone.zone.name = zoneName;
        zone.zone.soa.originserver = `${zoneName}.`;
        return zone;
    }
    
    /**
     * Call the OPEN API to update a DNS Zone. We will make sure that the zone token is preserved and serial is incremented
     * between updates automatically.
     *
     * @param {string} newZone dns name
     * @returns {Promise} with zone details object
     * @private
     */
    _updateDNSZone(zone) {
        return new Promise((resolve, reject) => {
            console.info("... updating zone {%s}", zone.zone.name);
            //zone.token = newZoneDetails.token;
            zone.zone.soa.serial++;
            let request = {
                method: 'POST',
                path: `/config-dns/v1/zones/${zone.zone.name}`,
                body: zone
            };

            this._edge.auth(request);

            this._edge.send(function (data, response) {
                if (response.statusCode === 201 || response.statusCode === 204) {
                    resolve(zone);
                }
                else {
                    reject(Error(`Unexpected response from DNS API: ${response.statusCode}`));
                }
            });
        });
        
    }


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
    _deleteDNSZone(zoneDetails) {
        let url = "/portal/adns/adns_delete.jsp";
        return this._luna.login()
            .then(() => {
                let postData = {
                    "action": "delete",
                    "ednsicdelete": false
                };
                postData["delzone_" + zoneDetails.zone.id] = "foo";
                return this._luna.request('POST', url, {form: postData});

            })
            .then((response) => {
                console.info("... deleting zone {zone: %s}", zoneDetails.zone.name);
                return new Promise((resolve, reject) => {
                    if (response.statusCode != 200) {
                        reject(Error('delete failure!'));
                    } else {
                        resolve(zoneDetails.zone.name);
                    }
                });
            });
    }

    /**
     * GET https://control.akamai.com/portal/adns/adns_edit.jsp?zone=bendell.ca
     * <select style="display:none;" name="adns_edns_mapping_cname_prototype">
     *     <option value="1596213">akamaiapibootcamp.com.edgekey.net</option>
     *
     * <tr class="edns_mapping_row">
     *     <td> <input type="hidden" name="adns_edns_mapping_rid_1" value="10025"/>
     *     <input type="hidden" name="adns_edns_mapping_delete_1" value="false"/>
     *     <input type="text" name="adns_edns_mapping_recordname_1" value='1' />
     *     <span name="adns_edns_mapping_recordnameerror_1" class="error-message" style="display: none;"></span>
     *     </td>
     *     <td>
     *         <select name="adns_edns_mapping_cname_1">
     *             <option value="1251434" selected='selected'
     *             >
     *             bendell.ca.edgekey.net
     *             </option>
     *
     */
    _getZAMEntries(zone) {
    }

    /**
     * POST /portal/adns/adns_edit.jsp
     *      action=edit&zone=bendell.ca&adnsZone=bendell.ca&adnsType=primary&adnsNotify=no&adnsTsigAlgorithm=HMAC-MD5.SIG-ALG.REG.INT&adnsTsigKeyName=&adnsTsigKey=&adnsTsig=no&adnsNS=&adnsNS=&adnsNS=&adnsNS=&adns_cname=&adns_tlDomainAnswerType=1&adns_cname_ttl=300&adns_allow_edns_mapping=on&adns_edns_mapping_rid_prototype=&adns_edns_mapping_delete_prototype=false&adns_edns_mapping_recordname_prototype=&adns_edns_mapping_cname_prototype=1596213&adns_edns_mapping_rid_1=10025&adns_edns_mapping_delete_1=false&adns_edns_mapping_recordname_1=1&adns_edns_mapping_cname_1=1251434&adns_edns_mapping_rid_2=10026&adns_edns_mapping_delete_2=false&adns_edns_mapping_recordname_2=2&adns_edns_mapping_cname_2=1251434&adns_edns_mapping_rid_3=10024&adns_edns_mapping_delete_3=false&adns_edns_mapping_recordname_3=3&adns_edns_mapping_cname_3=1251434&adns_edns_mapping_rid_4=10027&adns_edns_mapping_delete_4=false&adns_edns_mapping_recordname_4=4&adns_edns_mapping_cname_4=1251434&adns_edns_mapping_rid_5=13917&adns_edns_mapping_delete_5=false&adns_edns_mapping_recordname_5=5&adns_edns_mapping_cname_5=1251434&adns_edns_mapping_rid_6=5871&adns_edns_mapping_delete_6=false&adns_edns_mapping_recordname_6=www&adns_edns_mapping_cname_6=1251434&adns_edns_mapping_rid_7=5872&adns_edns_mapping_delete_7=false&adns_edns_mapping_recordname_7=&adns_edns_mapping_cname_7=1251434&adns_edns_mapping_rid_8=&adns_edns_mapping_delete_8=false&adns_edns_mapping_recordname_8=6&adns_edns_mapping_cname_8=1251434&adns_edns_mapping_record_count=8
     *
     */
    _updateZAMZone(zone, zamEntries = []) {
        let formData = {
            adns_edns_mapping_rid_8: null,
            adns_edns_mapping_delete_8: false,
            adns_edns_mapping_recordname_8: "www",
            adns_edns_mapping_cname_8: 1251434,
            adns_edns_mapping_record_count: 8
        }
    }

    /**
     * Create a new primary DNZ zone. We will populate with the default SOA record and NS values.
     *
     * @returns {Promise} zoneDetails from a successful deployment
     */
    create() {
        //TODO check for pre-existence
        return this._createDNSZone(this._zone)
            .then(() => this._updateDNSZone(DNS._initZone(this._zone)));
    }

    /**
     * Retrieve the entire zone file
     *
     * @returns {Promise} zoneDetails. {} if the zone doesn't exist
     */
    retrieve() {
        //TODO do a zonecheck
        return this._getDNSZone(this._zone);
    }

    /**
     * Delete the entire zone. Careful! this will impact production immediately!
     *
     * @returns {Promise} zone name (example.com) if successful
     */
    delete() {
        //TODO do a zonecheck
        return this._getDNSZone(this._zone)
            .then((zoneDetails) => this._deleteDNSZone(zoneDetails));
    }

    /**
     * Retrieve a record from the zone. Use recordName = null for apex zone (applicable to A, AAAA, SRV, and MX records).
     * Use recordName = "*" for a catchall value.
     *
     * @param {string} recordName the record name. Should _not_ be qualified. Eg: "www"
     * @param {string} type the DNS record type. case does not matter
     * @returns {Promise} zoneDetails after the record has been updated
     */
    getRecord(recordName = '', type = 'NS') {
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
    }

    /**
     * Add additional records (does not remove or replace pre-existing). NB: Use the appropriate field values for each record type.
     * Default values of `ttl=30` and `active=true` will be used.
     *
     * As a shortcut for A/AAAA/CNAME you simply specify the target value instead of a record object
     *
     * @param {string} recordName recordName the record name. Should _not_ be qualified. Eg: "www"
     * @param {Object[]} records or {string} records to be added
     * @param {string} type type the DNS record type. case does not matter
     * @returns {Promise} zoneDetails after the record has been updated
     */
    addRecord(recordName, records = [{target: 'www.example.com.', ttl: 30, active: true}], type = 'CNAME') {
        //TODO do a zonecheck
        if (!recordName || recordName === "")
            recordName = null;

        if (typeof records === 'string')
            records = [{target: records}];

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
    }

    /**
     * Like Add, Updates existing records (or add if missing). NB: Use the appropriate field values for each record type.
     * Default values of `ttl=30` and `active=true` will be used.
     *
     * As a shortcut for A/AAAA/CNAME you simply specify the target value instead of a record object
     *
     * @param {string} recordName the record name. Should _not_ be qualified. Eg: "www"
     * @param {Object[]} records  (or {string}) to be added
     * @param {string} type the DNS record type. case does not matter
     * @returns {Promise} zoneDetails after the record has been updated
     */

    updateRecord(recordName, records = [{target: "www.example.com", ttl: 30, active: true}], type = "CNAME") {
        //TODO do a zonecheck
        if (!recordName || recordName === "")
            recordName = null;

        if (typeof records === 'string')
            records = [{target: records}];

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
    }

    /**
     * Updates the ZAM record with the specified target CNAME value (usually edgekey.net)
     *
     * ZAM (Zone Apex Mapping) removes the CNAME chain by using EDNS0 and return the IP instead of the usual foo.edgekey.net
     *
     * @param {string} recordName
     * @param {string} targetCname
     */
    updateZAMRecord(recordName, targetCname) {
        //todo
    }

    /**
     * Deletes ZAM (Zone Apex Mapping) record
     * @param {string} recordName
     * @param {string} targetCname
     */
    removeZAMRecord(recordName, targetCname) {
        //TODO
    }

    /**
     * Delete a single DNS record from the zone Zone.
     *
     * @param {string} recordName the record name. Should _not_ be qualified. Eg: "www"
     * @param {string} type the DNS record type. case does not matter
     * @returns {Promise} zoneDetails after the record has been updated
     */
    deleteRecord(recordName, type = "CNAME") {
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
    }
}

DNS._DEFAULT_ZONE = _DEFAULT_ZONE;

//module.exports = DNS;
