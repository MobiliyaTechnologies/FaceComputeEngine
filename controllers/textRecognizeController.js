var request = require('request');
var config = require('../settings');
var fs = require('fs');
var logger = require('../logger/index').logger;
var iotHubAMQP =  require('../communication/IOTHub.js');
var logStr = 'CloudComputeEngine_TextRecognition';


//____________________________________________________________________________________________
/*
Image Processing 
*/

var storeImage = function (req) {
    imageProcessing(req.imageUrl,req.imageName,req.areaOfInterest, req.imageConfig, req.deviceName, req.userId, req.camId,req.timestamp);
};

function imageProcessing(imageData,imageName, areaOfInterest, configurations, deviceName, userId, camId,timeStamp) {
    logger.debug("  ** IMAGE PROCESSING **  ");
    var imageConfig = configurations;
    var widthMultiplier = imageConfig.ImageWidth / 100;
    var heightMultiplier = imageConfig.ImageHeight / 100;

    /*
    URL generation and API CALL
    */
    var post1 = { "url": imageData };
    var headers =
        {
            'Ocp-Apim-Subscription-Key': config.textSubscriptionKey,
            'Content-Type': config.textApiContentTypeHeaderJson
        }

    var optionsTextApi =
        {
            url: config.textRecognize,
            method: 'POST',
            headers: headers,
            json: post1
        }

    var textRecognitionResult = {};
    var bboxResults = [];
    request(optionsTextApi, function (error, response, body) {

        textRecognitionResult.imageName = imageName;
        textRecognitionResult.bboxResults = [];
        textRecognitionResult.totalCount = 0;
        textRecognitionResult.deviceName = deviceName;
        textRecognitionResult.timestamp = timeStamp;
        textRecognitionResult.feature = areaOfInterest[0].featureName;
        textRecognitionResult.userId = userId;
        textRecognitionResult.camId = camId;
        textRecognitionResult.results = [];
        textRecognitionResult.imageWidth = imageConfig.ImageWidth;
        textRecognitionResult.imageHeight = imageConfig.ImageHeight;
        textRecognitionResult.imageUrl = imageData;
        textRecognitionResult.imageName = imageName;

        
        if(response.headers['operation-location'].length != 0)
        {
        logger.debug("Checkbody : ",response.headers['operation-location']);
        var checkBody = response.headers['operation-location']//respHeaders[9];
        
        var boundingBoxes = [];
        var countPerBbox = [];

        if (!error && checkBody.length != 0) {

            if (response && ((response.statusCode == config.successStatus) || (response.statusCode == config.successStatus2))) {

                getAllText(checkBody, function (results) {

                    var parsedJson = JSON.parse(results[0]);

                    if (parsedJson != null) {

                        var lines = parsedJson.recognitionResult.lines;
                        var linesArray = [];
                        var countPerBbox = [];


                        if (lines) {

                            areaOfInterest.forEach(function (aoi) {
                                var tempCountPerBbox = {};
                                tempCountPerBbox.areaOfInterestId = aoi._id;
                                tempCountPerBbox.count = 0;

                                var tempbboxResults = {};
                                tempbboxResults.count = 0;
                                tempbboxResults.markerName = aoi.markerName;
                                tempbboxResults.tagName = aoi.tagName;

                                lines.forEach(function (lineObj, i) {
                                    //       if (lineObj.text.length >= 10) {
                                    var x1 = lineObj.boundingBox[0];
                                    var y1 = lineObj.boundingBox[1];
                                    var x2 = lineObj.boundingBox[2];
                                    var y2 = lineObj.boundingBox[3];
                                    var x3 = lineObj.boundingBox[4];
                                    var y3 = lineObj.boundingBox[5];
                                    var x4 = lineObj.boundingBox[6];
                                    var y4 = lineObj.boundingBox[7];

                                    var Xnew = x1;
                                    var Ynew = y1;
                                    var width, height;

                                    if (Math.abs(x4 - x3) >= Math.abs(x1 - x2)) {
                                        width = Math.abs(x4 - x3);
                                    }
                                    else {
                                        width = Math.abs(x1 - x2);
                                    }


                                    if (Math.abs(y1 - y4) >= Math.abs(y2 - y3)) {
                                        height = Math.abs(y1 - y4);
                                    }
                                    else {
                                        height = Math.abs(y2 - y3);
                                    }

                                    var bboxNew = [];
                                    var bboxesWord = {};
                                    var tempArray = {};

                                    bboxesWord.x1 = parseInt(Xnew);
                                    bboxesWord.y1 = parseInt(Ynew);
                                    bboxesWord.x2 = parseInt(width);
                                    bboxesWord.y2 = parseInt(height);

                                    tempArray.x1 = (parseInt(Xnew) / widthMultiplier);
                                    tempArray.y1 = (parseInt(Ynew) / heightMultiplier);
                                    tempArray.x2 = ((parseInt(Xnew) + parseInt(width)) / widthMultiplier);
                                    tempArray.y2 = ((parseInt(Ynew) + parseInt(height)) / heightMultiplier);

                                    if (aoi.x <= tempArray.x1 && aoi.y <= tempArray.y1 && aoi.x2 >= tempArray.x2 && aoi.y2 >= tempArray.y2) {
                                        tempCountPerBbox.count = tempCountPerBbox.count + 1;
                                        tempbboxResults.count = tempbboxResults.count + 1;
                                        var lobj =
                                            {
                                                "line": lineObj.text,
                                                "boundingBox": bboxesWord,
                                                "length": lineObj.text.length
                                            }

                                        linesArray.push(lobj);
                                    }
                                    //  }
                                });

                                countPerBbox.push(tempCountPerBbox);
                                bboxResults.push(tempbboxResults);

                            });

                            textRecognitionResult.boundingBoxes = linesArray;
                            textRecognitionResult.totalCount = linesArray.length;
                            textRecognitionResult.countPerBbox = countPerBbox;
                            textRecognitionResult.bboxResults = bboxResults;
                            console.log("LinesOBJ ARRAY = ", textRecognitionResult);
                            iotHubAMQP.sendResultToIotHub(textRecognitionResult);
                        }
                        else {
                            logger.error("Error in textAPI connection or No text found !!::\n", error);   
                            iotHubAMQP.sendResultToIotHub(textRecognitionResult);
                        }


                    }
                    else {

                          logger.error("Error in textAPI - PARSED jSON IS NULL", error);
                          iotHubAMQP.sendResultToIotHub(textRecognitionResult);
                    }

                })
            }

            else {
                logger.error("Error in textAPI connection \n", error);
                iotHubAMQP.sendResultToIotHub(textRecognitionResult);
            }
        }
        else {
            logger.error("Error in textAPI connection or No Data \n", error);
            iotHubAMQP.sendResultToIotHub(textRecognitionResult);
        }
        }
        else
        {   
            logger.debug("NO TEXT DETECTED");
            iotHubAMQP.sendResultToIotHub(textRecognitionResult);
        }

    });

}



var getAllText = function (detectedTextUrl, callback) {

    var promiseArray = [];
    if (detectedTextUrl.length != 0) {
        promiseArray.push(getResult(detectedTextUrl));
    }
    else {
        logger.error(" Detected text are null : ", detectedTextUrl);
    }


    Promise.all(promiseArray).then(function (result) {
        callback(result);
    }).catch(function (error) {
        logger.error("Error in getAllText : ", error);
    });
}


/*
*  Find text
*/
var result = [];

var getResult = function (detectedTextUrl) {

    return new Promise((resolve, reject) => {
        getTextUsingUrl(detectedTextUrl, function (error, textHere) {
            if (error) {
                reject(error);
            }
            else {
                resolve(textHere);
            }
        });
    });
}



function getTextUsingUrl(urlHere, callback) {


    var headers =
        {
            'Ocp-Apim-Subscription-Key': config.textSubscriptionKey,
            'Content-Type': 'application/json'
        }
    var options =
        {
            url: urlHere,
            method: 'GET',
            headers: headers,
        }
    request(options, function (error, response, body) {

        if (!error) {
            if (response && ((response.statusCode == config.successStatus) || (response.statusCode == config.successStatus2))) {
                console.log("------------------------------------------------------------");
                var respbody = JSON.parse(body);
                console.log("REPONSE status ::: ", respbody.status);
                console.log("------------------------------------------------------------");
                if (respbody.status == 'Succeeded') {
                    callback(null, body);
                }
                else {
                    getTextUsingUrl(urlHere, callback);
                }

            }
            else {
                logger.error("Rate Limit Exceeded. Please try again later");
                callback(error, null);
            }

        }
        else {
            logger.error("Error in getTextUsingUrl : ", error);
            callback(error, null);
        }
    })
}
exports.processImage = storeImage;

