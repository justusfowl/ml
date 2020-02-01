
var fs = require('fs');
var path = require('path');
var request = require('request');
const config = require('../../config/config');
var amqp = require('amqplib/callback_api');
var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;

function processFile(req, res){

    var file = req.file;
    var wfsteps = req.body.wfsteps || [];
    var patNummer = req.body.patNummer || "-77";
    var patName = req.body.patName || "frontendload"; 

    if (path.extname(file.originalname) != ".pdf"){
        console.log("no PDF");
        res.status(500).json({"message" : "Invalid datatype - only PDFs supported"});
        deleteTmpFile(file.destination+file.originalname);
    }else{

        request({
            url: 'http://' + config.procBackend.host + ":" + config.procBackend.port + '/file/pdf?flagoverwrite=true',
            method: 'POST',
            formData: {
              'file': fs.createReadStream(file.destination+file.originalname), 
              'wfsteps' : wfsteps,
              'pat_nummer' : patNummer,
              'pat_name' : patName
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
    let wfsteps = req.body.wfsteps;

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

                let payload = {"_id" : objId, "wfsteps" : wfsteps }
          
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

function setWfStatusOfObject(req, res){
    
    try{
  
        let objectIds = req.body.objectIds; // array of objectIds
        let targetStatus = req.body.targetStatus;

        if (!targetStatus || !objectIds){
            res.send(500, "Error: provide both targetStatus + array of ObjIds");
            return;
        }

        try{
            targetStatus = parseInt(targetStatus);
        }catch(err){
            res.send(500, "Error: of targetStatus"  + JSON.stringify(err));
            return;
        }

        let filterArray = []

        objectIds.forEach(element => {
            filterArray.push({
                "_id" : ObjectID(element)
            })
        });
        let url = config.getMongoURL();
        MongoClient.connect(url, function(err, db) {
    
          if (err) throw err;
          
          let dbo = db.db("medlabels");
  
          // Get the documents collection
          const collection = dbo.collection('labels');
  
          collection.find(
            {
                "$or" : filterArray
            }).toArray(function(err, docs) {
                
                var updated = 0;
                if (docs.length > 0){
                    docs.forEach(element => {
                        collection.updateOne({"_id" : ObjectID(element._id)}, {$set: { "wfstatus" :  targetStatus}, $unset : {"lockTime": ""} });
                        updated++;
                    });
                }

              res.json({"message" : "ok", "updated" : updated});

                db.close();
              });  
          
        });
    
      }catch(error){
        res.send(500, "An error occured approving the item with object: " + JSON.stringify(req.body) );
      }
    
}


module.exports = { processFile, issueObjIdToWf, setWfStatusOfObject}
