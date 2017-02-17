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


describe('Create a new property from scratch', function () {
    it ('should create a new property, activate, deactivate and delete', function() {
        akamaiweb.propertyName = "test.mocha.com";
        options = {};
        return akamaiweb.createProperty(akamaiweb, options)
            .then(data => {
                akamaiweb.propertyId = data.propertyId;
                return akamaiweb.activate(akamaiweb.propertyId)
            })
            .then(data => {
                return akamaiweb.deactivate(akamaiweb.propertyId)
            })
            .then(data => {
                return akamaiweb.delete(akamaiweb.propertyId)
            })
            .then(data => {
                return akamaiweb.retrieve(akamaiweb.propertyId)
            })
            .catch((error) =>  {
                assert(error);
            })
    })
    it ('should clone a new property, activate, deactivate and delete', function() {
        akamaiweb.propertyName = "test.mocha.com";
        options = {"srcProperty":"bc.akamaiapibootcamp.com"};
        return akamaiweb.createProperty(akamaiweb, options)
            .then(data => {
                akamaiweb.propertyId = data.propertyId;
                return akamaiweb.activate(akamaiweb.propertyId)
            })
            .then(data => {
                return akamaiweb.deactivate(akamaiweb.propertyId)
            })
            .then(data => {
                return akamaiweb.delete(akamaiweb.propertyId)
            })
            .then(data => {
                return akamaiweb.retrieve(akamaiweb.propertyId)
            })
            .catch((error) =>  {
                assert(error);
            })
    })

    it ('should try to create a new property without a propertyName (and fail)', function() {
        return akamaiweb.createProperty(akamaiweb, {})
            .catch(error => {
                assert(error);
            })
    })
})
