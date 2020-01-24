var Joi = require('joi');

// require and configure dotenv, will load vars in .env in PROCESS.ENV
require('dotenv').config();

var logger = require('../../logger');

var versiony = require('versiony');

let env = (process.env.NODE_ENV).toLowerCase() || 'development'; 

var port;

if (env == 'development'){
  port = process.env.PORT || 8000;

  versiony
    .patch()                // will cause the minor version to be bumped by 1
    .from('version.json')   // read the version from version.json
    .to()                   // write the version to the source file (package.json)
                            // with the minor part bumped by 1
    .to('bower.json')       // apply the same version
    .to('package.json')     // apply the same version
    .end()                  // display info on the stdout about modified files

}
else if (env == 'production'){
  port = process.env.PORT || 80;
}else{
  port = 8000;
}

const config = {
    logger : logger.logger,
    sqlLogger : logger.sqlLogger,
    morganMiddleWare : logger.morganMiddleWare,
    env: env,
    port: port,
    APIVersion: '01',

    mysql: {
      username: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASS || "",
      database: process.env.MYSQL_DB,
      host: process.env.MYSQL_HOST,
      dialect: 'mysql'
    },

    mongodb: {
      username: process.env.MONGO_USER,
      password: process.env.MONGO_PASS,
      database: process.env.MONGO_DB,
      host: process.env.MONGO_HOST, 
      port : process.env.MONGO_PORT 
    },

    mq : {
      mqServer: process.env.MQ_SERVER,
      mqUser: process.env.MQ_USER,
      mqPassword: process.env.MQ_PASSWORD,
      mqPort: process.env.MQ_PORT
    }, 

    procBackend : {
      host: process.env.PROC_BACKEND_HOST,
      port : process.env.PROC_BACKEND_PORT,
    }, 


  };

  function getMqURL(){
    var mqURL = 'amqp://' + config.mq.mqUser + ':' + config.mq.mqPassword + '@' + config.mq.mqServer + ':' + config.mq.mqPort;
    return mqURL;
  }

  config["getMqURL"] = getMqURL


  
  module.exports = config;
