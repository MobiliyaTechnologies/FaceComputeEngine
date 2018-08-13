var request = require('request');
var config = require('../settings');
var fs = require('fs');
var logger = require('../logger/index').logger;
var logStr = 'CloudComputeEngine_FaceDetection';
var iotHubAMQP =  require('../communication/IOTHub.js');

/**________________________________________________________________________________
 * API to upload image
 */

var storeImage = function (req) {
    imageProcessing(req.imageUrl,req.imageName,req.areaOfInterest, req.imageConfig, req.deviceName, req.userId, req.camId,req.timestamp);
};

//____________________________________________________________________________________________
/*
Image Processing 
*/
function imageProcessing(imageData,imageName,areaOfInterest, configurations, deviceName, userId, camId,timeStamp) {
    logger.debug("  ** IMAGE PROCESSING **  ");
    var faceDetectionResult={};
    var imageConfig = configurations;
    var widthMultiplier =  imageConfig.ImageWidth / 100;
    var heightMultiplier = imageConfig.ImageHeight / 100;

    /*
    URL generation and API CALL
    */
    var post1 = { "url": imageData };
    var message;
    var finalResult;
    var bboxResults = [];

        var headers =
        {
            'Ocp-Apim-Subscription-Key': config.faceApiSubscriptionKey,
            'Content-Type': config.faceApiContentTypeHeaderJson
        }

        var optionsFaceApi =
        {
            url: config.faceDetectionUrl,
            method: 'POST',
            headers: headers,
            json: post1
        }
   
        request(optionsFaceApi, function (error, response, body) {

            faceDetectionResult.imageName = imageName;
            faceDetectionResult.bboxResults = [];
            faceDetectionResult.timeStamp = timeStamp;            
            faceDetectionResult.totalCount = 0;
            faceDetectionResult.deviceName = deviceName;
            faceDetectionResult.camId = camId;
            faceDetectionResult.feature = areaOfInterest[0].featureName;
            faceDetectionResult.userId = userId;
            faceDetectionResult.imageUrl = imageData;
            faceDetectionResult.imageName = imageName;

            if(body.length != 0)
            {
              
            if (!error && response.statusCode == 200) 
            {
                logger.debug("Image is processed ...",body.toString());
                body = body;
                /**
                 * RESULT GENERATION
                 */
                var faceCount=body.length;      
                faceDetectionResult.totalCount = faceCount;

                var boundingBoxes = [];
                var countPerBbox = [];  

                if(faceCount!=0)
                {
                    areaOfInterest.forEach(function(aoi)
                    {
                        var tempCountPerBbox = {};
                        tempCountPerBbox.areaOfInterestId =  aoi._id;
                        tempCountPerBbox.count = 0;

                        var tempbboxResults = {};
                        tempbboxResults.count = 0;
                        tempbboxResults.markerName = aoi.markerName;
                        tempbboxResults.tagName = aoi.tagName;                        
                        
                        body.forEach(function(detectedface, i){
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

                            logger.debug("\nTemporary Array of AoI ::",tempArray);
                            /**
                             * Area of interest constraints checking
                             */
                            logger.debug("Base AOI :: ",aoi);
                            //    if((aoi.x * imageConfig.frameWidth / 100 ) <= tempArray.x1 && (aoi.y * imageConfig.frameHeight/100)<=tempArray.y1 && (aoi.x2 * imageConfig.frameWidth /100)>=tempArray.x2 && (aoi.y2 * imageConfig.frameHeight/100)>=tempArray.y2)
                            if(aoi.x<=tempArray.x1 && aoi.y<=tempArray.y1 && aoi.x2>=tempArray.x2 && aoi.y2>=tempArray.y2)
                            {
                                
                                tempCountPerBbox.count = tempCountPerBbox.count + 1;
                                tempbboxResults.count = tempbboxResults.count + 1;
                                boundingBoxes.push({
                                    "areaOfInterestId" : aoi._id,
                                    "id" : detectedface.faceId,
                                    "bboxes" : finalBoxes,
                                    "age" : detectedface.faceAttributes.age,
                                    "gender" : detectedface.faceAttributes.gender,
                                    "deviceName":deviceName,
                                    "feature":aoi.featureName,
                                    "userId":userId,
                                    "timestamp":timeStamp
                                    });
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

                }

                logger.debug("Final Result ::",JSON.stringify(faceDetectionResult));
                iotHubAMQP.sendResultToIotHub(faceDetectionResult);
            }
            else 
            {
                logger.error("Error in FaceAPI connection !!::\n", error);
                iotHubAMQP.sendResultToIotHub(faceDetectionResult);    
            }
            }
            else
            {
                iotHubAMQP.sendResultToIotHub(faceDetectionResult);
            }
        });

}

exports.processImage = storeImage;
