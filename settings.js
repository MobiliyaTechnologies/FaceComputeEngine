
/**
 * For cloudComputeEngine Node server code
 */
var config = {};

config.port = 5004;
config.backendHost = process.env.CUSTOMCONNSTR_backendHost;
config.errorStatus = 429;
config.successStatus = 200;
config.successStatus2 = 202;
config.serialKey = process.env.CUSTOMCONNSTR_serialKey;
config.pingInterval = 900000; 
config.tier = 0;

config.blobUri =  process.env.CUSTOMCONNSTR_blobUri;
config.blobContainerName =  'facerecognition';
config.blobStorageAccessKey = process.env.CUSTOMCONNSTR_blobStorageAccessKey;
config.blobStorageAccountName = process.env.CUSTOMCONNSTR_blobStorageAccountName;
config.faceListId = '0';
config.faceListName = 'SnS_facelist';
config.faceListUserData = 'User-provided data attached to the face list.';

//EvenHub Connection string
config.evenHubConnectionString = process.env.CUSTOMCONNSTR_evenHubConnectionString;
config.eventHubName = process.env.CUSTOMCONNSTR_eventHubName;

//IOTHUB registration
config.iotHub = {
    connectionString:  process.env.CUSTOMCONNSTR_iotHubConnectionString
};


//Endpoint and subscription keys
config.endPointFree = process.env.CUSTOMCONNSTR_faceApiBaseUrlFree;
config.faceApiSubscriptionKeyFree = process.env.CUSTOMCONNSTR_faceApiSubscriptionKeyFree;

config.endPointStandard = process.env.CUSTOMCONNSTR_faceApiBaseUrlStandard;
config.faceApiSubscriptionKeyStandard = process.env.CUSTOMCONNSTR_faceApiSubscriptionKeyStandard;

config.textEndpointFree = process.env.CUSTOMCONNSTR_textApiBaseUrlFree;
config.textSubscriptionKeyFree = process.env.CUSTOMCONNSTR_textApiSubscriptionKeyFree;

config.textEndpointStandard = process.env.CUSTOMCONNSTR_textApiBaseUrlStandard;
config.textSubscriptionKeyStandard = process.env.CUSTOMCONNSTR_textApiSubscriptionKeyStandard;

config.createFacelistRecognitionFree = config.endPointFree + "facelists/"+config.faceListId;
config.createFacelistRecognitionStandard = config.endPointStandard + "facelists/"+config.faceListId;


//By default free tier
config.endPoint = config.endPointFree;
config.textEndpoint = config.textEndpointFree;
config.faceApiSubscriptionKey = config.faceApiSubscriptionKeyFree;
config.textSubscriptionKey = config.textSubscriptionKeyFree;


// Face Detection
config.getFacelistUrl = config.backendHost+"/devices/faces?status=1";
config.faceApiContentTypeHeader = "application/octet-stream";
config.faceApiContentTypeHeaderJson = "application/json";


//Text recognition
config.textApiContentTypeHeader = "application/octet-stream";
config.textApiContentTypeHeaderJson = "application/json";
config.getTextResult = config.textEndpoint + "textOperations/";


config.logger = {
    "service": "SS",
    "logDirPath": "./logs",
    "debugLevel": 3,
    "infoLevel": 2,
    "warnLevel": 1,
    "errorLevel": 0,
    "maxSize": 5242880
};

config.name = "Face_Text_Recognition";
config.deviceType = "Cloud Compute Engine";
config.cameraSupported = 3;
config.location = "AzureWebServices";
config.wayToCommunicate ="restAPI";
config.detectionAlgorithms = [{
    "featureName": "faceRecognition",
    "fps": 0.33,
    "shapeSupported":[1]
   },{
    "featureName": "faceDetection",
    "fps": 0.33,
    "shapeSupported":[1]
   },
{
    "featureName": "textRecognition",
    "fps": 0.33,
    "shapeSupported":[1]
   }];

config.JetsonRegistrationURL = config.backendHost + "/devices/computeengines";
config.registerAlgorithm = config.backendHost + "/devices/computeengines/algorithm";
   
module.exports = config;