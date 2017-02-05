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

/**
 * TLS
 *
 * @author Colin Bendell <colinb@akamai.com>
 */

let Luna = require('./luna');
let EdgeGrid = require('edgegrid');
let util = require('util');
let untildify = require('untildify');

let TLS = function(zoneName, config = {path:"~/.edgerc", lunasection: "luna", section: "default"}) {
    this._zone = zoneName;
    this._luna = new Luna({path: config.path, section: config.lunasection});
    this._edge = new EdgeGrid({path: untildify(config.path), section: config.section});
};

// GET Entitlements
//

// Get Certificate

// Create New Certificate
//  a) add to existing (find *.name)
//  b) create new
//  c) find an edgekey.net
//  d) create a new edgekey.net
//  e) find deployed site, add dcv test


// Rotate certificate

// Delete certificate



export default class TLS {
    constructor() {}
    provisionCertificate(hostname, details={}, options={preferSNI:true, type: "DV"}) {
    };

    deprovisionCertificate(hostname, options={}) {
    }
    addSAN(hostname) {}
    removeSAN(hostname) {}
    getEdgeKey(hostname, options={createIfMissing: true}) {}
    getHttpPublicKeyPins(hostname) {}

};
