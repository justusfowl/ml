const express = require('express'); 
const cors = require('cors'); 

const app = express(); 
const http = require('http');
const server = http.Server(app);


var corsOptions = {
  origin: '*',
  optionsSuccessStatus: 200
}

const config = require('./app/config/config');

var routes = require('./app/v01/routes/index.routes');

app.use(cors(corsOptions)); 

app.use('/', express.static('frontend/dist'));

var bodyParser = require('body-parser');
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

app.use('/api/v' + config.APIVersion, routes);


let socketIO = require('socket.io');
let io = socketIO(server);

const port = process.env.PORT || 3000;

var serviceStatus = {
  "app" : ["nodeJS"]
}

io.on('connection', (socket) => {
  console.log('user connected: ' + socket.id);
  socket.emit('hb', serviceStatus);

  socket.on('log', (message) => {
    socket.broadcast.emit('log', message);

    if (typeof(message._id) != "undefined"){
      let objId = message._id;
      if (socket.rooms.hasOwnProperty(objId)){
        socket.to(objId.toString()).emit("objlog", message);
      }
    }
    
  });

  socket.on('registerService', (message) => {

    if (typeof(serviceStatus[message.type]) == "undefined"){
      serviceStatus[message.type] = []
    }

    serviceStatus[message.type].push(socket.id);

    socket.broadcast.emit('hb', serviceStatus);
    
  });

  socket.on('newobj', (objId) => {
    socket.join(objId);
  });

  socket.on('leaveobj', (objId) => {
    socket.leave(objId);
  });

  socket.on('disconnect', (reason) => {

    Object.keys(serviceStatus).forEach((key, value) => {
  
      let index = serviceStatus[key].findIndex(x => x == socket.id);
  
      if (index > -1){
        serviceStatus[key].splice(index,1);
      }
  
    });
  
    socket.broadcast.emit('hb', serviceStatus);
  
  });

});



server.listen(8000, () => {
  console.log('Server started!');
})