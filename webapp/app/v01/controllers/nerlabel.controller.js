
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


function getLabelObject(req, res){

    try{

        // default object: search for workflow items with wfstatus == 2 --> OCR results, contain read_text 
        let filterObj = {
            "wfstatus" : 2
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
                            
                                if (typeof(element.entities) == "undefined"){
                                    element.entities = [];
                                }
                            
                            });
                        }

                        docs["wfstatus"] = 3; // status == 3 --> within nerlabel process
                        let changeItem = {"timeChange": new Date(), "wfstatus" : 3 }
                        docs.wfstatus_change.push(changeItem)
            
                        res.json(docs);
            
                        if (typeof(docs._id) != "undefined"){
                          collection.updateOne({"_id" : ObjectID(docs._id)}, {$set: { wfstatus : 3}, $push: { "wfstatus_change" :changeItem}}) // 
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
            });
  
          
        });
      }
  
    }catch(error){
      res.send(500, "An error occured approving the item with object: " + JSON.stringify(req.body) );
    }
  
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
          
          collection.updateOne({"_id" : ObjectID(objId)}, {$set: { wfstatus : -3}, $push: { "wfstatus_change" : {"timeChange": new Date(), "wfstatus" : -3 }}},
            function(err, docs){
              res.json({"message" : "ok"});
            });
          
        });
      }
  
    }catch(error){
      res.send(500, "An error occured approving the item with object: " + JSON.stringify(req.body) );
    }
  
  }





  function addTag(req, res){

    try{
  
      let tagObject = req.body;

  
      MongoClient.connect(url, function(err, db) {
  
        if (err) throw err;
        
        let dbo = db.db("medlabels");

        // Get the documents collection
        const collection = dbo.collection('metalabels');

        collection.insertOne(
            tagObject,
          function(err, docs){
            res.json(docs);
          });

        
      });
  
    }catch(error){
      res.send(500, "An error occured approving the item with object: " + JSON.stringify(req.body) );
    }
  
  }

  function getTag(req, res){

    try{
  
      MongoClient.connect(url, function(err, db) {
  
        if (err) throw err;
        
        let dbo = db.db("medlabels");

        dbo.collection("metalabels").find({}).toArray(function(err, result) {
            if (err) throw err;
            res.json(result);
            db.close();
          });
        
      });
  
    }catch(error){
      res.send(500, "An error occured approving the item with object: " + JSON.stringify(req.body) );
    }
  
  }


module.exports = { getLabelObject, approveLabelObject, disregardObject,  addTag, getTag}