//NODE SERVER START
var express = require('express');
var app = express();
var config = require('./settings');
var faceRoutes = require('./routes/faceRoutes');
const fileUpload = require('express-fileupload');
var fs = require('fs');
var mkdirp = require('mkdirp');
var path = require('path');

var logger = require('./logger/index').logger;
var logStr = 'CloudComputeEngine';
//var serial = require('node-serial-key');
var ip = require("ip");
var request = require('request');
var bodyParser = require('body-parser');
var azure = require('azure-storage');
var iothub = require('azure-iothub');
var eventHub = require('./communication/eventHub');
var port = config.port;
if (process.env && process.env.PORT) { port = process.env.PORT }
var blobStorage = azure.createBlobService(config.blobStorageAccountName, config.blobStorageAccessKey);

app.use(bodyParser.json());
app.use(fileUpload());
app.use(express.static(path.join(__dirname, 'Cameras')));

//ping mechanism
var topicSubscribe = require('./communication/IOTHub').topicSubscribe;

//computeId assigned by backend
var connectionString = config.iotHub.connectionString;
var registry = iothub.Registry.fromConnectionString(connectionString);

/**
 * Invoking routes
 */
faceRoutes(app);


app.listen(port);

//Compute Engine's ping Mechanism
registerOnJetson();

//setInterval(registerOnJetson, config.pingInterval); // 15 mins

function registerOnJetson() {

    console.log('\n\n _________________________________  CLOUD COMPUTE ENGINE STARTED   ____________________________________\n\n');
    logger.debug(' -----------------------------------------------------------------------------------------------');
    logger.debug("Registering JETSON on Server....");
    var jetsonDetails = {
        "name": config.name,
        "deviceType": config.deviceType,
        "macId": config.serialKey,
        "ipAddress": ip.address(),
        "detectionAlgoritms": config.detectionAlgoritms,
        "cameraSupported": config.cameraSupported,
        "location": config.location,
        "supportedShapes": config.supportedShapes,
        "jetsonCamFolderLocation": config.camFolder,
        "wayToCommunicate": config.wayToCommunicate,
        "isCloudCompute": true
    };

    var options = {
        rejectUnauthorized: false,
        url: config.JetsonRegistrationURL,
        method: 'POST',
        json: jetsonDetails
    };
    request(options, function (error, response, body) {
        if (error) {
            logger.error("Error Registering the device");
        }
        else {
            var computeEngineId = response.body._id;
            logger.debug("Success in Registering!::computeEngineId ::", computeEngineId);
            config.tier = response.body.tier;
            // Setting default tier value
            if (config.tier == 0) {
                config.endPoint = config.endPointFree;
                config.textEndpoint = config.textEndpointFree;
                config.faceApiSubscriptionKey = config.faceApiSubscriptionKeyFree;
                config.textSubscriptionKey = config.textSubscriptionKeyFree;
                logger.debug(" ***** PRICING TIER UPDATED TO FREE ******");

            }
            else if (config.tier == 1) {
                config.endPoint = config.endPointStandard;
                config.textEndpoint = config.textEndpointStandard;
                config.faceApiSubscriptionKey = config.faceApiSubscriptionKeyStandard;
                config.textSubscriptionKey = config.textSubscriptionKeyStandard;
                logger.debug(" ***** PRICING TIER UPDATED TO STANDARD ******");
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

            /**
             * Algorithm Registration 
            */
            var algorithmDetails = {
                "computeEngineId": computeEngineId,
                "detectionAlgorithms": config.detectionAlgorithms,
            }
            var optionsAlgo = {
                rejectUnauthorized: false,
                url: config.registerAlgorithm,
                method: 'POST',
                json: algorithmDetails
            };
            request(optionsAlgo, function (error, response, body) {
                if (error) {
                    logger.error("Error Registering the device");
                    logger.debug(' -----------------------------------------------------------------------------------------------');
                } else {
                    logger.debug("Success in Registering Algorithms!");
                    //____________________IOTHub registration____________________
                    // Create a new device
                    var device = {
                        deviceId: computeEngineId
                    };
                    registry.create(device, function (err, deviceInfo, res) {
                        if (err) {
                            logger.error('error: ' + err.toString());
                            //if device already registered
                            registry.get(device.deviceId, function (err, deviceInfo, res) {
                                logger.debug("Got the device info\n");
                                var deviceConnectionString =
                                    config.iotHub.connectionString.split(';')[0] + ";DeviceId=" + deviceInfo.deviceId + ";SharedAccessKey=" + deviceInfo.authentication.symmetricKey.primaryKey;
                                topicSubscribe(deviceConnectionString);
                                pingMechanismInterval(config.serialKey);
                            });
                        }

                        if (res)
                            console.log(' status: ' + res.statusCode + ' ' + res.statusMessage);
                        if (deviceInfo) {
                            var deviceConnectionString = config.iotHub.connectionString.split(';')[0] + ";DeviceId=" + deviceInfo.deviceId + ";SharedAccessKey=" + deviceInfo.authentication.symmetricKey.primaryKey;
                            topicSubscribe(deviceConnectionString);
                            pingMechanismInterval(config.serialKey);
                        }
                    });
                    logger.debug(' -----------------------------------------------------------------------------------------------');
                }
            });
        }
    });
}


/**
 * Ping mechanism
 * @param {*} serialNo 
 */
var pingMechanismInterval = function (serialNo) {
    setInterval(function () {

        console.log('\n\n _________________________________  CLOUD COMPUTE ENGINE STARTED   ____________________________________\n\n');
        logger.debug(' -----------------------------------------------------------------------------------------------');
        logger.debug("Registering JETSON on Server....");
        var jetsonDetails = {
            "name": config.name,
            "deviceType": config.deviceType,
            "macId": config.serialKey,
            "ipAddress": ip.address(),
            "detectionAlgoritms": config.detectionAlgoritms,
            "cameraSupported": config.cameraSupported,
            "location": config.location,
            "supportedShapes": config.supportedShapes,
            "jetsonCamFolderLocation": config.camFolder,
            "wayToCommunicate": config.wayToCommunicate,
            "isCloudCompute": true
        };


        var options = {
            rejectUnauthorized: false,
            url: config.JetsonRegistrationURL,
            method: 'POST',
            json: jetsonDetails
        };
        request(options, function (error, response, body) {
            if (error) {
                logger.error("Error Registering the device");
            }
            else {
                var computeEngineId = response.body._id;
                logger.debug("Success in Registering!::computeEngineId ::", computeEngineId);
                config.tier = response.body.tier;
                // Setting default tier value
                if (config.tier == 0) {
                    config.endPoint = config.endPointFree;
                    config.textEndpoint = config.textEndpointFree;
                    config.faceApiSubscriptionKey = config.faceApiSubscriptionKeyFree;
                    config.textSubscriptionKey = config.textSubscriptionKeyFree;
                    logger.debug(" ***** PRICING TIER UPDATED TO FREE ******");

                }
                else if (config.tier == 1) {
                    config.endPoint = config.endPointStandard;
                    config.textEndpoint = config.textEndpointStandard;
                    config.faceApiSubscriptionKey = config.faceApiSubscriptionKeyStandard;
                    config.textSubscriptionKey = config.textSubscriptionKeyStandard;
                    logger.debug(" ***** PRICING TIER UPDATED TO STANDARD ******");
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

                /**
                 * Algorithm Registration 
                */
                var algorithmDetails = {
                    "computeEngineId": computeEngineId,
                    "detectionAlgorithms": config.detectionAlgorithms,
                }
                var optionsAlgo = {
                    rejectUnauthorized: false,
                    url: config.registerAlgorithm,
                    method: 'POST',
                    json: algorithmDetails
                };
                request(optionsAlgo, function (error, response, body) {
                    if (error) {
                        logger.error("Error Registering the device");
                        logger.debug(' -----------------------------------------------------------------------------------------------');
                    } else {
                        logger.debug("Success in Registering Algorithms!");
                        logger.debug(' -----------------------------------------------------------------------------------------------');
                    }
                });
            }

        });
    }, config.pingInterval);
}


//Create a new facelist if does not exists - Free

var reqBody = {
    "name": config.faceListName,
    "userData": config.faceListUserData
}
var headers =
    {
        'Ocp-Apim-Subscription-Key': config.faceApiSubscriptionKeyFree,
        'Content-Type': 'application/json'
    }
var optionsCreateApi =
    {
        url: config.createFacelistRecognitionFree,
        method: 'PUT',
        headers: headers,
        json: reqBody
    }
request(optionsCreateApi, function (error, response, body) {
    if (!error) {
        if (!body) {
            logger.debug('FaceList created in FREE TIER ');
        }
        else {
            if (body.error.code == 'FaceListExists') {
                logger.error('FaceList already Exists - FREE TIER ');
            }
        }
    }
    else {
        logger.error("Error in creating FaceList in FREE TIER : ", error);
    }
})

//Create a new facelist if does not exists - Standard

var reqBodyStandard = {
    "name": config.faceListName,
    "userData": config.faceListUserData
}
var headersStandard =
    {
        'Ocp-Apim-Subscription-Key': config.faceApiSubscriptionKeyStandard,
        'Content-Type': 'application/json'
    }
var optionsCreateApiStandard =
    {
        url: config.createFacelistRecognitionStandard,
        method: 'PUT',
        headers: headersStandard,
        json: reqBodyStandard
    }
request(optionsCreateApiStandard, function (error, response, body) {
    if (!error) {
        if (!body) {
            logger.debug('FaceList created in STANDARD TIER ');
        }
        else {
            if (body.error.code == 'FaceListExists') {
                logger.error('FaceList already Exists - STANDARD TIER ');
            }
        }
    }
    else {
        logger.error("Error in creating FaceList in STANDARD TIER : ", error);
    }
})

//Create new container for BLOB if does not exists

blobStorage.createContainerIfNotExists(config.blobContainerName, {
    publicAccessLevel: 'container'
},
    function (error, result, response) {

        if (error) {
            logger.error('Error : ', error);
            // logger.debug(' -----------------------------------------------------------------------------------------------');
            //process.exit();
        }
        else if (result.created == true) {
            logger.debug('Container Created for Storing BLOB.');
            // logger.debug(' -----------------------------------------------------------------------------------------------');
        }
        else {
            logger.error('Container already Exists !!!');
            // logger.debug(' -----------------------------------------------------------------------------------------------');
        }
    });

