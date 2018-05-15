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

var fs = require('fs');
helpers = require('./helpers');

function readEnv(section) {
  // If any are set, we're committed
  var envConf = {};
  var envPrefix = 'AKAMAI_NS_' + section.toUpperCase();
  var tokens =
    ['key', 'id', 'group', 'host'];

  tokens.forEach(function(token) {
    var envcheck = envPrefix + '_' + token.toUpperCase();
    if (process.env[envcheck]) {
      envConf[token] = process.env[envcheck];
    }
  });

  if (Object.keys(envConf).length > 0) {
    console.log('Using configuration from environment variables');
    return envConf;
  }
  return;
}

module.exports = function(path, conf) {
  var confSection = conf || 'default';
  var envConf = readEnv(confSection);
  if (envConf && Object.keys(envConf).length > 0) {
    return envConf;
  }

  var config = helpers.readConfigFile(path, confSection);

  if (!config) {
    throw new Error('An error occurred parsing the .netstorage/auth file. You probably specified an invalid section name.');
  }

  return (config);
};
