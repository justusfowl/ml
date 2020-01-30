var jwt = require('jsonwebtoken');
//var jwks = require('jwks-rsa');
const config = require('../../config/config');


function verifyToken(req, res, next) {

    // check header or url parameters or post parameters for token

    let token = req.headers['x-access-token'] || req.headers['authorization']; // Express headers are auto converted to lowercase



    if (token){

        if (token.startsWith('Bearer ')) {
            // Remove Bearer from string
            token = token.slice(7, token.length);
        }
        // verifies secret
        jwt.verify(token, config.auth.jwtsec, function(err, decoded) {   
        if (err) 
            return res.send(401, { auth: false, message: 'Failed to authenticate token.' });    

        // if everything is good, save to request for use in other routes
        req.userId = decoded.userId;

        next();

        });
    }else{
        res.send(403, { auth: false, message: 'No token provided.' });
    }
   
  
  }


module.exports = { verifyToken } ;