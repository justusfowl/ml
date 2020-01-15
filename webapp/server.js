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

io.on('connection', (socket) => {
  console.log('user connected');

  socket.on('new-message', (message) => {
    io.emit('new-message', message)
  });

});


server.listen(8000, () => {
  console.log('Server started!');
})