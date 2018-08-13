var { EventHubClient, EventPosition } = require('azure-event-hubs');
var logger = require('../logger/index').logger;
var config = require('../settings');
var logStr = 'CloudComputeEngine_eventHub';
var faceRecognizeController = require('../controllers/faceRecognizeController');
var faceDetectController = require('../controllers/faceDetectController');
var textRecognizeController = require('../controllers/textRecognizeController');
const client = EventHubClient.createFromConnectionString(config.evenHubConnectionString,config.eventHubName);
var CronJob = require('cron').CronJob;

const onError = (err) => {
    logger.debug("%s : Error occured on IotHub listener", logStr);
};

const onMessage = (eventData) => {
    var jsonString = JSON.stringify(eventData.body);
    var jsonObj = JSON.parse(jsonString);

    switch (jsonObj.feature) {

        case "faceRecognition":
            logger.debug(" ================================== FACE RECOGNITION ======================================");
            logger.debug("Request Body : ", jsonObj);
            logger.debug(" ==========================================================================================");
            if (jsonObj.imageUrl) {
                faceRecognizeController.processImage(jsonObj);
            }
            else {
                logger.error("Invalid Request for Face Recognition");
            }
            break;

        case "textRecognition":
            logger.debug(" ================================== TEXT RECOGNITION ======================================");
            logger.debug("Request Body : ", jsonObj);
            logger.debug(" ==========================================================================================");
            if (jsonObj.imageUrl) {
                textRecognizeController.processImage(jsonObj);
            }
            else {
                logger.error("Invalid Request for Face Recognition");
            }
            break;

        case "faceDetection":
            logger.debug(" ================================== FACE DETECTION ======================================");
            logger.debug("Request Body : ", jsonObj);
            logger.debug(" ==========================================================================================");
            if (jsonObj.imageUrl) {
                faceDetectController.processImage(jsonObj);
            }
            else {
                logger.error("Invalid Request for Face Recognition");
            }
            break;

        default:
            console.log("\n Default ::  Topic:: " + topic + " not handled!!");
    }
}


var receiveHandlerArray = [];
client.getPartitionIds()
    .then(partitionIds => partitionIds.map(partitionId => {
        receiveHandler = client.receive(partitionId, onMessage, onError, { eventPosition: EventPosition.fromEnqueuedTime(Date.now()) })
        receiveHandlerArray.push(receiveHandler);
    }
    ));

var job = new CronJob('0 0 */8 * * *', function () {
    logger.debug("%s : IotHub event listener cron job executed", logStr);
    receiveHandlerArray.forEach(function (receiveHandler, index) {
        receiveHandler.stop();
        if (index === receiveHandlerArray.length - 1) {
            receiveHandlerArray = [];
            client._context.receivers = {};
            client.getPartitionIds()
                .then(partitionIds => partitionIds.map(partitionId => {
                    receiveHandler = client.receive(partitionId, onMessage, onError, { eventPosition: EventPosition.fromEnqueuedTime(Date.now()) })
                    receiveHandlerArray.push(receiveHandler);
                }
                ));
        }
    });
}, function () { }, true);