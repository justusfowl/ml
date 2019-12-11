
var fs = require('fs');
var path = require('path');
var request = require('request');
const config = require('../../config/config');

function processPdfBbox(req, res){

    var file = req.file;

    if (path.extname(file.originalname) != ".pdf"){
        console.log("no PDF");
        res.status(500).json({"message" : "Invalid datatype - only PDFs supported"})
    }else{

        request({
            url: 'http://' + config.procBackend.host + ":" + config.procBackend.port + '/analytics/tbody',
            method: 'POST',
            formData: {
              'file': fs.createReadStream(file.destination+file.originalname)
            }
          }, function(error, response, body) {

            try{
                console.log(JSON.parse(body));
                res.json({"message" : "ok", "data": JSON.parse(body)});
            }catch(err){
                res.status(500).json({"message" : JSON.stringify(err)});
            }

            // remove temporary file
            
            try {
                fs.unlinkSync(file.destination+file.originalname)
                
            } catch(err) {
                console.error(err)
            }
            
        });

        
    }

}


module.exports = { processPdfBbox }
