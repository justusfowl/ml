var express = require('express'); 
var router = express.Router();

var adminCtrl = require('../controllers/admin.controller');
var nerLabelCtrl = require('../controllers/nerlabel.controller')

router.route('/')
    .post(adminCtrl.hb)

router.route('/label')
    .get(adminCtrl.getLabelObject)
    .put(adminCtrl.approveLabelObject)

router.route('/label/:objectid')
    .get(adminCtrl.getLabelObject)

router.route('/label/disregard')
    .put(adminCtrl.disregardObject)  

router.route('/nerlabel')
    .get(nerLabelCtrl.getLabelObject)
    .put(nerLabelCtrl.approveLabelObject)

router.route('/nerlabel/meta')
    .post(nerLabelCtrl.addTag)
    .get(nerLabelCtrl.getTag)

router.route('/nerlabel/disregard')
    .put(nerLabelCtrl.disregardObject)  

module.exports = router;