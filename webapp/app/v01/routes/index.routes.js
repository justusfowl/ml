var express             = require('express');

var adminRoutes = require('./admin.route.js');
var demoRoutes = require('./demo.route.js');
var medlangRoutes = require('./medlang.route.js');
var wfRoutes = require('./wf.routes.js');
var authRoutes = require('./auth.route.js');

const config = require('../../config/config');

const tokenValidator = require('../controllers/tokenvalidate.controller');

var router = express.Router();

router.use('/hb', function (req, res){
    res.json({"response": "healthy", "cfg" : config.env})
});

router.use('/admin',  [tokenValidator.verifyToken], adminRoutes);

router.use('/demo',  [tokenValidator.verifyToken], demoRoutes);

router.use('/medlang',  [tokenValidator.verifyToken], medlangRoutes); 

router.use('/wf',  [tokenValidator.verifyToken], wfRoutes);

router.use('/auth', authRoutes);

module.exports = router; 
