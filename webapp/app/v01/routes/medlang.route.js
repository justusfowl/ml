var express = require('express'); 
var router = express.Router();

var medlangCtrl = require('../controllers/medlang.controller');
var spellCtrl = require('../controllers/speller.controller');

router.route('/search')
    .get(medlangCtrl.handleSearch)

router.route('/spellcheck')
    .post(spellCtrl.getWordSuggestions)

module.exports = router;