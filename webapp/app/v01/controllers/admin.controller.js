
var fs = require('fs');
var amqp = require('amqplib/callback_api');

const config = require('../../config/config');

var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;

var url = "mongodb://" + 
config.mongodb.username + ":" + 
config.mongodb.password + "@" + 
config.mongodb.host + ":" + config.mongodb.port +"/" + 
config.mongodb.database + "?authSource=" + config.mongodb.database + "&w=1" ;

var mqURL = 'amqp://' + config.mq.mqUser + ':' + config.mq.mqPassword + '@' + config.mq.mqServer + ':' + config.mq.mqPort;

function hb(req, res){

    res.json({"message" : "ok", "cfg" : config.env});

}

function base64_encode(file) {
    var fileObj = fs.readFileSync(file);
    return new Buffer.from(fileObj).toString('base64');
}

function getLabelObject(req, res){

      try{
        
        // for direct calls of an object, do not update the workflow status so that for demo purposes the object can be called in different views
        
        let flagUpdateWFStatus = eval(req.query.flagUpdateWFStatus) ; 

        let filterArray = [];

        // if object ID is provided , search for this item regardless of lock state

        if (req.params.objectid){
            let filterObj = {
            "_id" : ObjectID(req.params.objectid)
            }

            filterArray.push(filterObj);

        }else{

           // default object: search for workflow items with wfstatus == 1 --> item is injected into pipeline as PDF
           // only include objects that have a lockTime greater than 24hrs

          let filterObj =  {$or: [
              { "wfstatus" : 0 },
              { "wfstatus" : 1}
              ]
          }

          filterArray.push(filterObj);

          filterArray.push( {$or: [
              {lockTime : {$exists: false}},
              {lockTime:  {$lt: new Date((new Date())-1000*60*60*24)}}
              ]
          });
        }

        MongoClient.connect(url, function(err, db) {

          if (err) throw err;
          
          let dbo = db.db("medlabels");

          // Get the documents collection
          const collection = dbo.collection('labels');
          // Find some documents
          collection.findOne(
            {$and : filterArray}
          , function(err, docs) {

              if (err) throw err;

              try{
                if (docs){
                  if (typeof(docs.pages) != "undefined"){
                    docs.pages.forEach(element => {
                      try{
                        element.base64String = base64_encode(element.path)
                      }catch(err){
                        element.base64String = null;
                        console.log(err);
                      }
                      
                    });
                  }
      
                  res.json(docs);
      
                  if (typeof(docs._id) != "undefined" && flagUpdateWFStatus){
                    // collection.updateOne({"_id" : ObjectID(docs._id)}, {$set: { wfstatus : 1}, $push: { "wfstatus_change" :changeItem}})
                    collection.updateOne({"_id" : ObjectID(docs._id)}, {$set: { lockTime: new Date() } })
                  }
                }else{
                  res.json({})
                }
              }catch(err){
                res.status(500).send({message : "An error occured requesting label Object"});
              }
            
              db.close();
              
          });

        });

  }catch(error){
    res.send(500, "An error occured requesting label Object");
  }
  
}

function approveLabelObject(req, res){

  try{

    let labelObject = req.body;

    if (typeof(labelObject.pages) != "undefined"){
      labelObject.pages.forEach(element => {
        delete element.base64String;
      });
    }

    if (typeof(labelObject._id) == "undefined"){
      throw "No _id provided.";
    }else{

      // set wfstatus == 11 -> bbox is created; ready for OCR further processing
      // 11 = (1) bbox + (1) approved

      labelObject["wfstatus"] = 11;
      let changeItem = {"timeChange": new Date(), "wfstatus" : "11" };
      labelObject.wfstatus_change.push(changeItem);

      if (typeof(labelObject.lockTime) != "undefined"){
        delete labelObject.lockTime;
      }

      MongoClient.connect(url, function(err, db) {

        if (err) throw err;
        
        let dbo = db.db("medlabels");

        // Get the documents collection
        const collection = dbo.collection('labels');

        const objId = labelObject._id; 
        
        if (labelObject._id){
            delete labelObject._id
        }
        
        collection.replaceOne(
          {"_id" : ObjectID(objId)}, 
          labelObject,
          function(err, docs){
            res.json({"message" : "ok"});
            publishToQueue("medlines", {"_id" :objId, "wfsteps" : ["pretag"] }); 
            console.log("published id: " + objId);
          });

        
      });
    }

  }catch(error){
    res.send(500, "An error occured approving the item with object: " + JSON.stringify(req.body) );
  }

}

function publishAllToOCR(req, res){
  MongoClient.connect(url, function(err, db) {

    if (err) throw err;
    
    let dbo = db.db("medlabels");

    // Get the documents collection
    const collection = dbo.collection('labels');
    
    collection.find(
      {"wfstatus" : 2, "filePath":{$exists : true}}).toArray(
      function(err, docs){

        amqp.connect(mqURL, function (err, conn) {

          if (err){
              console.log(err); 
              return;
          }
    
          conn.createChannel(function (err, ch) {
    
            if(err) throw err;
    
            try{
              ch.assertQueue('medlines', { durable: true });

              for (var i=0; i<docs.length; i++){

                let objId = docs[i]._id.toString();

                let payload = {"_id" :objId }

                console.log("published id: " + objId)
                ch.sendToQueue('medlines', new Buffer.from(JSON.stringify(payload)));
              }
      
              res.json({"message" : "ok", "data" : docs});
             
            }catch(error){
              console.error("Something went wrong publishing allToOCR")
              console.error(error);
              console.error(err)
            }
          });
    
          setTimeout(function () { 
              conn.close(); 
          }, 500); 
    
      });

      });    
  });
}

function publishToQueue(queue, payload){

  amqp.connect(mqURL, function (err, conn) {

      if (err){
          console.log(err); 
          return;
      }

      conn.createChannel(function (err, ch) {

        if(err) throw err;

        try{
          ch.assertQueue('medlines', { durable: true });
          
          ch.sendToQueue('medlines', new Buffer.from(JSON.stringify(payload)));
        }catch(error){
          console.error("Something went wrong publishing : " + payload)
          console.error(error);
          console.error(err)
        }
      });

      setTimeout(function () { 
          conn.close(); 
      }, 500); 

  });

}

function disregardObject(req, res){

  try{

      let labelObject = req.body;

    if (typeof(labelObject._id) == "undefined"){
      throw "No _id provided.";
    }else{

      MongoClient.connect(url, function(err, db) {

        if (err) throw err;
        
        let dbo = db.db("medlabels");

        // Get the documents collection
        const collection = dbo.collection('labels');

        const objId = labelObject._id; 
        
        if (labelObject._id){
            delete labelObject._id
        }
        
        collection.updateOne({"_id" : ObjectID(objId)}, {$set: { wfstatus : -1}, $push: { "wfstatus_change" : {"timeChange": new Date(), "wfstatus" : -1 }}},
          function(err, docs){
            res.json({"message" : "ok"});
          });
        
      });
    }

  }catch(error){
    res.send(500, "An error occured approving the item with object: " + JSON.stringify(req.body) );
  }

}


module.exports = { hb, getLabelObject, approveLabelObject, disregardObject, publishAllToOCR}