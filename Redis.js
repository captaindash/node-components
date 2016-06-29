'use strict';

var events = require('events');
var url = require('url');

var _ = require('lodash');
var BPromise = require('bluebird');
var redis = require('redis');

var Cleaner = require('./Cleaner');
var logger = require('./Logger');

var EventEmitter = events.EventEmitter;


/**
 */
var Redis = {};

/**
 * @const {String}
 */
Redis.DEFAULT_CONNECTION_LABEL = 'main';

/**
 * A pool of Redis connections.
 */
Redis.connection = Object.create(null);

/**
 * Create a new connection and stores it in the pool at the given connection label.
 *
 * @param {String=} connectionLabel - The connection label (default to `main`)
 * @param {Object} options
 * @param {String} options.uri
 *
 * @return {Promise} - A promise resolving with the connection
 */
Redis.connect = function(connectionLabel, options)  {
  if (_.isObject(connectionLabel)) { options = connectionLabel; }
  if (!_.isString(connectionLabel)) { connectionLabel = Redis.DEFAULT_CONNECTION_LABEL; }

  return new BPromise(function(resolve, reject) {
    if (Redis.connection[connectionLabel]) {
      return resolve(Redis.connection[connectionLabel]);
    }

    var info = url.parse(options.uri);
    var client = redis.createClient(info.port, info.hostname, {
      //parser: 'hiredis',
    });

    var onConnectErrorListener = function(err) {
      delete Redis.connection[connectionLabel];
      return reject(err);
    };
    client.on('error', onConnectErrorListener);

    client.once('ready', function() {

      Cleaner.onExit(function(done) {
        // Properly disconnect from Redis when exiting the program
        logger.info('Disconnecting from Redis[%s]: %s', connectionLabel, options.uri);
        Redis.disconnect(connectionLabel)
          .then(done.bind(null, null))
          .error(done)
        ;
      });

      client.removeListener('error', onConnectErrorListener);
      return resolve(Redis.connection[connectionLabel] = client);
    });
  });
};

/**
 * Disconnect the connection represented by the given connection label.
 *
 * @param {String=} connectionLabel - The connection to disconnect
 *
 * @return {Promise} - A promise resolved when the connection is disconnected
 */
Redis.disconnect = function(connectionLabel) {
  if (!_.isString(connectionLabel)) { connectionLabel = Redis.DEFAULT_CONNECTION_LABEL; }

  return new BPromise(function(resolve, reject) {

    if (Redis.connection[connectionLabel]) {
      return resolve(null);
    }

    Redis.connection[connectionLabel].once('end', function() {
      delete Redis.connection[connectionLabel];
      return resolve(null);
    });
    Redis.connection[connectionLabel].quit();
  });
};

/**
 * PUBLISH the value for the given key. Prefix the key with the current
 * environment (development, test, production) so as to avoid conflicts.
 *
 * @param {String=} connectionLabel - The connection which should be used for the broadcast
 * @param {String} key
 * @param {String} value - If not a string, will be `JSON.stringify`'ed
 *
 * @return - Resolved when the commands are successfully executed.
 * Rejected if an error occurs
 */
Redis.publish = function(connectionLabel, key, value) {
  if (arguments.length === 2) {
    value = key;
    key = connectionLabel;
    connectionLabel = Redis.DEFAULT_CONNECTION_LABEL;
  }
  if (_.isString(Redis._prefix)) { key = Redis._prefix + ':' + key; }
  if (!_.isString(value)) { value = JSON.stringify(value); }

  return new BPromise(function(resolve, reject) {

    if (!Redis.connection[connectionLabel]) {
      return reject(new Error('No connected database for label: "' + connectionLabel + '"'));
    }

    Redis.connection[connectionLabel].publish(key, value, function(err, replies) {
      if (err) {
        return reject(err);
      }
      return resolve(replies);
    });
  });
};

/**
 * LPUSH the value at the given key, ensure the list never grows above the given
 * size using LTRIM.
 *
 * @param {String=} connectionLabel
 * @param {String} key
 * @param {Object|String} value
 * @param {Number} maxlen
 *
 * @return {BPromise}
 */
Redis.lpushlim = function(connectionLabel, key, value, maxlen) {
  if (arguments.length === 3) {
    maxlen = value;
    value = key;
    key = connectionLabel;
    connectionLabel = Redis.DEFAULT_CONNECTION_LABEL;
  }
  if (_.isString(Redis._prefix)) { key = Redis._prefix + ':' + key; }
  if (!_.isString(value)) { value = JSON.stringify(value); }

  return new BPromise(function(resolve, reject) {

    if (!Redis.connection[connectionLabel]) {
      return reject(new Error('No connected database for label: "' + connectionLabel + '"'));
    }

    var multi = Redis.connection[connectionLabel].multi();

    multi.lpush(key, value);
    multi.ltrim(key, 0, maxlen - 1);

    multi.exec(function(err, replies) {
      if (err) {
        return reject(err);
      }
      return resolve(replies);
    });
  });
};

/**
 * @private
 *
 * @type {Object}
 *
 * An object containing an event emitter for each connection. It is used as an
 * intermediate so as to allow several handlers to listen on the same event.
 */
var _subscribeEmitters = Object.create(null);

/**
 * @private
 *
 * @type {Object}
 *
 * Count the number of subscription, so as to never subscribe twice to the same
 * event (for each connection).
 */
var _subscribeCounts = Object.create(null);

/**
 * Subscribe the given handler to the given channels using the given connection.
 *
 * @param {String=} connectionLabel - The label corresponding to the connection
 * to use to subscribe
 * @param {String|String[]} channels - The channels to subscribe to
 * @param {Function} handler - Called each time an event is emitted with
 * `channel` and `message`
 */
Redis.subscribe = function(connectionLabel, channels, handler) {
  if (arguments.length === 2) {
    handler = channels;
    channels = connectionLabel;
    connectionLabel = Redis.DEFAULT_CONNECTION_LABEL;
  }
  channels = (!_.isArray(channels)) ? [channels] : channels;

  // Subscribe to Redis message / Create the event emitter (only once per connection)
  if (!_subscribeEmitters[connectionLabel]) {
    _subscribeEmitters[connectionLabel] = new EventEmitter();
    _subscribeEmitters[connectionLabel].setMaxListeners(0);
    Redis.connection[connectionLabel].on('message', function(channel, message) {
      var channelWithoutPrefix = (channel.indexOf(':') > -1) ? channel.split(':')[1] : channel;
      _subscribeEmitters[connectionLabel].emit(channelWithoutPrefix,
                                               channelWithoutPrefix, message);
    });
  }

  var emitter = _subscribeEmitters[connectionLabel];

  // For each channel, register to Redis and bind the handler
  channels.forEach(function(channel) {
    var channelWithPrefix = (_.isString(Redis._prefix)) ? Redis._prefix + ':' + channel : channel;

    if (!_.isObject(_subscribeCounts[connectionLabel])) {
      _subscribeCounts[connectionLabel] = Object.create(null);
    }
    if (!_.isNumber(_subscribeCounts[connectionLabel][channel])) {
      _subscribeCounts[connectionLabel][channel] = 0;
    }

    // Only subscribe to Redis if new
    if (_subscribeCounts[connectionLabel][channel] <= 0) {
      Redis.connection[connectionLabel].subscribe(channelWithPrefix);
    }
    _subscribeCounts[connectionLabel][channel] += 1;

    // Bind the handler
    emitter.addListener(channel, handler);
  });
};

/**
 * Unsubscribe the given handler from the given channels using the given
 * connection.
 *
 * @param {String=} connectionLabel - The label corresponding to the connection
 * to use to subscribe
 * @param {String|String[]} channels - The channels to subscribe to
 * @param {Function} handler - Called each time an event is emitted with
 * `channel` and `message`
 */
Redis.unsubscribe = function(connectionLabel, channels, handler) {
  if (arguments.length === 2) {
    handler = channels;
    channels = connectionLabel;
    connectionLabel = Redis.DEFAULT_CONNECTION_LABEL;
  }
  channels = (!_.isArray(channels)) ? [channels] : channels;

  var emitter = _subscribeEmitters[connectionLabel];

  // For each channel, unregister from Redis and unbind the handler
  channels.forEach(function(channel) {
    var channelWithPrefix = (_.isString(Redis._prefix)) ? Redis._prefix + ':' + channel : channel;
    var listenerCount = EventEmitter.listenerCount(emitter, channel);
    var newListenerCount;

    // Unbind the handler
    emitter.removeListener(channel, handler);

    // If a handler has been removed, decreased the counter
    newListenerCount = EventEmitter.listenerCount(emitter, channel);
    if (newListenerCount < listenerCount) {
      _subscribeCounts[connectionLabel][channel] -= 1;
    }

    // Only unsubscribe from Redis if no more handlers
    if (_subscribeCounts[connectionLabel][channel] <= 0) {
      _subscribeCounts[connectionLabel][channel] = 0; // ensure never < 0
      Redis.connection[connectionLabel].unsubscribe(channelWithPrefix);
    }
  });
};

/**
 * Prefix the given string if Redis._prefix exists, do nothing otherwise.
 */
Redis.prefix = function(str) {
  if (_.isString(Redis._prefix)) {
    return Redis._prefix + ':' + str;
  }
  return str;
};

/**
 * @private
 *
 * Each key in the database will be prefixed by this string. This could be
 * useful when the same database is shared amongst several development contexts.
 *
 * @type {String}
 */
Redis._prefix = null;

/**
 * @public
 *
 * @param {String} prefix

 * @return {String}
 */
Redis.setPrefix = function(prefix) {
  return (Redis._prefix = prefix);
};


module.exports = Redis;
