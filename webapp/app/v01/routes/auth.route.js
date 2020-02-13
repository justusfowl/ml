var express = require('express'); 
var router = express.Router();

var authCtrl = require('../controllers/auth.controller');
const tokenValidator = require('../controllers/tokenvalidate.controller');

router.route('/login')
    .post(authCtrl.login)

router.route('/register')
    .post(authCtrl.registerUser)

router.route('/user',  [tokenValidator.verifyToken])
    .get(authCtrl.getUsers)
    .put(authCtrl.updateUser)

module.exports = router;