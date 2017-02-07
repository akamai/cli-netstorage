var assert = require("assert");
var WebSite = require('../index').WebSite;
var path = require('path');
var fs = require('fs');

var edgercFile = '~/.edgerc';
var sectionName = 'papi';
var propertyId = 'prp_284816';
var propertyName = "akamaiapibootcamp.com"; // Change this to your test property

// To run locally, set AKAMAI_TEST_HOST and AKAMAI_TEST_PROPID in your environment
// You must have a 'papi' section in your .edgerc file or use Akamai environment
// variables to set your credentials.  These credentials must be at the account
// level with read and write access in order to run these tests.
if (process.env.AKAMAI_TEST_HOST) {
    propertyName = process.env.AKAMAI_TEST_HOST;
}
if (process.env.AKAMAI_TEST_PROPID) {
    propertyId = process.env.AKAMAI_TEST_PROPID;
}

var akamaiweb = new WebSite({path: "~/.edgerc", section: "papi"});

describe('Retrieve Named Property', function() {
    var papiPropertyId;
    describe('Lookup property from host', function () {
        it('should return the correct propertyID', function () {
            return akamaiweb.lookupPropertyIdFromHost(propertyName)
                .then(function (papiPropertyId) {
                assert.equal(propertyId, papiPropertyId.propertyId);
            })
        });
    });

    describe('Retrieve property', function () {
        it('should retrieve the property rules and validate them', function () {
            return akamaiweb.retrieve('prp_284816', '')
                .then(data => {
                    assert(data['rules']);
            })
        }) 
    });

    describe('Retrieve property to file', function () {
        it('should retrieve the property rules and validate them', function () {
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
});

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

