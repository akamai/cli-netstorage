#AkamaiConfigKit


## Overview
This is a set of nodejs libraries use to wrap Akamai's {OPEN} APIs to help simplify the operations and interactions
with Akamai for common configuration tasks.  This kit can be used in different ways:
* [Use the command line utility](#updateWebSite) to interact with the library
* [Include the library](#library) in your own Node.js applications
* Leverage the [gulp integration](#gulp) to integrate with your Continuous Integration/Continuous Deployment toolset

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
* [Clone property](#clone)
* [Retrieve property rules](#retrieve)
* [Update a property](#update)
* [Copy a property's config to another property](#copy)
* [Activate or deactivate](#activate)

### Create
Creating a new property requires only a single parameter, the target property.  

```bash
% updateWebSite --create new.property.name
```

The flags of interest for create are:

```
  --cpcode: The CPCode to use for the new property.  Default is to create a new CPCode.
  --contractid: The contractId to place the new property in.  Defaults to the parent group for the account.
  --name: The name for the new property
  --hostnames: Comma-delimited list of new hostnames to use for the property
```

### Clone
Cloning a configuration to a new property is also simple, with command line flags to adjust behavior. 

```bash
% updateWebSite --create new.property.name --clone original.property.name
```

The flags of interest for create are:
```
--cpcode: The CPCode to use for the new property.  Default is to use the CPCode for the original config.
--contractid: The contractId to place the new property in.  Defaults to the same group as the original config.
--name: The name for the new property
--hostnames: Comma-delimited list of new hostnames to use for the property
--nocopy: Do not copy the edge hostnames to the new property
```

### Retrieve
This function retrieves the specified ruleset, either to STDOUT or the --outfile flag

```bash
% updateWebSite new.property.name
```

The flags of interest for create are:
```
--version VERSION - specifies the version to retrieve for the specified property
--outfile FILE - stores the results to a file.  Default is to use STDOUT
```

### Update
Update the current property version with the rules from a local file.

```bash
% updateWebSite new.property.name --srcfile myfile
```

The flags of interest for update are:
```
--srcfile <FILE_WITH_RULES>
```

### Copy
Copy the configuration from one property to another.  For instance, you may use this if you have a staging property and a production property and want to migrate the new config between them.  Currently this does not handle advanced metadata.

```bash
% updateWebSite source.property.name --dest dest.property.name
```

### Activate
Activate the specified property version on staging, production or both.

```bash
% updateWebSite my.property.com --activate BOTH
```



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
