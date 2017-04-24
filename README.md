# NOTE THAT THIS IS A PREVIEW ONLY OF AN UPCOMING PRODUCT. 

----

# AkamaiConfigKit


## Overview
This is a set of nodejs libraries use to wrap Akamai's {OPEN} APIs to help simplify the operations and interactions
with Akamai for common configuration tasks.  This kit can be used in different ways:
* Just want a no-fuss tool? [Use the command line utility](#updateWebSite) to interact with the library
* Want to integrate into your own Node.js application? [Include the library](#library) 
* Leverage the [gulp integration](#gulp) to integrate with your Continuous Integration/Continuous Deployment toolset

## Setup
In order to use this configuration, you need to:
* Setup your credential files with a 'papi' section as described in the [authorization](https://developer.akamai.com/introduction/Prov_Creds.html) and [credentials](https://developer.akamai.com/introduction/Conf_Client.html) sections of the getting started guide on the developer portal
* Node 7 is required
* Install the libraries with 'npm install'

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
This script wraps all of the functionality from the [library](#library) into a command line utility which can be used to support the following use cases.  All of the functions accept a property ID, the config name or a hostname from the property.
* [Create property](#create)
* [Clone property](#clone)
* [Retrieve property rules](#retrieve)
* [Update a property](#update)
* [Copy a property's config to another property](#copy)
* [Activate or deactivate](#activate)
* [Add Origin or Hostname](#add)

### Create
Creating a new property requires only a single parameter, the target property.  

```bash
% updateWebSite new.property.name --create 
```

The flags of interest for create are:

```
  --cpcode: The CPCode to use for the new property.  Default is to create a new CPCode.  The cpcode flag requires the contractid as well.
  --contract: The contractId to place the new property in.  Defaults to the parent group for the account.
  --group: The groupId to place the new propert in. 
  --name: The name for the new property
  --hostnames: Comma-delimited list of new hostnames to use for the property
  --ehname: The edge hostname to use for the newly created property.  If not included an edge hostname from the same group/contract will be used.
```

### Clone
Cloning a configuration to a new property is also simple, with command line flags to adjust behavior. 

```bash
% updateWebSite new.property.name --clone original.property.name
```

The flags of interest for clone are:
```
--cpcode: The CPCode to use for the new property.  Default is to create a new CPCode at the top level of the contract.  If you use --cpcode, note that it requires contractid.
--contractid: The contractId to place the new property in.  Defaults to the top level group for the contract.
--groupid: If given, this group will be used for the property.  Requires contractID.
--name: The name for the new property
--hostnames: Comma-delimited list of new hostnames to use for the property
--nocopy: Do not copy the edge hostnames to the new property
--ehname: Edge hostname for the newly created property.  If not included, the edge hostname from the cloned property will be used.
```

### Retrieve
This function retrieves the specified ruleset, either to STDOUT or the --outfile flag

```bash
% updateWebSite new.property.name --retrieve
```

The flags of interest for create are:
```
--version VERSION - specifies the version to retrieve for the specified property
--outfile FILE - stores the results to a file.  Default is to use STDOUT
```

### Update
Update the current property version with the rules from a local file.

```bash
% updateWebSite new.property.name --update --srcfile myfile
```

The flags of interest for update are:
```
--srcfile <FILE_WITH_RULES>
```

### Copy
Copy the configuration from one property to another.  For instance, you may use this if you have a staging property and a production property and want to migrate the new config between them.  Currently this does not handle advanced metadata.  Note that this is *not* to create a new property.  It is to copy configs between existing properties.  Use clone and copy to create new properties.

```bash
% updateWebSite dest.property.name --copy source.property.name
```

### Activate
Activate the specified property version on staging, production or both.

```bash
% updateWebSite my.property.com --activate BOTH
```
Possible options are:
```bash
STAGING: activates to the staging environment on Akamai
PROD: activates to the production environment
BOTH: simultaneously activate to both the environments

### Add
Add origin or hostname to the specified property (or delete hostname)

```bash
% updateWebSite my.property.com --addhosts list.com,of.com,hosts.com
% updateWebSite my.property.com --origin this.is.my.origin.com
% updateWebSite my.property.com --delhosts list.com,of.com,hosts.com
```


## Gulp

Download the Gulp integration project from https://github.com/akamai-open/gulp-akamaiconfigkit

In your gulpfile, include the library and define your build targets.

```
let gulp = require('gulp'),
    akamaiconfig = require('gulp-akamaiconfigkit');

const localConfig = {
    host: 'www.example.com',
    smokeTestUrls: ['/'],
    emailNotification: 'nobody@akamai.com',

};

const credConfig = {
    path: "~/.edgerc",
    section: "papi"
}


let akamai = new akamaiconfig(credConfig);

gulp.task('deploy-akamai', () => {
    return gulp.src("src/akamai/rules.json")
        .pipe(akamai.deployStaging(localConfig))
        .pipe(akamai.testStaging(localConfig.host, localConfig.smokeTestUrls))
        .pipe(akamai.promoteStagingToProduction(localConfig));
})
```

This integration can be used to have a CD tool such as Jenkins push changes to Akamai whenever a rules file changes in your SCM.  This allows you to treat your configuration as code and keep your own rules locally.

## Library

Start with creating the WebSite object:

```
let WebSite = require('akamaiconfigkit').WebSite;
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
