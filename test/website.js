var assert = require("assert");
var WebSite = require('akamaiwebkit').WebSite;
var path = require('path');
var fs = require('fs');

var edgercFile = '~/.edgerc';
var sectionName = 'papi';
var propertyId = 'prp_284816';
var akamaiweb = new WebSite({path: "~/.edgerc", section: "papi"});

describe('Retrieve Named Property', function() {
    var papiPropertyId;
    describe('Lookup property from host', function () {
        it('should return the correct propertyID', function () {
            var propertyName = "akamaiapibootcamp.com";
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
})


