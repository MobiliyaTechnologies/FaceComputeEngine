var faceRecognizeController = require('../controllers/faceRecognizeController');
var faceDetectController = require('../controllers/faceDetectController');
var logger = require('../logger/index').logger;
var logStr = 'CloudComputeEngine';

module.exports = function (app) {
    app.post('/faces',
        function (req, res, next) {
            logger.debug(" ===================================== FACE DETECTION =====================================");
            logger.debug("Request Body : ", req.body);
            logger.debug(" ==========================================================================================");
            if (req.body.areaOfInterest && req.body.timestamp && req.body.targetUrl && req.files.file.name) {
                next();
            }
            else {
                logger.error("Invalid Inputs");
                res.send({ 'result': 'Invalid Inputs!' });
            }
        },
        faceDetectController.processImage);

    app.post('/faces/recognize',
        function (req, res, next) {
            logger.debug(" ================================== FACE RECOGNITION ======================================");
            logger.debug("Request Body : ", req.body);
            logger.debug(" ==========================================================================================");

            if (req.body.areaOfInterest && req.body.timestamp && req.body.targetUrl && req.files.file.name) {
                next();
            }
            else {
                logger.error("Invalid Inputs");
                res.send({ 'result': 'Invalid Inputs!' });
            }
        },
        faceRecognizeController.processImage);

}

