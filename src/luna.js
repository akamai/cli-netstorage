/**
 * Module dependencies.
 */

let request = require('request').defaults({jar: true, strictSSL: false}),
    util = require('util'),
    edgerc = require('edgegrid/src/edgerc'),
    untildify = require('untildify');


/**
 * Luna utility functions
 */

function extend(target) {
    let sources = [].slice.call(arguments, 1);
    sources.forEach(function (source) {
        for (let prop in source) {
            target[prop] = source[prop];
        }
    });
    return target;
}

/**
 * Load username and password from config files
 * @param config
 */
function loadconfig(config) {
    if (!config.path) {
        throw new Error('No edgerc path');
    }

    return edgerc(untildify(config.path), config.section);
}

/**
 *
 * @param config
 * @param username
 * @param password
 * @constructor
 */
let Luna = function(config = {path:"~/.edgerc", section: "luna"}, username, password) {
    this.options = {
        host: "https://control.akamai.com",
        username: username,
        password: password,
        cookieJar: request.jar()
    };

    if (!username || !password) {
        this.options = extend(this.options, loadconfig(config));
    }
};

/**
 *
 * @param method
 * @param url
 * @param options
 * @returns {Promise}
 */
Luna.prototype.request = function(method, url, options = {}) {
    if (!url.startsWith("https://")) {
        if (!url.startsWith("/")) url = "/" + url;
        if (this.options.host.endsWith("/")) url = url.substr(1);
        url = this.options.host + url;
    }
    return new Promise((resolve, reject) => {
        //    followAllRedirects: true,
        options = extend({}, options, {
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
        request(options, function (error, response) {
            if (error)
                reject(Error('problem with request: ' + error.message));
            else
                resolve(response);
        });
    });
};

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
 * Step 1: get TARGET_URL token required for login. This initializes the java session. It shows the age of the Luna
 * product by the need to create an intermediate page for login.
 *
 * @returns {Promise}
 * @private
 */
Luna.prototype._getLunaToken = function() {
    let url = "/EdgeAuth/login.jsp";
    if (this.options.cookieJar.getCookies(this.options.host + url).length > 0) {
        return new Promise((resolve, reject) => resolve());
    }
    return this.request('GET', url)
        .then((response) => {
            console.info("... retrieving luna session cookies");
            return p = new Promise((resolve, reject) => {
                if (response.statusCode != 200) {
                    reject(Error('cannot contact https://control.akamai.com'));
                } else {
                    let matches = response.body.match(/name=["']?TARGET_URL["']?.*value=["']?([A-Za-z0-9]+).*/);
                    if (!matches) {
                        reject(Error('cannot find <input name="TARGET_URL" value="" > in the login form'));
                    } else {
                        resolve(matches[1]);
                    }
                }
            });
        });
};

/**
 * Step 2: get the authorization session. Username and password are sent as form data. TargetUrl token required to complete
 * the login process. This is, of course, intended for a human to interact with in a webpage so thees two steps are hidden
 * from the user normally.
 *
 * @param lunatoken
 * @returns {Promise}
 * @private
 */
Luna.prototype._getLunaSession = function(lunatoken) {
    let postData = {
        'TARGET_URL' : lunatoken,
        'username': this.options.username,
        'password': this.options.password,
        'login' : 'Log In'
    };

    let url = "/EdgeAuth/asyncUserLogin";
    if (this.options.cookieJar.getCookies(this.options.host + url).length > 2) {
        return new Promise(resolve => resolve());
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
Luna.prototype.login = function() {
    console.info("[Luna Login]");
    return this._getLunaToken()
        .then((lunatoken) => this._getLunaSession(lunatoken));
};

module.exports = Luna;