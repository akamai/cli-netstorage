# PREVIEW: Akamai CLI for Netstorage

*NOTE:* This tool is intended to be installed via the Akamai CLI package manager, which can be retrieved from the releases page of the [Akamai CLI](https://github.com/akamai/cli) tool.

This is under active development and not yet ready for use.  Please open issues if you have questions or requests.

### Local Install, if you choose not to use the akamai package manager
* Node 7
* npm install after *every* update
* Ensure that the 'bin' subdirectory is in your path
* Or 'npm install' to get the cli installer

### Credentials
In order to use this configuration, you need to:
* Set up your Netstorage API Credentials as described below (coming soon)  
* Run 'akamai ns setup' to set credentials for your environment

## Overview
The Akamai Netstorage CLI is a utility for interacting with Akamai's NetStorage platform from the command line.  

```
Usage: akamai netstorage <command> <args> [options]

Commands:
  setup                     Setup authentication for Netstorage
  du                        disk usage stats
  mdkir <directory>         create a new directory
  rmdir <directory>         delete a directory
  dir <directory>           view a directory structure
  quick-delete <directory>  recursively delete a directory
  rmdir <directory>         delete a directory
  ls <directory>            view a directory listing
  rmdir <directory>         delete a directory
  put <file>                upload a file
  get <file>                download a file
  rm <file>                 remove a file
  mv <file>                 move a file
  link <file>               create a symlink
  touch <file>              update modification time for a file
  stat <file>               see file information

Command options:
  --config <config>    Config file
                       [file] [default: /Users/khunter/.akamai-cli/.netstorage/auth]

  --section <section>  Section for config file
                       [string] [default: default]

  --cpcode <cpcode>    Default CPCode
                       [string]

  --help               Show help
                       [commands: help] [boolean]

  --version            Show version number
                       [commands: version] [boolean]
```
Copyright (C) Akamai Technologies, Inc
Visit http://github.com/akamai/cli-netstorage for detailed documentation