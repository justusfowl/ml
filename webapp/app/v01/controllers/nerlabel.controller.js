
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

        // for direct calls of an object, do not update the workflow status so that for demo purposes the object can be called in different views
        // let flagUpdateWFStatus = true; 
        let flagUpdateWFStatus = eval(req.query.flagUpdateWFStatus) ; 

        let filterArray = [];

        // if object ID is provided , search for this item regardless of lock state

        if (req.params.objectid){
            let filterObj = {
            "_id" : ObjectID(req.params.objectid)
            }

            filterArray.push(filterObj);
            
        }else{

           // default object: search for workflow items with wfstatus == 3 --> OCR results, contain read_text which is already spellchecked.
           // only include objects that have a lockTime greater than 24hrs

          let filterObj = {
              "wfstatus" : 3
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
                            
                                if (typeof(element.entities) == "undefined"){
                                    element.entities = [];
                                }
                            
                            });
                        }
            
                        res.json(docs);
            
                        if (typeof(docs._id) != "undefined" && flagUpdateWFStatus){
                          // collection.updateOne({"_id" : ObjectID(docs._id)}, {$set: { wfstatus : 3}, $push: { "wfstatus_change" :changeItem}})
                          collection.update({"_id" : ObjectID(docs._id)}, {$set: { lockTime: new Date() } })
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

        // set wfstatus == 4 -> NER approved files 

        labelObject["wfstatus"] = 4;
        let changeItem = {"timeChange": new Date(), "wfstatus" : 4 };
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

  function updateTag(req, res){

    try{
  
      let tagObject = req.body;
      let tagId = tagObject._id;

      if (!tagId){
        res.send(500, "Please provide tagId");
        return;
      }

  
      MongoClient.connect(url, function(err, db) {
  
        if (err) throw err;
        
        let dbo = db.db("medlabels");

        // Get the documents collection
        const collection = dbo.collection('metalabels');

        if (tagObject._id){
          delete tagObject._id
      }

        collection.replaceOne(
          {"_id" : ObjectID(tagId)},
            tagObject,
          function(err, docs){
            if (err) throw err;
            res.json(docs);
          });

      });
  
    }catch(error){
      console.error(error)
      res.send(500, "An error occured updating the tag: " + JSON.stringify(req.body) );
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


module.exports = { getLabelObject, approveLabelObject, disregardObject,  addTag, getTag, updateTag}