'use strict';

/*
 * This is a simple logger which relies on Bunyan. Requiring this module
 * instantiates a new logger writing on stdout.
 *
 * How to use:
 *
 * ```
 * var logger = require('components/logger');
 *
 * logger.setName('foobar').setLevel('error');
 *
 * logger.fatal('Critical error');
 * logger.error('Error');
 * logger.warn('Warning');
 * logger.info('Informations');
 * logger.debug('foo');
 * logger.trace('bar');
 * ```
 */

var _ = require('lodash');
var bunyan = require('bunyan');

var loggerOptions = {
  name: 'default',
  streams: [
    { stream: process.stdout },
  ],
};

var logger = bunyan.createLogger(loggerOptions);

/**
 * Change the logger name.
 *
 * @param {String} name

 * @return {Logger}
 */
logger.setName = function(name) {
  if (_.isString(name) && name.length > 0) {
    logger.fields.name = name;
  } else {
    throw new Error('Invalid logger name "' + name + '" (' + (typeof name) + ')');
  }

  return logger;
};

/**
 * Change the log level below which nothing will be printed.
 * See: https://github.com/trentm/node-bunyan#levels
 *
 * e.g.: setting it to 'info' would ignore both 'debug' and 'trace'.
 *
 * @param {String} level
 *
 * @return {Logger}
 */
logger.setLevel = function(level) {
  var normalizedLevel = bunyan[level.toUpperCase()];

  if (_.isNumber(normalizedLevel)) {
    logger._level = normalizedLevel;
    logger.streams.forEach(function(stream) {
      stream.level = normalizedLevel;
    });
  } else {
    throw new Error('Invalid log level "' + level + '" (' + (typeof level) + ')');
  }

  return logger;
};

module.exports = logger;
