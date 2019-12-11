var express             = require('express');

var adminRoutes = require('./admin.route.js');
var demoRoutes = require('./demo.route.js');

const config = require('../../config/config');

var router = express.Router();

router.use('/hb', function (req, res){
    res.json({"response": "healthy", "cfg" : config.env})
});

router.use('/admin', adminRoutes);

router.use('/demo', demoRoutes)

module.exports = router; 
