'use strict';
var assert = require('assert');
var NetStorage = require('../index').NetStorage;
var path = require('path');
var fs = require('fs');

var netstorage = new NetStorage();

let tempDirectory = 'circle-' + Date.now();

describe('Retrieve directory listing', function() {
  it('should retrieve the directory listing', function() {
    return netstorage.dir({})
      .then(response => {
        assert(response);
      })
      .catch((error) => {
        assert(error);
      });
  });

  it('should retrieve directory listing with options', function() {
    return netstorage.dir({prefix: 'test'})
      .then(response => {
        assert(response);
      })
      .catch((error) => {
        assert(error);
      });
  });
});
describe('Retrieve disk usage', function() {
  it('should display the disk usage', function() {
    return netstorage.diskusage({})
      .then(response => {
        assert(response);
      })
      .catch((error) => {
        assert(error);
      });
  });
});

describe('Should create, upload, list, delete and rmdir', function() {
  it('should create a new directory', function() {
    return netstorage.mkdir({directory: tempDirectory})
      .then(response => {
        assert(response);
      })
      .catch((error) => {
        assert(error);
      });
  });

  it('should upload a file to the directory', function() {
    return netstorage.upload({file: 'test/nstest.js', directory: tempDirectory})
      .then(response => {
        assert(response);
      })
      .catch((error) => {
        assert(error);
      });
  });
  it('should do a directory listing on the directory', function() {
    return netstorage.dir({directory: tempDirectory})
      .then(response => {
        assert(response);
      })
      .catch((error) => {
        assert(error);
      });
  });
  it('should delete the file from the directory', function() {
    return netstorage.delete({file: tempDirectory + '/test/nstest.js'})
      .then(response => {
        assert(response);
      })
      .catch((error) => {
        assert(error);
      });
  });
  it('should remove the directory', function() {
    return netstorage.delete({directory: tempDirectory})
      .then(response => {
        console.log(response);
      })
      .then(response => {
        assert(response);
      })
      .catch((error) => {
        assert(error);
      });
  });
});

