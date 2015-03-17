'use strict';

var _ = require('lodash');
var BPromise = require('bluebird');

var logger = require('./logger');


/**
 */
var program = {};

/**
 * The functions to execute when the program exits.
 */
program._onExitFunctions = [];

/**
 * Register a function to be executed when the program exits.
 */
program.onExit = function(fn) {

  if (!_.isArray(program._onExitFunctions)) {
    return;
  }

  program._onExitFunctions.push(function() {
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
 * Execute all the onExit functions.
 *
 * @param {String} reason
 */
program._cleanExit = function(reason) {

  if (!_.isArray(program._onExitFunctions)) {
    return null;
  }

  logger.fatal('Terminating the process (reason: %s)', reason);
  logger.info('Starting to clean up...');

  var promises = program._onExitFunctions.map(function(fn) {
    return fn();
  });
  program._onExitFunctions = null;

  BPromise.settle(promises)
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
      logger.info('An error occured while cleaning the process: %s', err);
      process.exit(1);
    })
  ;
};

(function staticConstructor() {
  // Cleanly exit the program when:
  // - one those three signals is being caught
  process.on('SIGINT', program._cleanExit.bind(program, 'SIGINT caught'));
  process.on('SIGQUIT', program._cleanExit.bind(program, 'SIGQUIT caught'));
  process.on('SIGTERM', program._cleanExit.bind(program, 'SIGTERM caught'));
  // - process.exit is being called
  process.once('exit', program._cleanExit.bind(program, 'process.exit caught'));
})();


module.exports = program;
