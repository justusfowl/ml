var fs = require('fs');
var path = require('path');
var request = require('request');
const config = require('../../config/config');

function handleSearch(req, res){

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

module.exports = { handleSearch }