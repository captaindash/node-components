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
 *   console.log('Do some stuff...');
 *   if (err) { return done(err); }
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
  Cleaner._onExitFunctions.push(function() {
    return new BPromise(function(resolve, reject) {
      fn(function done(err) {
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
Cleaner._cleanExit = _.once(function(options) {

  var reason = options.reason;

  logger.fatal('Terminating the process (reason: %s)', reason);
  logger.info('Starting to clean up...');

  return BPromise
    .map(Cleaner._onExitFunctions, function(fn) { return fn(); })
    .settle()
    .timeout(10 * 1000) // Abort if takes longer than 10 seconds
    .then(function() {
      logger.info('Successfully terminated the process');
      process.exit(0);
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
});

(function staticConstructor() {
  process.once('SIGINT' , Cleaner._cleanExit.bind(null, { reason: 'SIGINT caught'  }));
  process.once('SIGQUIT', Cleaner._cleanExit.bind(null, { reason: 'SIGQUIT caught' }));
  process.once('SIGTERM', Cleaner._cleanExit.bind(null, { reason: 'SIGTERM caught' }));
})();


module.exports = Cleaner;
