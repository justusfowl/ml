
var fs = require('fs');
var path = require('path');
var request = require('request');
const config = require('../../config/config');
var amqp = require('amqplib/callback_api');


function processFile(req, res){

    var file = req.file;

    if (path.extname(file.originalname) != ".pdf"){
        console.log("no PDF");
        res.status(500).json({"message" : "Invalid datatype - only PDFs supported"});
        deleteTmpFile(file.destination+file.originalname);
    }else{

        request({
            url: 'http://' + config.procBackend.host + ":" + config.procBackend.port + '/file/pdf?flagoverwrite=true',
            method: 'POST',
            formData: {
              'file': fs.createReadStream(file.destination+file.originalname)
            }
          }, function(error, response, body) {

            // @TODO: Check response code and implement proper reactions

            if (error){
                console.error(error);
                res.status(500).json({"message" : JSON.stringify(error)});
                 // remove temporary file
                deleteTmpFile(file.destination+file.originalname)
                return;
            } 

            try{
                console.log(JSON.parse(body));
                res.json({"message" : "ok", "data": JSON.parse(body)});
            }catch(err){
                res.status(500).json({"message" : JSON.stringify(err)});
            }

            // remove temporary file
            deleteTmpFile(file.destination+file.originalname)
            
        });
    }

}

function deleteTmpFile(path){
    try {
        fs.unlinkSync(path)      
    } catch(err) {
        console.error(err)
    }
}

function issueObjIdToWf(req, res){

    let objectIds = req.body.objectIds; 
    let targetWfStatus = req.body.targetWf;

    let allowedWfTargets = ["ocr" , "pretag"]
    let wfQueues = ["medlines", "pretag"];

    let isValid = true; 

    if (!objectIds || !targetWfStatus){
        isValid = false;
    }else{
        try{
            if (objectIds.length < 1){
                isValid = false;
            }

            if (allowedWfTargets.indexOf(targetWfStatus) == -1){
                isValid = false;
            }
        }catch(err){
            isValid = false;
        }
    }

    if (!isValid){
        res.status(500).json({"message" : "Please provide an array objectIds:[]"});
        return
    }

    let targetQueue = wfQueues[allowedWfTargets.indexOf(targetWfStatus)];

    amqp.connect(config.getMqURL(), function (err, conn) {

      if (err){
          console.log(err); 
          return;
      }

      conn.createChannel(function (err, ch) {

        if(err) throw err;

        try{

            ch.assertQueue(targetQueue, { durable: true });

            objectIds.forEach(objId => {

                let payload = {"_id" : objId }
          
                ch.sendToQueue(targetQueue, new Buffer.from(JSON.stringify(payload)));

            });

            res.json({"message" : "ok - the following objIds have been added for " + targetWfStatus, "data": objectIds});

            setTimeout(function () { 
                conn.close(); 
            }, 500); 

        }catch(error){
          console.error("Something went wrong publishing : " + payload)
          console.error(error);
          console.error(err)
        }
      });

  });

}


module.exports = { processFile, issueObjIdToWf}
