var request = require('request');
var azure = require('azure-storage');
const Readable = require('stream').Readable;
var fs = require("fs");
var streamifier = require('../lib/index');

var config = require('../settings');
var fs = require('fs');
var logger = require('../logger/index').logger;
var logStr = 'CloudComputeEngine';
var faceList = [];
var faceList2 = [];
var FaceApicounter = 0;
var blobService = azure.createBlobService(config.blobStorageAccountName, config.blobStorageAccessKey, config.blobUri);


/**________________________________________________________________________________
 * API to upload image
 */
var storeImage = function (req, res) {
    if (!req.files)
        return res.status(400).send('No files were uploaded.');
    let sampleFile = req.files.file;

    var imageName = req.files.file.name
    var imageData = req.files.file.data;
    imageProcessing(imageData, imageName, req.body.timestamp, JSON.parse(req.body.areaOfInterest), req.body.targetUrl, req.body.imageConfig, req.body.deviceName, req.body.userId, req.body.camId);
    res.send({ 'result': 'File accepted !' });
};


/**____________________________________________________________________________________________
 * Image Processing 
 */

function imageProcessing(imageData, imageName, timeStamp, areaOfInterest, targetUrl, configurations, deviceName, userId, camId) {
    logger.debug("  ** IMAGE PROCESSING **  \n Username : ", userId);
    var faceDetectionResult = {};
    var imageConfig = JSON.parse(configurations);
    var widthMultiplier = imageConfig.ImageWidth / 100;
    var heightMultiplier = imageConfig.ImageHeight / 100;
    var message;
    var finalResult;
    // var base64data = new Buffer(imageData, 'binary').toString('base64');
    // var base64Img = 'data:image/jpg;base64,' + base64data;


    var headers =
        {
            'Ocp-Apim-Subscription-Key': config.faceApiSubscriptionKeyRecognition,
            'Content-Type': config.faceApiContentTypeHeader
        }

    var optionsFaceApi =
        {
            url: config.faceDetectionUrlRecognition,
            method: 'POST',
            headers: headers,
            body: imageData,
            // json: post1
        }

    getFaces(function (error, body) {
        if (!error) {
            //console.log("Facelist mongo: ",faceList);
            //faceList = body           
            if (body.length != 0) {
                if (body.message) {
                    logger.error("Facelist is empty");;
                }
                else {
                    faceList = body;
                }
            }

        }
    });

    var faceResult = [];
    var bboxResults = [];
    request(optionsFaceApi, function (error, response, body) {
        var checkBody = JSON.parse(body.toString());
        logger.debug("Checkbody : ", checkBody);


        faceDetectionResult.imageName = imageName;
        faceDetectionResult.bboxResults = [];
        faceDetectionResult.totalCount = 0;
        faceDetectionResult.deviceName = deviceName;
        faceDetectionResult.timestamp = timeStamp;
        faceDetectionResult.feature = areaOfInterest[0].featureName;
        faceDetectionResult.userId = userId;
        faceDetectionResult.camId = camId;
        faceDetectionResult.imageWidth = imageConfig.ImageWidth;
        faceDetectionResult.imageHeight = imageConfig.ImageHeight;


        if (!error && checkBody.length != 0) {
            if (response && (response.statusCode == config.successStatus)) {
                logger.debug("Image is processed ...", body.toString());
                body = JSON.parse(body.toString());
                getAllSimilerFaces(body, function (results) {

                    var faceCount = body.length;
                    faceDetectionResult.totalCount = faceCount;

                    var boundingBoxes = [];
                    var countPerBbox = [];


                    if (faceCount != 0) {

                        results.forEach(function (person) {
                            areaOfInterest.forEach(function (aoi) {
                                var tempCountPerBbox = {};
                                tempCountPerBbox.areaOfInterestId = aoi._id;
                                tempCountPerBbox.count = 0;

                                var tempbboxResults = {};
                                tempbboxResults.count = 0;
                                tempbboxResults.markerName = aoi.markerName;
                                tempbboxResults.tagName = aoi.tagName;


                                body.forEach(function (detectedface, i) {
                                    // if(i<2)
                                    // {
                                    var finalBoxes = {};
                                    finalBoxes.x1 = (detectedface.faceRectangle.left).toString();
                                    finalBoxes.y1 = (detectedface.faceRectangle.top).toString();
                                    finalBoxes.x2 = ((detectedface.faceRectangle.left + detectedface.faceRectangle.width)).toString();
                                    finalBoxes.y2 = ((detectedface.faceRectangle.top + detectedface.faceRectangle.height)).toString();

                                    var tempArray = {};
                                    tempArray.x1 = (detectedface.faceRectangle.left / widthMultiplier);
                                    tempArray.y1 = (detectedface.faceRectangle.top / heightMultiplier);
                                    tempArray.x2 = ((detectedface.faceRectangle.left + detectedface.faceRectangle.width) / widthMultiplier);
                                    tempArray.y2 = ((detectedface.faceRectangle.top + detectedface.faceRectangle.height) / heightMultiplier);
                                    /**
                                     * Area of interest constraints checking
                                     */

                                    if (aoi.x <= tempArray.x1 && aoi.y <= tempArray.y1 && aoi.x2 >= tempArray.x2 && aoi.y2 >= tempArray.y2) {
                                        tempCountPerBbox.count = tempCountPerBbox.count + 1;
                                        tempbboxResults.count = tempbboxResults.count + 1;
                                        if (detectedface.faceId == person.faceId) {

                                            if (person.userData != 'Unknown') {
                                                boundingBoxes.push({
                                                    "areaOfInterestId": aoi._id,
                                                    "id": detectedface.faceId,
                                                    "bboxes": finalBoxes,
                                                    "age": detectedface.faceAttributes.age,
                                                    "gender": detectedface.faceAttributes.gender,
                                                    "userData": person.userData,
                                                    "flag": person.flag,
                                                    "faceId": detectedface.faceId,
                                                    "persistedFaceId": detectedface.persistedFaceId,
                                                    "faceRectangle": detectedface.faceRectangle,
                                                    "deviceName": deviceName,
                                                    "feature": aoi.featureName,
                                                    "userId": userId,
                                                    "timestamp": timeStamp
                                                });

                                            }
                                            else {
                                                boundingBoxes.push({
                                                    "areaOfInterestId": aoi._id,
                                                    "id": detectedface.faceId,
                                                    "bboxes": finalBoxes,
                                                    "age": detectedface.faceAttributes.age,
                                                    "gender": detectedface.faceAttributes.gender,
                                                    "userData": person.userData,
                                                    "flag": false,
                                                    "faceId": detectedface.faceId,
                                                    "faceRectangle": detectedface.faceRectangle,
                                                    "deviceName": deviceName,
                                                    "feature": aoi.featureName,
                                                    "userId": userId,
                                                    "timestamp": timeStamp
                                                });

                                            }
                                        }
                                    }
                                });
                                countPerBbox.push(tempCountPerBbox);
                                bboxResults.push(tempbboxResults);
                                //}
                            });
                            faceDetectionResult.totalCount = boundingBoxes.length;
                            faceDetectionResult.countPerBbox = countPerBbox;
                            faceDetectionResult.bboxResults = bboxResults;
                            faceDetectionResult.boundingBoxes = boundingBoxes;

                        })
                    }

                    var optionsSendResult =
                        {
                            rejectUnauthorized: false,
                            url: targetUrl,
                            method: 'POST',
                            json: faceDetectionResult
                        }

                    request(optionsSendResult, function (error, response, body) {

                        if (error)
                            logger.error("Error sending result to target url : ", error);
                        else
                            logger.debug("Result wired to target url  :  ", faceDetectionResult);
                    });
                })

            }
            else {
                logger.error("Rate Limit Exceeded. Please try again after 30 seconds. [ detectFaces ]");

                var optionsSendResult =
                    {
                        rejectUnauthorized: false,
                        url: targetUrl,
                        method: 'POST',
                        json: faceDetectionResult
                    }

                request(optionsSendResult, function (error, response, body) {
                    if (error)
                        logger.error("Error sending result to target url : ", error);
                    else
                        logger.debug("Live Result wired to target url : ", faceDetectionResult);
                });
            }
        }
        else {
            logger.error("Error in FaceAPI connection or No faces found !!::\n", error);
            var optionsSendResult =
                {
                    rejectUnauthorized: false,
                    url: targetUrl,
                    method: 'POST',
                    json: faceDetectionResult
                }

            request(optionsSendResult, function (error, response, body) {
                if (error)
                    logger.error("Error sending result to target url : ", error);
                else
                    logger.debug("Live Result wired to target url : ", faceDetectionResult);
            });
        }
    });

}

/*
*  Find Similar Faces
*/
var result = [];

var searchSimilerFaceByFaceId = function (detectedFace) {
    return new Promise((resolve, reject) => {
        findSimilarByFaceId(detectedFace.faceId, function (error, similiarFaces) {
            if (error) {
                reject(error);
            }
            findFaceDetail(faceList, similiarFaces, function (picked) {

                if (picked) {
                    logger.debug("************ picked :::::::::::: ", picked.flag);
                    detectedFace.userData = picked.userData;
                    detectedFace.persistedFaceId = picked.persistedFaceId;
                    detectedFace.flag = picked.flag;
                    logger.debug("Face Match Found !!!! ::", picked.userData);
                }
                else {

                    detectedFace.userData = 'Unknown';
                    detectedFace.flag = false;
                    logger.debug("Face Match Not Found !!!!");
                }
                resolve(detectedFace);
            });
        });
    });
}

var getAllSimilerFaces = function (detectedFaces, callback) {

    var promiseArray = [];
    if (detectedFaces.length != 0) {

        detectedFaces.forEach((faceObj) => {
            promiseArray.push(searchSimilerFaceByFaceId(faceObj));
        });
    }
    else {
        logger.error(" Detected faces are null : ", detectedFaces);
    }


    Promise.all(promiseArray).then(function (result) {
        callback(result);
    }).catch(function (error) {
        logger.error("Error in getAllSimilarFaces : ", error);
    });

}

/**
 * Find Faces by FaceID
 */
function findSimilarByFaceId(id, callback) {

    var reqBody = {
        "faceId": id,
        "faceListId": config.faceListId,
        "maxNumOfCandidatesReturned": 1,
        "mode": "matchPerson"
    }
    var headers =
        {
            'Ocp-Apim-Subscription-Key': config.faceApiSubscriptionKeyRecognition,
            'Content-Type': 'application/json'
        }
    var options =
        {
            url: config.findSimilarUrlRecognition,
            method: 'POST',
            headers: headers,
            json: reqBody
        }
    request(options, function (error, response, body) {

        if (!error) {
            if (response && (response.statusCode == config.successStatus)) {
                callback(null, body);
            }
            else {
                logger.error("Rate Limit Exceeded. Please try again after 30 seconds. [ FindSimilarByFaceId]");
                callback(error, null);
            }

        }
        else {
            logger.error("Error in findSimiliar : ", error);
            FaceApicounter = 0;
            callback(error, null);
        }
    })
}

/**
 * Find Face Details
 */
function findFaceDetail(facelist, similiarFaces, callback) {
    if (facelist.length != 0) {
        facelist.forEach(item => {
            logger.debug("PersistedFaceID from mongo : ", item.persistedFaceId);
        });

        if (facelist.length > 0) 
        {
            logger.debug("Similar Faces List: ", similiarFaces);
            if (similiarFaces) 
            {
                if (similiarFaces.length > 0) {
                    if (similiarFaces[0].confidence >= 0.5) 
                    {
                        var picked = facelist.find(o => o.persistedFaceId === similiarFaces[0].persistedFaceId);
                        if (picked) {
                            callback(picked);
                        }
                        else {
                            callback(null);
                        }
                    }
                    else 
                    {
                        callback(null);
                    }
                }
                else 
                {
                    callback(null);
                }
            }
            else 
            {
                callback(null);
            }
        }
        else 
        {
            callback(null);
        }
    }
    else {
        callback(null);
    }

}


/**
 * Get Face List
 */

function getFaceListByID(id, callback) {

    var headers =
        {
            'Ocp-Apim-Subscription-Key': config.faceApiSubscriptionKeyRecognition,
            'Content-Type': 'application/json'
        }
    var options =
        {
            url: config.getFacelistUrlRecognition + id,
            method: 'GET',
            headers: headers,
        }
    request(options, function (error, response, body) {

        if (!error) {
            logger.debug("Facelist : ", JSON.parse(body).persistedFaces);
            //res.send(body);
            callback(null, JSON.parse(body).persistedFaces);
        }
        else {
            logger.error("Error in getFaceList : ", error);
            FaceApicounter = 0;
            callback(error, null);
            //res.send(error);
        }
    })
}


function getFaces(callback) {
    var headers =
        {
            'Content-Type': 'application/json'
        }
    var options =
        {
            url: config.getFacelistUrl,
            method: 'GET',
            headers: headers,
        }
    request(options, function (error, response, body) {

        if (body.length !== 0) {
            callback(null, JSON.parse(body));
        }
        else {
            logger.error("Error in getFaces => Backend is unavailable ::", error);
            callback(error, null);
            //res.send(error);
        }
    })
}



exports.processImage = storeImage;
// exports.createFacelist = create;
