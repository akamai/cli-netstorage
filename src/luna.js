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

"use strict"

/**
 * Luna login wrapper to support direct login of functions that aren't available through {OPEN} APIs
 *
 * @author Colin Bendell <colinb@akamai.com>
 */

let httpRequest = require('request').defaults({jar: true, strictSSL: false}),
    util = require('util'),
    edgerc = require('edgegrid/src/edgerc'),
    untildify = require('untildify');

class Luna {

    constructor(config = {path: "~/.edgerc", section: "luna"}, username, password) {
        this.options = {
            host: "https://control.akamai.com",
            username: username,
            password: password,
            cookieJar: httpRequest.jar()
        };

        if (!username || !password) {
            this.options = Luna._extend(this.options, Luna._loadconfig(config));
        }
    }

    /**
     * Load username and password from config files
     * @param config
     */
    static _loadconfig(config) {
        if (!config.path) {
            throw new Error('No edgerc path');
        }

        return edgerc(untildify(config.path), config.section);
    }

    /**
     * Luna utility functions
     */

    static _extend(target) {
        let sources = [].slice.call(arguments, 1);
        sources.forEach(function (source) {
            for (let prop in source) {
                target[prop] = source[prop];
            }
        });
        return target;
    }



// curl 'https://control.akamai.com/EdgeAuth/asyncUserLogin'
// -H 'Origin: https://control.akamai.com' -H 'Accept-Encoding: gzip, deflate, br'
// -H 'Accept-Language: en-US,en;q=0.8' -H 'Upgrade-Insecure-Requests: 1'
// -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36' -H 'Content-Type: application/x-www-form-urlencoded'
// -H 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
// -H 'Cache-Control: no-cache' -H 'Referer: https://control.akamai.com/EdgeAuth/login.jsp'
// -H 'Cookie: JSESSIONID=A840585856ABFA24B39EC93AC0CB302E.p3-tomapp07; AKALOCALE=ZW5fVVN+TWJReEJIWUVVTmNMc0lQK01BS3pPSjRHK1pMYlNoSDdMN0ZZZEhlRVF0eit6VElWYXZ5Zy9ybnJ6L056ZWw2bEFJcTQ1Zmc9'
// -H 'Connection: keep-alive'
// --data 'TARGET_URL=Y29udHJvbC5ha2FtYWkuY29tL2hvbWVuZy92aWV3L21haW5BS0FQTVplRzBDZzlxbTl4Z0pBMzE4VWZRc0UrV09iL0w2cGwrZ2J5SldyNEp1bW1pM243NXpVL01NSVlLV01VaDZmNzE0QVZCUnc9&username=advocate2&password=password1234&login=Log+In'


    /**
     * Get the authorization session. Username and password are sent as form data. TargetUrl token required to complete
     * the login process. This is, of course, intended for a human to interact with in a webpage so thees two steps are hidden
     * from the user normally.
     *
     * @param lunatoken
     * @returns {Promise}
     * @private
     */
    _getLunaSession() {
        let postData = {
            'TARGET_URL': "Y29udHJvbC5ha2FtYWkuY29tL2hvbWVuZy92aWV3L21haW4",
            'username': this.options.username,
            'password': this.options.password,
            'login': 'Log In'
        };

        let url = "/EdgeAuth/asyncUserLogin";
        if (this.options.cookieJar.getCookies(this.options.host + url).length > 2) {
            return Promise.resolve();
        }
        return this.request('POST', url, {form: postData})
            .then((response) => {
                console.info("... logging into luna {user: %s}", this.options.username);
                return new Promise((resolve, reject) => {
                    if (response.statusCode != 302 || response.headers['location'] !== 'https://control.akamai.com/homeng/view/main') {
                        reject(Error('login failure!'));
                    } else {
                        resolve();
                    }
                });
            });
    };

    /**
     * Log into Luna with username/password. After successfull login, we can perform usual activities.
     *
     * @returns {Promise}
     */
    login() {
        return this._getLunaSession();
    }

    /**
     * Request a resource (html or api) through Luna credentials. This is often needed when equivelant functionality is
     * not yet available through the standard {OPEN} apis.
     *
     * @param method {string} HTTP verbs (GET, POST, PUT, DELETE...)
     * @param url {string} either relative or fully qualified url
     * @param options {Object} an associated array of options to be passed through to the Request
     * @returns {Promise}
     */
    request(method, url, options = {}) {
        if (!url.startsWith("https://")) {
            if (!url.startsWith("/")) url = "/" + url;
            if (this.options.host.endsWith("/")) url = url.substr(1);
            url = this.options.host + url;
        }
        return this.login()
            .then(() => {
                new Promise((resolve, reject) => {
                    //    followAllRedirects: true,
                    options = Luna._extend({}, options, {
                        method: method,
                        uri: url,
                        jar: this.options.cookieJar,
                        gzip: true,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.95 Safari/537.36',
                            'Referer': 'https://control.akamai.com/EdgeAuth/logindirect.jsp',
                            'Origin': 'https://control.akamai.com',
                            'Accept': '*/*'
                        }
                    });
                    httpRequest(options, function (error, response) {
                        if (error)
                            reject(Error('problem with httpRequest: ' + error.message));
                        else
                            resolve(response);
                    });

                });
            });
    };
}

module.exports = Luna;
