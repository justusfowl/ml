var express = require('express'); 
var router = express.Router();

var medlangCtrl = require('../controllers/medlang.controller');

router.route('/search')
    .get(medlangCtrl.handleSearch)

module.exports = router;