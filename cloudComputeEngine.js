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
var port = config.port;
if (process.env && process.env.PORT) { port = process.env.PORT }
var blobStorage = azure.createBlobService(config.blobStorageAccountName, config.blobStorageAccessKey);


app.use(bodyParser.json());
app.use(fileUpload());
app.use(express.static(path.join(__dirname, 'Cameras')));

/**
 * Invoking routes
 */
faceRoutes(app);


app.listen(port);

//Compute Engine's ping Mechanism
registerOnJetson();

setInterval(registerOnJetson, 900000); // 15 mins

function registerOnJetson() {

    //serial.getSerial(function (err, value) {
        console.log('\n\n _________________________________  CLOUD COMPUTE ENGINE STARTED   ____________________________________\n\n');
        logger.debug(' -----------------------------------------------------------------------------------------------');
        logger.debug("Registering JETSON on Server....");
        var jetsonDetails = {
            "name": config.name +"_"+ config.serialKey,
            "deviceType": config.deviceType,
            "macId": config.serialKey,
            "ipAddress": ip.address(),
            "detectionAlgoritms": config.detectionAlgoritms,
            "cameraSupported": config.cameraSupported,
            "location": config.location,
            "supportedShapes": config.supportedShapes,
            "jetsonCamFolderLocation": config.camFolder,
            "wayToCommunicate": config.wayToCommunicate

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
   // });

}


//Create a new facelist if does not exists

var reqBody = {
    "name": config.faceListName,
    "userData": config.faceListUserData
}
var headers =
    {
        'Ocp-Apim-Subscription-Key': config.faceApiSubscriptionKeyRecognition,
        'Content-Type': 'application/json'
    }
var optionsCreateApi =
    {
        url: config.createFacelistRecognition,
        method: 'PUT',
        headers: headers,
        json: reqBody
    }
request(optionsCreateApi, function (error, response, body) {
    if (!error) {
        if (!body) {
            logger.debug('FaceList created !!! ');
        }
        else {
            if (body.error.code == 'FaceListExists') {
                logger.error('FaceList already Exists !!! ');
            }
        }
    }
    else {
        logger.error("Error in creating FaceList : ", error);
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
            logger.debug('Container already Exists !!!');
           // logger.debug(' -----------------------------------------------------------------------------------------------');
        }
    });