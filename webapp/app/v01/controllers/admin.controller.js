
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

        // default object: search for workflow items without lock
        let filterObj = {
          "wfstatus" : 0
        }

        // if object ID is provided , search for this item regardless of lock state

        if (req.params.objectid){
            filterObj = {
            "_id" : ObjectID(req.params.objectid)
          }
        }

        MongoClient.connect(url, function(err, db) {

          if (err) throw err;
          
          let dbo = db.db("medlabels");

          // Get the documents collection
          const collection = dbo.collection('labels');
          // Find some documents
          collection.findOne(
            filterObj
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

                  docs["wfstatus"] = 1;
                  let changeItem = {"timeChange": new Date(), "wfstatus" : 1 }
                  docs.wfstatus_change.push(changeItem)
      
                  res.json(docs);
      
                  if (typeof(docs._id) != "undefined"){
                    collection.updateOne({"_id" : ObjectID(docs._id)}, {$set: { wfstatus : 1}, $push: { "wfstatus_change" :changeItem}}) // 
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
            publishToQueue("medlines", {"_id" :objId }); 
            console.log("published id: " + objId)
          });

        
      });
    }

  }catch(error){
    res.send(500, "An error occured approving the item with object: " + JSON.stringify(req.body) );
  }

}

function publishToQueue(queue, payload){

  amqp.connect(mqURL, function (err, conn) {

      if (err){
          console.log(err); 
          return;
      }

      conn.createChannel(function (err, ch) {

          ch.assertQueue('medlines', { durable: true });
          
          ch.sendToQueue('medlines', new Buffer.from(JSON.stringify(payload)));

      });

      setTimeout(function () { 
          conn.close(); 
      }, 1000); 

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






module.exports = { hb, getLabelObject, approveLabelObject, disregardObject}