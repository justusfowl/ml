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




function getWorkflowStats(req, res){

    try{

      MongoClient.connect(url, function(err, db) {

        if (err) throw err;
        
        let dbo = db.db("medlabels");

        const collection = dbo.collection('labels');

        collection.aggregate([
            {$match: {}}
        , {$group:
            {_id:"$wfstatus", count:{$sum:1}}, 
            }, 
        { $sort : { _id : 1} }
        ]).toArray(function(err, results) {
        
            try{
            
                res.json(results);
    
            
            }catch(err){
                console.error(err);
            res.status(500).send({message : "An error occured requesting label stats"});
            }
        
            db.close();
                
        });

      });

}catch(error){
  res.send(500, "An error occured requesting label Object");
}

}

function getImgLabelStats(req, res){

    try{

      MongoClient.connect(url, function(err, db) {

        if (err) throw err;
        
        let dbo = db.db("medlabels");

        const collection = dbo.collection('labels');

        collection.aggregate([
            { $unwind: '$pages'},
            { $match: {'pages.bbox': {$exists: true}, 'pages.bbox.origin' : 'manual'}},
            { $group: { _id: null, count: { $sum: 1 } } }
        ]).toArray(function(err, results) {
        
            try{

                if (!results[0].count){
                    results[0].count = 0; 
                }

                let response = {
                    "bbox_count" : results[0].count
                }

                res.json(response);
    
            
            }catch(err){
                console.error(err);
            res.status(500).send({message : "An error occured requesting label stats"});
            }
        
            db.close();
                
        });

      });

}catch(error){
  res.send(500, "An error occured requesting label Object");
}

}



module.exports = { getWorkflowStats, getImgLabelStats }