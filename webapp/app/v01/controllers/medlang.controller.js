var fs = require('fs');
var path = require('path');
var request = require('request');
const config = require('../../config/config');

var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;



function handleSearchElastic(req, res){

    let queryString = req.query.q;

    request({
        url: 'http://' + config.procBackend.host + ":" + config.procBackend.port + '/medlang/search',
        method: 'GET', 
        qs : {
            "q" : queryString
        }
      }, function(error, response, body) {

        // @TODO: Check response code and implement proper reactions

        if (error){
            console.error(error);
            res.status(500).json({"message" : JSON.stringify(error)});
            return;
        } 

        try{
            res.json({"message" : "ok", "data": JSON.parse(body)});
        }catch(err){
            res.status(500).json({"message" : JSON.stringify(err)});
        }
        
    });

}

function handleSearch(req, res){
    try{

        let queryString = req.query.q;
        let top = req.query.top; 
        let startTime = new Date();

        // check for q=numbers only
        var regNum = new RegExp('^[0-9]+$');

        if (!top){
            top = 10;
        }

        let filterObj;
        let flagInputObj = false;

        try{
            eval("var qryObj = " + queryString);
            flagInputObj = true;
            
        }catch(err){
            flagInputObj = false;
        }

        // if it is an ObjectId 
        if (flagInputObj){
            filterObj = qryObj;
        }else if (regNum.exec(queryString)){

            filterObj = { $or : [
                {
                    "patNummer" : parseInt(queryString)
                }, 
                {
                    "patNummer" : parseInt(queryString).toFixed()
                }
            ]};

        }else if (ObjectID.isValid(queryString)){
            filterObj = {
                "_id" : ObjectID(queryString)
            }
        }else{
            filterObj =  { $or : [
                {
                    "pages.read_text" : queryString
                }, 
                {
                    "patName" : queryString
                }
            ]};
        }

        let url =  config.getMongoURL();

        MongoClient.connect(url, function(err, db) {
  
          if (err) throw err;
          
          let dbo = db.db("medlabels");
  
          const collection = dbo.collection('labels');
  
          collection.find(filterObj).limit(top).toArray(function(err, results) {

            let endTime = new Date();
          
              try{

                let response = {
                    "search_time" : (endTime-startTime)/1000, 
                    "embed_time" : 99999
                }

                if(!results){
                    response.documents = []; 
                }else{
                    response.documents = results; 
                }
                
                res.json({"message" : "ok", "data": response});
                     
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

module.exports = { handleSearch }