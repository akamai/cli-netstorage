#AkamaiWeb SDK

## Overview
This is a set of nodejs libraries use to wrap Akamai's {OPEN} APIs to help simplify the operations and interactions
with Akamai for common tasks. There are 4 core libraries:

* `website.js` - manage changes for rules against your website configuration. Specifically perform updates for your
Web Performance products (DSD, DSA, Ion Standard, Ion Premier)
* `tls.js` - manage TLS certificates that are used by the various website configurations
* `dns.js` - manage the DNS zone for FastDNS customers
* `apiclient.js` - manage the API keys used for the above SDKs

These libraries are written in ES6, use babel if you require ES5 environments

Grunt tasks are available that wrap these libraries for common build activities.

## Getting started: `website.js`

Start with creating the WebSite object:

```
let WebSite = require('AkamaiWeb').WebSite;
let exampleDotCom = new WebSite();

exampleDotCom.copy("qa-www.example.com", "sage-www.example.com")
  .then(data -> { console.log("Rules copied accross Akamai configurations!")});
```

This will use the [default] credentials in the ~/.edgerc file. Alternate object creations include:

Specifying to use the `[continuous_delivery]` section in the file `/cyberark/edgerc`

```
let exampleDotCom = new WebSite({path:"/cyberark/edgerc", section: "[continuous_delivery]"});
```

You can alternatively specify the `clientToken`, `clientSecret`, `accessToken`, and `host` as properties of the
constructor object

```
let exampleDotCom = new WebSite({clientToken:"a1b2", clientSecret: "c3d4", accessToken: "e5f6", host: "g7h8.luna.akamaiapis.net"});
```
