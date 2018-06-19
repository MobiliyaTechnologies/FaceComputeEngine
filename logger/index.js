var logger = require('./logger');

logger.config({
    service: "SS",
    level: 3
})

exports.logger = logger;