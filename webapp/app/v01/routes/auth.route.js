var express = require('express'); 
var router = express.Router();

var authCtrl = require('../controllers/auth.controller');

router.route('/login')
    .post(authCtrl.login)

router.route('/register')
    .post(authCtrl.registerUser)

module.exports = router;