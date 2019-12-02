/*
var winston = require('winston');
var morgan = require('morgan');

const { format, transports } = require('winston');
const { combine, timestamp, label, printf } = format;

var fs = require('fs')
var morgan = require('morgan')
var path = require('path')
var rfs = require('rotating-file-stream');

const myFormat = printf(info => {
    return `${info.timestamp} [${info.label}] ${info.level}: ${info.message}`;
  });

  var winston = require('winston');
  require('winston-daily-rotate-file');


  if (process.env.NODE_ENV !== 'production') {
   
    var transportError = new (winston.transports.DailyRotateFile)({
      filename: 'logs/medlines-be-error-%DATE%.log',
      level : 'error',
      datePattern: 'YYYY-MM-DD-HH',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d'
    });

    var transporCombined = new (winston.transports.DailyRotateFile)({
      filename: 'logs/medlines-be-combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD-HH',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d'
    });

    var logger = winston.createLogger({
      level: 'info',
      format: combine(
          label({ label: 'medlines-be' }),
          timestamp(),
          myFormat
      ),
      transports: [
        new winston.transports.Console({
            format: winston.format.simple()
            }),
          transportError, 
          transporCombined
      ],
      exitOnError: false
    });

  }else{

    var transportError = new (winston.transports.DailyRotateFile)({
      filename: 'logs/medlines-be-error-%DATE%.log',
      level : 'error',
      datePattern: 'YYYY-MM-DD-HH',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      handleExceptions: true,
      humanReadableUnhandledException: true
    });

    var transporCombined = new (winston.transports.DailyRotateFile)({
      filename: 'logs/medlines-be-combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD-HH',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d'
    });

     
    var logger = winston.createLogger({
      level: 'info',
      format: combine(
          label({ label: 'medlines-be' }),
          timestamp(),
          myFormat
      ),
      transports: [
      new winston.transports.Console({
          format: winston.format.simple()
          }),
        transportError, 
        transporCombined
      ],
      exceptionHandlers: [
        new winston.transports.File({ 
          filename: 'logs/exceptions.log', 
          silent: false,
          colorize: true, 
          timestamp: true,
          json: false })
      ],
      exitOnError: false
    });


    


  }

 



  var sqlTransportError = new (winston.transports.DailyRotateFile)({
    filename: 'logs/sql/sql-medlines-be-error-%DATE%.log',
    level : 'error',
    datePattern: 'YYYY-MM-DD-HH',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d'
  });

  var sqlTransporCombined = new (winston.transports.DailyRotateFile)({
    filename: 'logs/sql/sql-medlines-be-combined-%DATE%.log',
    datePattern: 'YYYY-MM-DD-HH',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d'
  });


const sqlLogger = winston.createLogger({
    level: 'info',
    format: combine(
        label({ label: 'medlines-be-sql' }),
        timestamp(),
        myFormat
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.simple()
          }),
        sqlTransportError,
        sqlTransporCombined
    ]
  });
  
  
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

logger.info('Init logger');

// morgan HTTP request middle ware

var logDirectory = path.join(__dirname, 'logs/access')

// ensure log directory exists
fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory)

// create a rotating write stream
var accessLogStream = rfs('access.log', {
  interval: '1d', // rotate daily
  path: logDirectory
})

var morganMiddleWare = morgan('combined', {stream: accessLogStream}); 


module.exports = { logger, sqlLogger, morganMiddleWare }

*/