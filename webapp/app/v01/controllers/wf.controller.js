
var fs = require('fs');
var path = require('path');
var request = require('request');
const config = require('../../config/config');

function processFile(req, res){

    var file = req.file;

    if (path.extname(file.originalname) != ".pdf"){
        console.log("no PDF");
        res.status(500).json({"message" : "Invalid datatype - only PDFs supported"});
        deleteTmpFile(file.destination+file.originalname);
    }else{

        request({
            url: 'http://' + config.procBackend.host + ":" + config.procBackend.port + '/file/pdf?flagoverwrite=true',
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


module.exports = { processFile }
