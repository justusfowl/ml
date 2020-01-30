const crypto = require('crypto');
const config = require('../../config/config');
var jwt = require('jsonwebtoken'); 
var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
var bcrypt = require('bcryptjs');

var url = "mongodb://" + 
config.mongodb.username + ":" + 
config.mongodb.password + "@" + 
config.mongodb.host + ":" + config.mongodb.port +"/" + 
config.mongodb.database + "?authSource=" + config.mongodb.database + "&w=1" ;

function login(req, res){
    

    var userName = req.body.userName;
    var password = req.body.password;

    if (!password || !userName){
        return res.status(403).send({ auth: false, message: 'Please provide both user-ID and password.' });
    }

    try{

        MongoClient.connect(url, function(err, db) {
  
            if (err) throw err;
            
            let dbo = db.db("medlabels");
    
            // Get the documents collection
            const collection = dbo.collection('users');
    
            collection.findOne(
              {"userName" : userName}, 
              function(err, data){
    
                if (err || !data){
                    res.send(403, "Either username or password invalid"); 
                    return;       
                }

                let passPhrase = crypto.createHash('md5').update(password).digest("hex");

                if(bcrypt.compareSync(password, data.passPhrase)) {
    
                    let resp = {
                        "userName" : data.userName, 
                        "userId" : data._id
                    }
        
                    var token = jwt.sign(resp, config.auth.jwtsec, {
                        expiresIn: config.auth.expiresIn // expires in 90 secs
                    });
        
                    resp.token = token;
        
                    res.json({"data" : resp});
                }else{
                    res.send(403, "Either username or password invalid");            
                }

              });
            
          });

    }catch(error){
        console.error(error.stack);
        res.send(403, "Something went wrong logging in.");
    }


    

}

function registerUser ( req, res ){

    let userName = req.body.userName;
    let pass = req.body.password; 
    let passPhrase = bcrypt.hashSync(pass); // crypto.createHash('md5').update(pass).digest("hex");

    let newUser = {
        "userName" : userName, 
        "passPhrase" : passPhrase
    }


    MongoClient.connect(url, function(err, db) {
  
        if (err) throw err;
        
        let dbo = db.db("medlabels");

        // Get the documents collection
        const collection = dbo.collection('users');
        
        collection.insertOne(
            newUser,
          function(err, u){

            res.json({"message" : "ok", "user" : u});

          });
        
      });


}


module.exports = { login, registerUser }