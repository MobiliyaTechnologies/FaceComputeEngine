
/**
 * For cloudComputeEngine Node server code
 */
var config = {};

config.port = 5004;
config.backendHost = process.env.CUSTOMCONNSTR_backendHost;
config.endPoint = process.env.CUSTOMCONNSTR_faceApiBaseUrl;
config.errorStatus = 429;
config.successStatus = 200;
config.serialKey = process.env.CUSTOMCONNSTR_serialKey;

config.blobUri =  process.env.CUSTOMCONNSTR_blobUri;
config.blobContainerName =  'facerecognition';
config.blobStorageAccessKey = process.env.CUSTOMCONNSTR_blobStorageAccessKey;
config.blobStorageAccountName = process.env.CUSTOMCONNSTR_blobStorageAccountName;
config.faceListId = '0';
config.faceListName = 'SnS_facelist';
config.faceListUserData = 'User-provided data attached to the face list.';


config.faceDetectionUrl = config.endPoint + "detect?returnFaceId=true&returnFaceLandmarks=false&returnFaceAttributes=age,gender,emotion";
config.addFacesUrl = config.endPoint +  "facelists/"+config.faceListId+"/persistedFaces?userData=";
config.findSimilarUrl = config.endPoint + "findsimilars";
config.getUserlistUrl = config.endPoint + "facelists/";
config.getFacelistUrl = config.backendHost+"/devices/faces?status=1";
config.faceApiContentTypeHeader = "application/octet-stream";
config.faceApiSubscriptionKey = process.env.CUSTOMCONNSTR_faceApiSubscriptionKey;



// Smit's Account
config.endpointRecognition = config.endPoint;
config.faceDetectionUrlRecognition = config.faceDetectionUrl;
config.addFacesUrlRecognition = config.endPoint + "facelists/"+config.faceListId+"/persistedFaces?userData=";
config.findSimilarUrlRecognition = config.endPoint + "findsimilars";
config.getUserlistUrlRecognition = config.endPoint + "facelists/";
config.faceApiSubscriptionKeyRecognition = process.env.CUSTOMCONNSTR_faceApiSubscriptionKey;
config.createFacelistRecognition = config.endPoint + "facelists/"+config.faceListId;

config.logger = {
    "service": "SS",
    "logDirPath": "./logs",
    "debugLevel": 3,
    "infoLevel": 2,
    "warnLevel": 1,
    "errorLevel": 0,
    "maxSize": 5242880
};

config.name = "CE_FaceRecognition";
config.deviceType = "Cloud Compute Engine";
config.cameraSupported = 3;
config.location = "AzureWebServices";
config.wayToCommunicate ="restAPI";
config.detectionAlgorithms = [{
    "featureName": "faceRecognition",
    "fps": 0.33,
    "shapeSupported":[1],
    "cloudServiceUrl": process.env.CUSTOMCONNSTR_cloudServiceUrl + "faces/recognize"
   },{
    "featureName": "faceDetection",
    "fps": 0.33,
    "shapeSupported":[1],
    "cloudServiceUrl": process.env.CUSTOMCONNSTR_cloudServiceUrl + "faces"

   }];

config.JetsonRegistrationURL = config.backendHost + "/devices/computeengines";
config.registerAlgorithm = config.backendHost + "/devices/computeengines/algorithm";
   

module.exports = config;