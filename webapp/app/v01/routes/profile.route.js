var express = require('express'); 
var router = express.Router();
var profileController = require('../controllers/profile.controller')

router.route('/transactionAgg')
    .get(profileController.getTransactionAggregates)

module.exports = router;