
var fs = require('fs');
var path = require('path');
var request = require('request');
const config = require('../../config/config');

function processPdfBbox(req, res){

    var file = req.file;
 
    if (path.extname(file.originalname) != ".pdf"){
        console.log("no PDF");
        res.status(500).json({"message" : "Invalid datatype - only PDFs supported"});
        deleteTmpFile(file.destination+file.originalname);
    }else{

        request({
            url: 'http://' + config.procBackend.host + ":" + config.procBackend.port + '/analytics/tbody',
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

function processNERTags(req, res){

    var body = req.body;

    if (typeof(body.text) == "undefined"){
        console.log("no text posted");
        res.status(500).json({"message" : "No text posted"});
    }else{
        try{
            request({
                url: 'http://' + config.procBackend.host + ":" + config.procBackend.port + '/analytics/tner',
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
                    res.json({"message" : "ok", "data": resbody});
                }catch(err){
                    res.status(500).json({"message" : JSON.stringify(err)});
                }
                
            });
        }catch(err){
            res.status(500).json({"message" : JSON.stringify(err)});
        }
        
    }

}


module.exports = { processPdfBbox, processNERTags}
