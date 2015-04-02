'use strict';

/*
 * This is a simple logger which relies on Bunyan. Requiring this module
 * instantiates a new Logger, writing on stdout.
 *
 * How to use:
 *
 * ```
 * var Logger = require('components/Logger');
 *
 * Logger.setName('foobar').setLevel('error');
 *
 * Logger.fatal('Critical error');
 * Logger.error('Error');
 * Logger.warn('Warning');
 * Logger.info('Informations');
 * Logger.debug('foo');
 * Logger.trace('bar');
 * ```
 */

var _ = require('lodash');
var bunyan = require('bunyan');


var LoggerOptions = {
  name: 'default',
  streams: [
    { stream: process.stdout },
  ],
};

var Logger = bunyan.createLogger(LoggerOptions);

/**
 * Change the Logger name.
 *
 * @param {String} name
 *
 * @return {Logger}
 */
Logger.setName = function(name) {
  if (_.isString(name) && name.length > 0) {
    Logger.fields.name = name;
  } else {
    throw new Error('Invalid Logger name "' + name + '" (' + (typeof name) + ')');
  }

  return Logger;
};

/**
 * Change the log level below which nothing will be printed (e.g.: setting it to
 * 'info' would ignore both 'debug' and 'trace').
 * @see {@link https://github.com/trentm/node-bunyan#levels}
 *
 * @param {String=} level - Default to 'info'
 *
 * @return {Logger}
 */
Logger.setLevel = function(level) {
  level = level || 'info';
  var normalizedLevel = bunyan[level.toUpperCase()];

  if (_.isNumber(normalizedLevel)) {
    Logger._level = normalizedLevel;
    Logger.streams.forEach(function(stream) {
      stream.level = normalizedLevel;
    });
  } else {
    throw new Error('Invalid log level "' + level + '" (' + (typeof level) + ')');
  }

  return Logger;
};

module.exports = Logger;
