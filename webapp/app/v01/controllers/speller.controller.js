const config = require('../../config/config');
var amqp = require('amqplib/callback_api');
var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
var request = require('request');

var url = config.getMongoURL();


function getObject(req, res){

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
              "wfstatus" : 15
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

                                if (typeof(element.suggestions) == "undefined"){
                                    element.suggestions = [];
                                }
                            
                            });
                        }

                        docs.lockTime = new Date();
            
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

function publishToQueue(queue, payload){

    let mqURL = config.getMqURL();

    amqp.connect(mqURL, function (err, conn) {
  
        if (err){
            console.log(err); 
            return;
        }
  
        conn.createChannel(function (err, ch) {
  
          if(err) throw err;
  
          try{
            ch.assertQueue('pretag', { durable: true });
            
            ch.sendToQueue('pretag', new Buffer.from(JSON.stringify(payload)));

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

function approveObject(req, res){

    try{
  
      let labelObject = req.body;
      let allText = ""; 
      let userId = req.userId; 
  
      if (typeof(labelObject.pages) != "undefined"){
        labelObject.pages.forEach(element => {
          delete element.base64String;

          if (element.read_text){
            allText += element.read_text
          }
          
        });
      }
  
      if (typeof(labelObject._id) == "undefined"){
        throw "No _id provided.";
      }else{

        // set wfstatus == 2 -> text has been verified 
        // after pretag processing, wfstatus will be updated to 3

        labelObject["wfstatus"] = 2;

        // calculate duation + duration per 100 characters

        let duration = (new Date() - new Date(labelObject.lockTime))/1000;
        let durationPer100Char = duration / (allText.length/100);

        let changeItem = {"timeChange": new Date(), "wfstatus" : 2, "duration" :  duration, "durationPer100Char" : durationPer100Char, "userId" : userId};
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
              publishToQueue("pretag", {"_id" :objId }); 
              console.log("published to queue: pretag | id: " + objId );

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
        let userId = req.userId;
  
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
          
          collection.updateOne({"_id" : ObjectID(objId)}, {$set: { 
            wfstatus : -15}, $push: {
               "wfstatus_change" : {"timeChange": new Date(), "wfstatus" : -15 , "userId" : userId}
            }},
            function(err, docs){
              res.json({"message" : "ok"});
            });
          
        });
      }
  
    }catch(error){
      res.send(500, "An error occured approving the item with object: " + JSON.stringify(req.body) );
    }
  
  }

  function getWordSuggestions(req, res){

    let body = req.body; 

    if (typeof(body.text) == "undefined"){
        console.log("no text posted");
        res.status(500).json({"message" : "No text posted"});
    }else{
        try{
            request({
                url: 'http://' + config.procBackend.host + ":" + config.procBackend.port + '/medlang/spellcheck',
                method: 'POST',
                qs : req.query,
                body: body,
                json: true
              }, function(error, response, resbody) {
    
                if (error){
                    console.error(error);
                    res.status(500).json({"message" : JSON.stringify(error)});
                    return;
                } 
    
                try{
                    res.json(resbody);
                }catch(err){
                    res.status(500).json({"message" : JSON.stringify(err)});
                }
                
            });
        }catch(err){
            res.status(500).json({"message" : JSON.stringify(err)});
        }
        
    }
  }


  module.exports = { getObject, approveObject, disregardObject, getWordSuggestions}