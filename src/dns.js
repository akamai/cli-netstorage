let Luna = require('./luna');
let EdgeGrid = require('edgegrid');

let DNS = function(config = {path:"~/.edgerc", section: "luna"}, username, password) {
    this._luna = new Luna(config, username, password);
    this._edge = new EdgeGrid();
};


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

// POST https://control.akamai.com/portal/adns/adns_add.jsp
//      action=add&childZoneOverride=false&param_acg_to_add=$ACCOUNT&adnsType=primary&adnsNotify=yes&adnsTsigAlgorithm=HMAC-MD5.SIG-ALG.REG.INT&adnsTsigKeyName=&adnsTsigKey=&adnsTsig=no&adnsNS=&adnsNS=&adnsNS=&adnsNS4=&adnsNewZones=$ZONES

DNS.prototype._createDNSZone = function(lunaAuth, zoneName) {
    let url = "/portal/adns/adns_add.jsp";
    return this._luna(lunaAuth)
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
                    reject(Error('login failure!'));
                } else {
                    resolve();
                }
            });
        });
};

DNS.prototype._updateDNSZone = function(zoneName, zoneDetails = {}) {
    zoneDetails = zoneDetails || {
            "token": "new",
            "zone": {
                "name": zoneName,
                "soa": {
                    "contact": "hostmaster.akamai.com.",
                    "expire": 604800,
                    "minimum": 180,
                    "originserver": "a1-49.akam.net",
                    "refresh": 900,
                    "retry": 300,
                    "serial": 12345,
                    "ttl": 900
                },
                "ns": [
                    {
                        "active": true,
                        "name": "",
                        "target": "use4.akam.net.",
                        "ttl": 3600
                    },
                    {
                        "active": true,
                        "name": "",
                        "target": "use3.akam.net.",
                        "ttl": 3600
                    }
                ]
            }
        };

    //TODO post it!

};

DNS.prototype.createZone = function(zone) {
    return this._createDNSZone(zone)
        .then(() => this._updateDNSZone(zone))
    //TODO
};


DNS.prototype.getZone = function(zone) {
    //TODO
    let url = util.format("/config-dns/v1/zones/%s", zone);
    _edge.auth({
        url: url
    });
    _edge.send((data, response) => {
        console.log(data);
    })
};

DNS.prototype.getRecord = function(zone, recordName = "", type="NS") {
    //TODO
};

DNS.prototype.updateRecord = function(zone, recordName, value, type="CNAME") {
    //TODO
};

DNS.prototype.deleteRecord = function(zone, recordName, type="CNAME") {
//TODO
};

module.exports = DNS;