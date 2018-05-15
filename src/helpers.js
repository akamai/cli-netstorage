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
var crypto = require('crypto'),
  moment = require('moment'),
  url = require('url'),
  ini = require('ini'),
  fs = require('fs'),
  logger = require('./logger');

module.exports = {
  createTimestamp: function() {
    return moment().utc().unix();
  },

  createNonce: function() {
    return crypto.randomBytes(10).toString('hex');
  },

  contentHash: function(request, maxBody) {
    var contentHash = '',
      preparedBody = request.body || '';

    if (typeof preparedBody === 'object') {
      var postDataNew = '',
        key;

      logger.info('Body content is type Object, transforming to POST data');

      for (key in preparedBody) {
        postDataNew += key + '=' + encodeURIComponent(JSON.stringify(preparedBody[key])) + '&';
      }

      // Strip trailing ampersand
      postDataNew = postDataNew.replace(/&+$/, '');

      preparedBody = postDataNew;
      request.body = preparedBody; // Is this required or being used?
    }

    logger.info('Body is \"' + preparedBody + '\"');
    logger.debug('PREPARED BODY LENGTH', preparedBody.length);

    if (request.method === 'POST' && preparedBody.length > 0) {
      logger.info('Signing content: \"' + preparedBody + '\"');

      // If body data is too large, cut down to max-body size
      if (preparedBody.length > maxBody) {
        logger.warn('Data length (' + preparedBody.length + ') is larger than maximum ' + maxBody);
        preparedBody = preparedBody.substring(0, maxBody);
        logger.info('Body truncated. New value \"' + preparedBody + '\"');
      }

      logger.debug('PREPARED BODY', preparedBody);

      contentHash = this.base64Sha256(preparedBody);
      logger.info('Content hash is \"' + contentHash + '\"');
    }

    return contentHash;
  },

  dataToSign: function(authData, path, action, timestamp) {
    dataToSign = [
      authData,
      path + '\n',
      'x-akamai-acs-action:' + action + '\n',
    ];

    dataToSign = dataToSign.join('').toString();

    logger.info('Data to sign: "' + dataToSign + '" \n');

    return dataToSign;
  },

  extend: function(a, b) {
    var key;

    for (key in b) {
      if (!a.hasOwnProperty(key)) {
        a[key] = b[key];
      }
    }

    return a;
  },

  readConfigFile(filename, section) {
    let result;
    try {
      result = fs.readFileSync(filename);
    } catch (error) {
      throw new Error('\n\n \tNo configuration file found.  \n\tRun akamai netstorage setup to configure credentials\n\n');
    }
    let configObject = ini.parse(result.toString());
    return (configObject[section]);
  },

  isRedirect: function(statusCode) {
    return [
      300, 301, 302, 303, 307,
    ].indexOf(statusCode) !== -1;
  },

  base64Sha256: function(data) {
    var shasum = crypto.createHash('sha256').update(data);

    return shasum.digest('base64');
  },

  base64HmacSha256: function(data, key) {
    var encrypt = crypto.createHmac('sha256', key);

    encrypt.update(data);

    return encrypt.digest('base64');
  },

  /**
   * Creates a String containing a tab delimited set of headers.
   * @param  {Object} headers Object containing the headers to add to the set.
   * @return {String}         String containing a tab delimited set of headers.
   */
  canonicalizeHeaders: function(headers) {
    var formattedHeaders = [],
      key;

    for (key in headers) {
      formattedHeaders.push(key.toLowerCase() + ':' + headers[key].trim().replace(/\s+/g, ' '));
    }

    return formattedHeaders.join('\t');
  },

  signRequest: function(authData, key, path, action, timestamp) {
    return this.base64HmacSha256(this.dataToSign(authData, path, action, timestamp), key);
  },
};
