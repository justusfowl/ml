var express = require('express'); 
var router = express.Router();

var adminCtrl = require('../controllers/admin.controller');

router.route('/')
    .post(adminCtrl.hb)

router.route('/label')
    .get(adminCtrl.getLabelObject)
    .put(adminCtrl.approveLabelObject)

router.route('/label/:objectid')
    .get(adminCtrl.getLabelObject)

router.route('/label/disregard')
    .put(adminCtrl.disregardObject)  

module.exports = router;