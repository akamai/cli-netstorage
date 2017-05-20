# AkamaiConfigKit - PREVIEW


## Overview
This is a set of nodejs libraries use to wrap Akamai's {OPEN} APIs to help simplify the operations and interactions
with Akamai for common configuration tasks.  This kit can be used in different ways:
* Just want a no-fuss tool? [Use the command line utility](#updateWebSite) to interact with the library
* Want to integrate into your own Node.js application? [Include the library](#library) 
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

## akamaiProperty
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
%  akamaiProperty create dev7.mydomain.com << New property from scratch
%  akamaiProperty create dev7 --clone template1 --hostnames test.hostname.com << clone from another property
```

The flags of interest for create are:

```
      -h, --help               output usage information
    --clone <property>       Source property to clone from
    --srcver <version>       Version for source property stag/prod/latest/<number> (default is latest)
    --file <file>            Source file for new property rules
    --hostnames <hostnames>  Comma delimited list of hostnames for property
    --origin <origin>        Origin for new property
    --edgehostname <ehn>     Edge hostname
    --cpcode <cpcode>        CPCode, requires contract and group
    --contract <contract>    Contract for the new property
    --group <group>          Group to place property in
    --section <section>      Section of the credentials file
    --nocopy                 Do not copy source property's hostnames

```
### Retrieve
This function retrieves the specified ruleset, either to STDOUT or the --outfile flag

```bash
% akamaiProperty retrieve new.property.name
```

The flags of interest for retrieve are:
```
   -h, --help           output usage information
    --file <file>        Output file (default is STDOUT)
    --propver <version>  Property version, latest/staging/prod or number
    --section <section>  Section of the credentials file

```

### Update
Update the current property version with the rules from a local file.

```bash
% akamaiProperty update my.property.com --srcprop this.other.property.com
```

The flags of interest for update are:
```
    -h, --help            output usage information
    --srcprop <property>  Source property to copy rules from
    --srcver <version>    Version for source property stag/prod/latest/<number>  (default is latest)
    --file <file>         Source file for property rules
    --section <section>   Section of the credentials file
```

### Activate
Activate the specified property version on staging, production or both.

```bash
% akamaiProperty activate my.property.com --network BOTH
```
Possible options are:
```bash
    -h, --help           output usage information
    --network <network>  Network to activate, PROD/STAG/BOTH
    --propver <version>  Property version, latest/staging/prod or number
    --section <section>  Section of the credentials file
    --email <email>      Email to use for confirmation
```

### Modify
Add origin or hostname to the specified property (or delete hostname)

```bash
% akamaiProperty modify my.property.com --origin new.origin.hostname
```

Possible options are:
```bash
    -h, --help                     output usage information
    --section <section>            Section of the credentials file
    --addhosts <hostnames>         Comma delimited list of hostnames to add
    --delhosts <hostnames>         Comma delimited list of hostnames to delete
    --edgehostname <edgehostname>  Edge hostname to switch the property to
    --origin <origin>              Origin 
    --edgehostname <ehn>           TODO: Edge hostname
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
