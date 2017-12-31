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
'use strict';

let untildify = require('untildify');
let inquirer = require('inquirer')
let md5 = require('md5');
let fs = require('fs');
let tmpDir = require('os').tmpdir();
let ini = require('ini');
let merge = require ('merge');
let path = require ('path')
let NetStorageAuth = require ('../src/netstorage_auth');
let moment = require('moment')

function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

function createConfigDir(config) {
    return new Promise(function(resolve, reject) {
        let createDir = path.dirname(config);
        fs.mkdir(createDir, function (error) {
             if (error && error.code != "EEXIST") {
                reject(error)
            } else {
                resolve()
            }
          })
    })
}

function readConfigFile(filename, section) {
    return new Promise(function(resolve, reject) {
        fs.readFile(filename, section, function (error, result) {
            if (error) {
                // It's probably just empty
                resolve()
            } else {
                let configObject = ini.parse(result.toString())
                if (section) {
                    resolve(configObject[section])
                } else {
                    resolve(configObject)
                }
                
            }
          })
    })
}

function writeConfigFile(filename, contents) {
    return new Promise(function(resolve, reject) {
        fs.writeFile(filename, contents, function (error, result) {
            if (error) {
                reject(error)
            } else {
              resolve(result);
            }
          })
    })
}

//export default class WebSite {
class NetStorage {

    constructor(auth = { path: "~/.akamai-cli/.netstorage/auth", section: "default", debug: false, default: true}) {

        if (auth.key && auth.id && auth.group && auth.host)
            this._nsClient = new NetStorageAuth(auth.key, auth.id, auth.group, auth.host, auth.debug);
        else
            this._nsClient = new NetStorageAuth({
                path: untildify(auth.path),
                section: auth.section,
                debug: auth.debug
            });
    }
        
    
    setup(options) {
        let questions = []
        let list = ["key","id","group","host","cpcode"]
        let currentConfig
        return new Promise((resolve, reject) => {
            for (let field of list) {
                if (!options[field]) {
                    let question = { 
                        type: "input",
                        name: field,
                        message: "Please input the following information: " + field +": ",
                    }
                    questions.push(question)
                }
            }
            return resolve()
        })
        .then(() => {
            return readConfigFile(options.config)
        })
        .then(config => {
            currentConfig = config || {}
            return createConfigDir(options.config)
        })
        .then(() => {
            return inquirer.prompt(questions)
        })
        .then(answers => {
                options = merge(options, answers)
                let filename = options.config
                let section = options.section
                let config = currentConfig
                config[section] = {}
                for (let field of list) {
                    config[section][field] = options[field]
                }
                return writeConfigFile(filename, ini.stringify(config, {whitespace:true}))
        })
    }
    diskusage(options) {
        return this.parseFileCpCode(options)
        .then(options => {
            return new Promise ((resolve, reject) => {
                console.info("Getting disk usage information")
                let request = {
                    action: "version=1&action=du&format=xml",
                    path: "/" + options.cpcode
                }
                return resolve(request)
            })
        })
        .then(request => {
            return this.makeRequest(request)
        })
    }
    mtime(options) {
        return this.parseFileCpCode(options)
        .then(options => {
            return new Promise ((resolve, reject) => {
                
                console.info("Updating modification time for file")
                let request = {
                    action: "version=1&action=mtime&mtime=" + moment().utc().unix(),
                    method: "POST",
                    path: "/" + options.cpcode + "/" + options.file,
                }
                resolve(request);
            })
        })
        .then(request => {
            return this.makeRequest(request)
        })
    }
    parseFileCpCode(options){
        return new Promise ((resolve, reject) => {
            
            if (!options.cpcode && options.file) {
                var re = /\/(\d+)\/(.*)$/i;
                var match = options.file.match(re);
                if (match && match[1]) {
                    options.cpcode = match[1];
                    options.file = match[2];
                    return resolve (options);
                }
            }
            options.cpcode = options.cpcode || this._nsClient.config.cpcode
            if (!options.cpcode) {      
                return reject("No CPCode found in environment or config file.")
            }
            resolve (options);
        })
    }

    stat(options) {
        return this.parseFileCpCode(options)
        .then(options => {
        
            return new Promise ((resolve, reject) => {
                
                console.info("Getting stat for file")
                let request = {
                    action: "version=1&action=stat&format=xml",
                    path: "/" + options.cpcode + "/" + options.file
                }
                resolve(request)
            })
            .then(request => {
                return this.makeRequest(request)
            })
        })
    }
    makeRequest(request) {
        return new Promise ((resolve, reject) => {
            console.log(request)
            this._nsClient.auth(request)
            this._nsClient.send((data, response) => {
                console.log(response.statusCode);
                if (response.statusCode != 200) {
                    reject("Unable to complete action.  Status code " + response.statusCode)
                }
                console.log(response.body)
                resolve()
            })
        })
    }

}
module.exports = NetStorage;
/*
Id (Key-name): kirsten
Key: NUq2a5N8C14uWCs8k3aq7l003J40ymIS7s45v5Jn9LHhl5QRIz
Storage group name: kirsten
Connection Hostname: kirsten-nsu.akamaihd.net
*/