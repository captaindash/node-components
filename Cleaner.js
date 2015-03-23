'use strict';

/*
 * This tool allows to register callbacks which will be called whenever your
 * program stops.
 *
 * How to use:
 *
 * ```
 * var Cleaner = require('components/Cleaner');
 *
 * Cleaner.onExit(function(done) {
 *   try {
 *     console.log('Do some stuff...');
 *   } catch (err) {
 *     return done(err);
 *   }
 *   return done();
 * });
 * ```
 */

var _ = require('lodash');
var BPromise = require('bluebird');

var logger = require('./Logger');


/**
 */
var Cleaner = {};

/**
 * @private
 * The functions to execute when the program exits.
 */
Cleaner._onExitFunctions = [];

/**
 * Register a function to be executed when the program exits.
 */
Cleaner.onExit = function(fn) {

  if (!_.isArray(Cleaner._onExitFunctions)) {
    return;
  }

  Cleaner._onExitFunctions.push(function() {
    return new BPromise(function(resolve, reject) {
      fn(function(err) {
        if (err) {
          return reject(err);
        }
        return resolve();
      });
    });
  });
};

/**
 * @private
 * Execute all the onExit functions.
 *
 * @param {String} reason
 */
Cleaner._cleanExit = function(config) {

  var reason = config.reason;

  // Remove all other listeners
  process.removeAllListeners();

  // If the cleaning is already being done, abort
  if (!_.isArray(Cleaner._onExitFunctions)) {
    return null;
  }

  logger.fatal('Terminating the process (reason: %s)', reason);
  logger.info('Starting to clean up...');

  var promises = Cleaner._onExitFunctions.map(function(fn) { return fn(); });
  Cleaner._onExitFunctions = null;

  return BPromise.settle(promises)
    .timeout(10 * 1000) // Abort if takes longer than 10 seconds
    .then(function() {
      logger.info('Successfully terminated the process');
      process.exit();
    })
    .error(BPromise.TimeoutError, function() {
      logger.info('The cleaning process took too long. Aborting');
      process.exit(2);
    })
    .error(function(err) {
      logger.info('An error occurred while cleaning the process: %s', err);
      process.exit(1);
    })
  ;
};

(function staticConstructor() {
  // - SIGINT, SIGQUIT, SIGTERM is being caught
  // - process.exit is being called
  process.once('SIGINT' , Cleaner._cleanExit.bind(null, { reason: 'SIGINT caught'       }));
  process.once('SIGQUIT', Cleaner._cleanExit.bind(null, { reason: 'SIGQUIT caught'      }));
  process.once('SIGTERM', Cleaner._cleanExit.bind(null, { reason: 'SIGTERM caught'      }));
  process.once('exit'   , Cleaner._cleanExit.bind(null, { reason: 'process.exit called' }));
})();


module.exports = Cleaner;
