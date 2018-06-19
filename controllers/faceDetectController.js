var request = require('request');
var config = require('../settings');
var fs = require('fs');
var logger = require('../logger/index').logger;
var logStr = 'CloudComputeEngine';

/**________________________________________________________________________________
 * API to upload image
 */

var storeImage = function(req, res) {
  if (!req.files)
    return res.status(400).send('No files were uploaded.');
  let sampleFile = req.files.file;
  logger.debug("File received with name :: ",req.files.file.name);

    var imageName = req.files.file.name
    var imageData = req.files.file.data;
    imageProcessing(imageData,imageName, req.body.timestamp, JSON.parse(req.body.areaOfInterest), req.body.targetUrl, req.body.imageConfig,req.body.deviceName,req.body.userId,req.body.camId);
    res.send({ 'result': 'File accepted !' }); 

};
//____________________________________________________________________________________________
/*
Image Processing 
*/
function imageProcessing(imageData,imageName,timeStamp,areaOfInterest,targetUrl,configurations,deviceName,userId,camId) {
    logger.debug("  ** IMAGE PROCESSING **  \nFILE to process", imageName);
    
    var imageConfig = JSON.parse(configurations);
    // var widthMultiplier =  imageConfig.ImageWidth / imageConfig.frameWidth;
    // var heightMultiplier = imageConfig.ImageHeight / imageConfig.frameHeight;
    var widthMultiplier =  imageConfig.ImageWidth / 100;
    var heightMultiplier = imageConfig.ImageHeight / 100;

    /*
    URL generation and API CALL
    */
    // var post1 = { "url": imgpath };
    var message;
    var finalResult;
    var bboxResults = [];

        var headers =
        {
            'Ocp-Apim-Subscription-Key': config.faceApiSubscriptionKey,
            'Content-Type': config.faceApiContentTypeHeader
        }

        var optionsFaceApi =
        {
            url: config.faceDetectionUrl,
            method: 'POST',
            headers: headers,
            body: imageData,
            // json: post1
        }

        request(optionsFaceApi, function (error, response, body) {

            if (!error && response.statusCode == 200) 
            {
                logger.debug("Image is processed ...",body.toString());
                body = JSON.parse(body.toString());
                /**
                 * RESULT GENERATION
                 */
                var faceCount=body.length;
                var faceDetectionResult={};

                faceDetectionResult.imageName = imageName;
                faceDetectionResult.bboxResults = [];
                faceDetectionResult.timeStamp = timeStamp;            
                faceDetectionResult.totalCount = faceCount;
                faceDetectionResult.deviceName = deviceName;
                faceDetectionResult.camId = camId;
                
                faceDetectionResult.feature = areaOfInterest[0].featureName;
                faceDetectionResult.userId = userId;

                var boundingBoxes = [];
                var countPerBbox = [];  
                        
                //var areaOfInterest = [{"_id":120,"x":0,"y":0,"x2":1000,"y2":1000},{"_id":123,"x":1000,"y":0,"x2":2000,"y2":2000}];

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
                                //logger.debug("Accepted");

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
                    
                    // logger.debug("Result after processing ::",faceDetectionResult);
                    //  res.send(faceDetectionResult);
                }

                logger.debug("Final Result ::",JSON.stringify(faceDetectionResult));
                
                var optionsSendResult =
                    {
                        rejectUnauthorized: false,
                        url: targetUrl,
                        method: 'POST',
                        json: faceDetectionResult
                    }

                request(optionsSendResult, function (error, response, body) {
                            if(error)
                                    logger.error("Error sending result to target url : ",error);
                            else
                                    logger.debug("Result wired to target url");
                    });	
            }
            else 
            {
                logger.error("Error in FaceAPI connection !!::\n", error);
                // res.send(error);
                logger.debug("RES code : ",response.statusCode);
                logger.debug("RES code : ",body);
            }
        });

}

exports.processImage = storeImage;
