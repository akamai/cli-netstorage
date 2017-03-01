#AkamaiWeb SDK


## Overview
This is a set of nodejs libraries use to wrap Akamai's {OPEN} APIs to help simplify the operations and interactions
with Akamai for common configuration tasks.  This kit can be used in different ways:
* [Include the libraries](#library) in your own Node.js applications
* [Use the command line utility](#updateWebSite) to interact with the library
* Leverage the gulp integration to integrate with your Continuous Integration/Continuous Deployment toolset

## Functionality (version 0.0.1)
The initial version of the ConfigKit provides the following functionality:
* Create a new version from locally stored rules
* Copy a configuration between properties
 * Currently does not support advanced metadata
* Create or clone a new property
 * Accepts cpcode, contract ID and hostnames
* Delete a property
* Activate and deactivate property versions to production, staging or both

## updateWebSite
This script wraps all of the functionality from the [library](#library) into a command line utility which can be used to support the following use cases:
* [Create property](#create)
* [Activate or deactivate](#activate)
* [Update a property](#update)
* [Retrieve property rules](#retrieve)
* [Copy a property's config to another property](#copy)

## Library

Start with creating the WebSite object:

```
let WebSite = require('akamaiwebkit').WebSite;
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
