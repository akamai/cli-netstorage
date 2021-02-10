// Copyright 2014 Akamai Technologies, Inc. All Rights Reserved
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
const helpers = require('./helpers');
const logger = require('./logger');
const url = require('url');

function makeAuthHeader(key, authData, path, action, timestamp) {
  var authSign = helpers.signRequest(authData, key, path, action, timestamp);

  logger.info('Signed authorization header: ' + authSign + '\n');

  return authSign;
}

function makeAuthData(request, key, id, group, timestamp, nonce) {
  const authData = ['5', '0.0.0.0', '0.0.0.0', timestamp, nonce, id].join(', ');

  return authData;
}

function makeURL(host, path, queryStringObj) {
  var parsed = url.parse('http://' + host + path, true);
  if (queryStringObj) parsed.query = queryStringObj;
  return url.format(parsed);
}

module.exports = {
  generateAuth: function(request, key, id, group, path, host, action, timestamp) {
    timestamp = timestamp || helpers.createTimestamp();
    const nonce = helpers.createNonce();

    if (!request.hasOwnProperty('headers')) {
      request.headers = {};
    }

    request.url = makeURL(host, path);
    const authData = makeAuthData(request, key, id, group, timestamp, nonce);
    request.headers['X-Akamai-ACS-Auth-Data'] = authData;
    request.headers['X-Akamai-ACS-Auth-Sign'] = makeAuthHeader(key, authData, path, action, timestamp);
    request.headers['X-Akamai-ACS-Action'] = action;
    return request;
  },
};
