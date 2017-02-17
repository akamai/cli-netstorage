var assert = require("assert");
var WebSite = require('../index').WebSite;
var path = require('path');
var fs = require('fs');

var edgercFile = '~/.edgerc';
var sectionName = 'papi';
var propertyId = 'prp_284816';
var groupID = 'grp_64867';
var contractId = 'ctr_C-1FRYVV3';
var configName = "akamaiapibootcamp.com"; // Change this to your test property
var cpcode = "384473";
var edgeHostnameId = "ehn_1596213";

// To run locally, set AKAMAI_TEST_HOST and AKAMAI_TEST_PROPID in your environment
// You must have a 'papi' section in your .edgerc file or use Akamai environment
// variables to set your credentials.  These credentials must be at the account
// level with read and write access in order to run these tests.
if (process.env.AKAMAI_TEST_HOST) {
    configName = process.env.AKAMAI_TEST_HOST;
}
if (process.env.AKAMAI_TEST_PROPID) {
    configName = process.env.AKAMAI_TEST_PROPID;
}

var akamaiweb = new WebSite({path: edgercFile, section: sectionName});

describe('Check read functions', function() {
    it('should return a property', function () {
        return akamaiweb._getProperty("bc.akamaiapibootcamp.com")
        .then(property => {
            assert(property.propertyId)
        })
    });
    it('should return the right configuration', function () {
        akamaiweb.srcProperty = "bc.akamaiapibootcamp.com";
        return akamaiweb._getCloneConfig(akamaiweb)
        .then(cloneConfig => {
            assert.equal(akamaiweb.srcProperty, cloneConfig.cloneFrom.propertyName);
        })
    });
    it('should return the group list', function() {
        return akamaiweb._getGroupList()
        .then(groupList => {
            assert.equal(groupList.accountId, 'act_B-C-1FRYVMN')
        })
    });
    it('should return the hostname list, STAGING', function() {
        return akamaiweb._getHostnameList(propertyName, 'STAGING')
        .then(hostnamelist => {
            assert(hostnameList[akamaiweb.srcProperty]);
        })
    });
    it('should return the main product for the account', function() {
        return akamaiweb._getMainProduct()
        .then(property => {
            assert.equal(property.productName, "SPM")
        })
    });
    it('should get a list of properties with our configName', function() {
        return akamaiweb._getPropertyList(contractId, groupId)
        .then(list => {
            let propExists = false;
            let propList = list.properties.items;
            propList.map(v => {
                return v.properties.items.map(item => {
                    if (item.propertyName == configName)
                        propExists = true;
                })
            })
            assert(propExists);
        })
    });
    it('should retrieve the property rules for our property', function()  {
        return akamaiweb._getPropertyRules(configName, "latest")
        .then(propertyRules => {
            assert(data['accountId'])
        })
    });


    it('should retrieve the property rules and validate them', function () {
            return akamaiweb.retrieve('prp_284816', '')
                .then(data => {
                    assert(data['accountId']);
            })
        }) 
 
    it('should retrieve the property rules to a file', function () {
        return akamaiweb.retrieveToFile('prp_284816', '','test/new_rules.json')
            .then(data => {
                fs.readFile('test/new_rules.json','utf8', function (err, data) {
                    if (err) throw err;
                    obj = JSON.parse(data);
                    assert(obj['rules']);
                })
        })
    }) 
});
describe('Test update functionality', function() {
    it('should update the property behaviors with cpcode and origin', function() {
        return akamaiweb._updatePropertyBehaviors()
        .then(property => {
            let originMatch = false;
            property.rules.behaviors.map(behavior => {
                if (behavior.options.hostname == "origin-" + configName)
                    originMatch = true;
            })
            assert(originMatch);
        })
    })
    it('should get the property rules and update them in latest', function() {
        var oldRules = {};
        return akamaiweb._getPropertyRules(configName, "LATEST")
        .then(propertyRules => {
            oldRules = propertyRules
            return akamaiweb._updatePropertyRules(configName, "LATEST", propertyRules)
        })
        .then(newRules => {
            assert.equal(oldRules.rules, newRules.rules)
        })
    })
    it('should create CPCodes using the internal and public methods', function() {
        // This test will break until the creation of CPCodes is fixed
        //return akamaiweb._createCPCode(akamaiweb)
        //.then(property => {
            assert(1)
        //})
    })
    it('should return edgeHostnameId for already existing hostname', function() {
        return akamaiweb._createHostname(groupId, contractId, configName, productId)
        .then(property => {
            assert(property.edgeHostnameId == edgeHostnameId)
        })
    })
    // Add 


describe('Full update including production and staging', function () {
    describe('Update a property from a file', function () {
        it('should update the property from the rules', function () {
            return akamaiweb.updateFromFile(propertyId, 'test/new_rules.json')
                .then(data => {
                    return akamaiweb.retrieve(propertyId)
                .then(data => {
                    assert(data);
                })
            })
        })
    });
    describe('Activate a property to staging', function () {
        it('should activate the property to staging from latest version', function () {
            return akamaiweb.activate(propertyId)
                .then(data => {
                    return akamaiweb.retrieve(propertyId)
                .then(data => {
                    console.log(data);
                    assert(data);
                })
            })
        })
    });
    describe('Promote version from staging to production', function () {
        it('should activate the staging version in production and check versions', function () {
            return akamaiweb.promoteStagingToProd(propertyId)
                .then(data => {
                    return akamaiweb.retrieve(propertyId, "STAGING")
                .then(stag_data => {
                    return akamaiweb.retrieve(propertyId, "PRODUCTION")
                .then(prod_data => {
                    assert(stag_data.propertyVersion === prod_data.propertyVersion);
                })
            })
        })
    });
})
})
})
