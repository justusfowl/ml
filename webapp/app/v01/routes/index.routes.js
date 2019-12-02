var express             = require('express');

var adminRoutes = require('./admin.route.js');

var router = express.Router();

router.use('/hb', function (req, res){
    res.json({"response": "healthy"})
});

router.use('/admin', adminRoutes);

module.exports = router; 
