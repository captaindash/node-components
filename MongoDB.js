'use strict';

var BPromise = require('bluebird');
var mongodb = require('mongodb');

var MongoClient = mongodb.MongoClient;


/**
 */
var MongoDB = {};

/**
 */
MongoDB.connection = null;

/**
 * @param options
 * @param options.uri - the MongoDB complete URI
 */
MongoDB.connect = function(options) {
  return new BPromise(function(resolve, reject) {
    if (MongoDB.connection !== null) {
      return resolve(MongoDB.connection);
    }

    MongoClient.connect(options.uri, function(err, connection) {
      if (err) {
        MongoDB.connection = null;
        return reject(err);
      }
      return resolve(MongoDB.connection = connection);
    });
  });
};

/**
 */
MongoDB.disconnect = function() {
  return new BPromise(function(resolve, reject) {

    if (MongoDB.connection === null) {
      return resolve(null);
    }

    MongoDB.connection.close(function(err) {
      MongoDB.connection = null;
      if (err) {
        return reject(err);
      }
      return resolve(null);
    });
  });
};


module.exports = MongoDB;
