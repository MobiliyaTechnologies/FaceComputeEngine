var Message = require('azure-iot-device').Message;
var config = require('../settings');
var clientFromConnectionString = require('azure-iot-device-mqtt').clientFromConnectionString;
var clientFromConnectionStringAMQP = require('azure-iot-device-amqp').clientFromConnectionString;


var client;
var clientAMQP;

function printResultFor(op) {
    return function printResult(err, res) {
        if (err) console.log(op + ' error: ' + err.toString());
        if (res) console.log(op + ' status: ' + res.constructor.name);
    };
}

var printError = function (err) {
    console.error("\n\n\n\n********************************************************************************Iot Hub Connection Error ::", err.message || err);
    cb(err, null, null);
};

/**
 * Receive and process messages 
 * @param {*} client 
 */
var IOTHubListener = function (client) {
    client.open(function (error) {
        if (error)
            console.log("Error in connecting..");
        else {
            console.log("Connected to IOTHub");
            client.on('message', function (message) {
                client.complete(message, printResultFor('completed'));
                var topic = message.messageId;
                var message = message.data;
                // message is Buffer
                console.log(" DATA RECEIVED ON TOPIC :: ", topic);

                switch (topic) {
                    /**
                     * Change Pricing tier
                     */
                    case "toggleTier":
                        var data = JSON.parse(message.toString());
                        if (data.tier == 0) {
                            config.endPoint = config.endPointFree;
                            config.textEndpoint = config.textEndpointFree;
                            config.faceApiSubscriptionKey = config.faceApiSubscriptionKeyFree;
                            config.textSubscriptionKey = config.textSubscriptionKeyFree;
                            console.log(" ***** PRICING TIER UPDATED TO FREE ******");

                        }
                        else if (data.tier == 1) {
                            config.endPoint = config.endPointStandard;
                            config.textEndpoint = config.textEndpointStandard;
                            config.faceApiSubscriptionKey = config.faceApiSubscriptionKeyStandard;
                            config.textSubscriptionKey = config.textSubscriptionKeyStandard;
                            console.log(" ***** PRICING TIER UPDATED TO STANDARD ******");
                        }


                        //Face Detection
                        config.faceDetectionUrl = config.endPoint + "detect?returnFaceId=true&returnFaceLandmarks=false&returnFaceAttributes=age,gender,emotion";
                        config.addFacesUrl = config.endPoint + "facelists/" + config.faceListId + "/persistedFaces?userData=";
                        config.findSimilarUrl = config.endPoint + "findsimilars";
                        config.getUserlistUrl = config.endPoint + "facelists/";

                        //Face Recognition
                        config.endpointRecognition = config.endPoint;
                        config.faceDetectionUrlRecognition = config.faceDetectionUrl;
                        config.addFacesUrlRecognition = config.endPoint + "facelists/" + config.faceListId + "/persistedFaces?userData=";
                        config.findSimilarUrlRecognition = config.endPoint + "findsimilars";
                        config.getUserlistUrlRecognition = config.endPoint + "facelists/";

                        //Text Recognition
                        config.textRecognitionUrl = config.textEndpoint + "ocr?language=en&detectOrientation=true";
                        config.textRecognize = config.textEndpoint + "recognizeText?mode=Printed"; //mode = Printed or Handwritten : By default it is set to Printed in controller
                        break;

                    default:
                        console.log("\n Default ::  Topic:: " + topic + " not handled!!");
                }

            });
        }
    });
}

/**
 * Connect to IOTHub
 * @param {*} deviceConnectionString 
 */
var topicSubscribe = function (deviceConnectionString) {
    console.log("Connecting to IOTHub...");

    client = clientFromConnectionString(deviceConnectionString);
    clientAMQP = clientFromConnectionStringAMQP(deviceConnectionString);

    IOTHubListener(client);
    client.on('errorReceived', printError);
    client.on('error', function (err) {
        console.error(err.message);
    });
    client.on('disconnect', function () {
        console.log("Disconnected");
        //client.open(connectCallback);
    });
}

/**
 * Send result to IOTHUB
 */
var sendResultToIotHub = function (result) {
    var message = new Message(JSON.stringify(result));
    message.ack = 'full';

    clientAMQP.sendEvent(message, function (err) {
        if (!err) {
            console.log("-------------------------- Message Sent to IOTHUB  : ",result);
        }
        else {
            console.log("-------------------------- Error Occurred while Sending Msg : ", err);
        }
    });
}



module.exports.topicSubscribe = topicSubscribe;
module.exports.sendResultToIotHub = sendResultToIotHub;

