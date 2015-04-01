'use strict';

var BPromise = require('bluebird');
var mongodb = require('mongodb');

var Cleaner = require('./Cleaner');
var logger = require('./Logger');

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

      // Properly disconnect from MongoDB when exiting the program
      Cleaner.onExit(function(done) {
        logger.info('Disconnecting from MongoDB: %s', options.uri);
        MongoDB.disconnect()
          .then(done)
          .error(done)
        ;
      });

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
