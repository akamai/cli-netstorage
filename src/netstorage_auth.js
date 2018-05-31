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
const request = require('request');
const url = require('url');
const auth = require('./auth');
const netStorageRC = require('./netstorage_rc');
const helpers = require('./helpers');
const logger = require('./logger');

var NetStorageAuth = function(key, id, group, host, debug) {
  request.debug = process.env.EG_VERBOSE || false;
  if (typeof arguments[0] === 'object') {
    request.debug = request.debug || arguments[0].debug ? true : false;
    this._setConfigFromObj(arguments[0]);
  } else {
    request.debug = request.debug || debug ? true : false;
    this._setConfigFromStrings(key, id, group, host, debug);
  }
};

/**
 * Builds the request using the properties of the local config Object.
 *
 * @param  {Object} req The request Object. Can optionally contain a
 *                      'headersToSign' property: An ordered list header names
 *                      that will be included in the signature. This will be
 *                      provided by specific APIs.
 */
NetStorageAuth.prototype.auth = function(req) {
  req = helpers.extend(req, {
    url: this.config.host + req.path,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    followRedirect: false,
    body: '',
  });

  this.request = auth.generateAuth(
    req,
    this.config.key,
    this.config.id,
    this.config.group,
    req.path,
    this.config.host,
    req.action
  );
  return this;
};

NetStorageAuth.prototype.send = function(callback) {
  request(this.request, function(error, response, body) {
    if (error) {
      callback(error);
      return;
    }
    if (helpers.isRedirect(response.statusCode)) {
      this._handleRedirect(response, callback);
      return;
    }
    callback(null, response, body);
  }.bind(this));

  return this;
};

NetStorageAuth.prototype._handleRedirect = function(resp, callback) {
  var parsedUrl = url.parse(resp.headers['location']);

  resp.headers['authorization'] = undefined;
  this.request.url = undefined;
  this.request.path = parsedUrl.path;

  this.auth(this.request);
  this.send(callback);
};

/**
 * Creates a config object from a set of parameters.
 *
 * @param {String} key
 * @param {String} id
 * @param {String} group
 * @param {String} host
 */
NetStorageAuth.prototype._setConfigFromStrings = function(key, id, group, host) {
  if (!validatedArgs([key, id, group, host])) {
    throw new Error('Insufficient Akamai credentials');
  }

  this.config = {
    key: key,
    id: id,
    group: group,
    host: host,
  };
};

function validatedArgs(args) {
  const expected = [
    'key', 'id', 'group', 'host',
  ];
  let valid = true;

  expected.forEach(function(arg, i) {
    if (!args[i]) {
      if (process.env.EDGEGRID_ENV !== 'test') {
        logger.error('No defined ' + arg);
      }

      valid = false;
    }
  });

  return valid;
}

/**
 * Creates a config     Object from the section of a defined .edgerc file.
 *
 * @param {Object} obj  An Object containing a path and section property that
 *                      define the .edgerc section to use to create the Object.
 */
NetStorageAuth.prototype._setConfigFromObj = function(obj) {
  if (!obj.path) {
    if (process.env.EDGEGRID_ENV !== 'test') {
      logger.error('No .netstorage path');
    }

    throw new Error('No netstorage auth path');
  }

  this.config = netStorageRC(obj.path, obj.section);
};

module.exports = NetStorageAuth;
