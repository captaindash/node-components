'use strict';

var url = require('url');

var _ = require('lodash');
var BPromise = require('bluebird');
var redis = require('redis');


/**
 */
var Redis = {};

/**
 * @const {String}
 */
Redis.DEFAULT_LABEL = 'main';

/**
 * A pool of Redis connections.
 */
Redis.connection = Object.create(null);

/**
 * Create a new connection and stores it in the pool at the given label.
 *
 * @param {String=} label - The connection label (default to `main`)
 * @param {Object} options
 * @param {String} options.uri
 *
 * @return {Promise} - A promise resolving with the connection
 */
Redis.connect = function(label, options)  {
  if (_.isObject(label)) { options = label; }
  if (!_.isString(label)) { label = Redis.DEFAULT_LABEL; }

  return new BPromise(function(resolve, reject) {
    if (Redis.connection[label]) {
      return resolve(Redis.connection[label]);
    }

    var info = url.parse(options.uri);
    var client = redis.createClient(info.port, info.hostname, {
      parser: 'hiredis',
    });

    var onConnectErrorListener = function(err) {
      delete Redis.connection[label];
      return reject(err);
    };
    client.on('error', onConnectErrorListener);

    client.once('ready', function() {
      client.removeListener('error', onConnectErrorListener);
      return resolve(Redis.connection[label] = client);
    });
  });
};

/**
 * Disconnect the connection represented by the given label.
 *
 * @param {String=} label - The connection to disconnect
 *
 * @return {Promise} - A promise resolved when the connection is disconnected
 */
Redis.disconnect = function(label) {
  if (!_.isString(label)) { label = Redis.DEFAULT_LABEL; }

  return new BPromise(function(resolve, reject) {

    if (Redis.connection[label]) {
      return resolve(null);
    }

    Redis.connection[label].once('end', function() {
      delete Redis.connection[label];
      return resolve(null);
    });
    Redis.connection[label].quit();
  });
};

/**
 * PUBLISH the value for the given key. Prefix the key with the current
 * environment (development, test, production) so as to avoid conflicts.
 *
 * @param {String=} label - The connection which should be used for the broadcast
 * @param {String} key
 * @param {String} value - If not a string, will be `JSON.stringify`'ed
 *
 * @return - Resolved when the commands are successfully executed.
 * Rejected if an error occurs
 */
Redis.publish = function(label, key, value) {
  if (arguments.length === 2) {
    value = key;
    key = label;
    label = Redis.DEFAULT_LABEL;
  }

  return new BPromise(function(resolve, reject) {

    if (!Redis.connection[label]) {
      return reject(new Error('No connected database for label: "' + label + '"'));
    }

    if (_.isString(Redis._prefix)) { key = Redis._prefix + ':' + key; }
    if (!_.isString(value)) { value = JSON.stringify(value); }

    Redis.connection[label].publish(key, value, function(err, replies) {
      if (err) {
        return reject(err);
      }
      return resolve(replies);
    });
  });
};

/**
 * @private
 * Each key in the database will be prefixed by this string. This could be
 * useful when the same database is shared amongst several development contexts.
 *
 * @type {String}
 */
Redis._prefix = null;

/**
 * @public
 */
Redis.setPrefix = function(prefix) {
  Redis._prefix = prefix;
};


module.exports = Redis;
