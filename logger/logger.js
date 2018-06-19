'use strict';
/**
 This module is use to define Logger configurations
 @module logger
*/

/**
 import npm modules
*/
var winston = require('winston');
require('winston-daily-rotate-file');
var fs = require('fs');
var logger = require('../settings').logger;
var service = logger.service;
var logDir = process.cwd() + '/logs';
var filename = process.cwd() + '/logs/service';
var debugSilentFlag = false;
var infoSilentFlag = false;
var warnSilentFlag = false;
var errorSilentFlag = false;
var logFile = logger.logFile;
var maxSize = logger.maxSize;
var debug, warn, info, error;

/**
 * Initialise the logger
 */
function init() {
    //if log directory is not exit then create it.
    if (!fs.existsSync(logDir)) {
        try {
            fs.mkdirSync(logDir);
        } catch (err) {
            logger.error("%s : Error while creating directory", logStr, err);
        }
    }

    /**
     * define debug level log
     */
    debug = new winston.Logger({
        levels: {
            debug: 2
        },
        transports: [
            new winston.transports.Console({
                level: 'debug',
                colorize: true,
                handleExceptions: true,
                silent: debugSilentFlag
            }),
            new winston.transports.DailyRotateFile({
                datePattern: '.yyyy-MM-dd',
                filename: filename,
                level: 'debug',
                silent: debugSilentFlag,
                maxsize: maxSize
            })
        ],
        exitOnError: false
    });
    /**
     * define info level log
     */
    info = new winston.Logger({
        levels: {
            info: 3
        },
        transports: [
            new winston.transports.Console({
                level: 'info',
                colorize: true,
                handleExceptions: true,
                silent: infoSilentFlag
            }),
            new winston.transports.DailyRotateFile({
                datePattern: '.yyyy-MM-dd',
                filename: filename,
                level: 'info',
                silent: infoSilentFlag,
                maxsize: maxSize
            })
        ],
        exitOnError: false
    });
    /**
     * define warn level log
     */
    warn = new winston.Logger({
        levels: {
            warn: 1
        },
        transports: [
            new winston.transports.Console({
                level: 'warn',
                colorize: true,
                handleExceptions: true,
                silent: warnSilentFlag
            }),
            new winston.transports.DailyRotateFile({
                datePattern: '.yyyy-MM-dd',
                filename: filename,
                level: 'warn',
                silent: warnSilentFlag,
                maxsize: maxSize
            })
        ],
        exitOnError: false
    });
    /**
     * define error level log
     */
    error = new winston.Logger({
        levels: {
            error: 0
        },
        transports: [
            new winston.transports.Console({
                level: 'error',
                colorize: true,
                handleExceptions: true,
                silent: errorSilentFlag
            }),
            new winston.transports.DailyRotateFile({
                datePattern: '.yyyy-MM-dd',
                filename: filename,
                level: 'error',
                silent: errorSilentFlag,
                maxsize: maxSize
            })
        ],
        exitOnError: false
    });
};
/**
 * exports the modules
 */
var exports = {
    debug: function (msg, param, object) {
        if (!object) {
            object = {};
            object.service = service;
        } else {
            object.service = service;
        }
        if (param && object) {
            debug.debug(msg, param, object);
            return;
        }
        if (param) {
            debug.debug(msg, param);
            return;
        }
        debug.debug(msg);
    },
    info: function (msg, param, object) {
        if (!object) {
            var object = {};
            object.service = service;
        } else {
            object.service = service;
        }

        if (param && object) {
            info.info(msg, param, object);
            return;
        }
        if (param) {
            info.info(msg, param);
            return;
        }
        info.info(msg);

    },
    warn: function (msg, param, object) {
        if (!object) {
            var object = {};
            object.service = service;
        } else {
            object.service = service;
        }
        if (param && object) {
            warn.warn(msg, param, object);
            return;
        }
        if (param) {
            warn.warn(msg, param);
            return;
        }
        warn.warn(msg);
    },
    error: function (msg, param, object) {
        if (!object) {
            var object = {};
            object.service = service;
        } else {
            object.service = service;
        }
        if (param && object) {
            error.error(msg, param, object);
            return;
        }
        if (param) {
            error.error(msg, param);
            return;
        }
        error.error(msg);
    },
    log: function (level, msg, param, object) {
        object.service = service;
        var lvl = exports[level];
        lvl(msg, param, object);
    },
    stream: {
        write: function (message) {
            debug.debug(message);
        }
    },
    config: function (configObj) {
        try {
            service = logger.service;
            if (configObj.level == logger.infoLevel) {
                infoSilentFlag = false;
                debugSilentFlag = false;
                warnSilentFlag = false;
                errorSilentFlag = false;
            }
            else if (configObj.level == logger.debugLevel) {
                infoSilentFlag = true;
                debugSilentFlag = false;
                warnSilentFlag = false;
                errorSilentFlag = false;
            }
            else if (configObj.level == logger.warnLevel) {
                infoSilentFlag = true;
                debugSilentFlag = true;
                warnSilentFlag = false;
                errorSilentFlag = false;
            }
            else if (configObj.level == logger.errorLevel) {
                infoSilentFlag = true;
                debugSilentFlag = true;
                warnSilentFlag = true;
                errorSilentFlag = false;
            }
            init();
        } catch (err) {
            console.log("Exception in logger config call : " + err);
        }
    }
};
module.exports = exports;
