var express = require('express'); 
var router = express.Router();

var adminCtrl = require('../controllers/admin.controller');
var nerLabelCtrl = require('../controllers/nerlabel.controller');
var adminLabelStatsCtrl = require('../controllers/label.stats.controller');
var spellerCtrl = require('../controllers/speller.controller');

router.route('/')
    .post(adminCtrl.hb)

router.route('/label')
    .get(adminCtrl.getLabelObject)
    .put(adminCtrl.approveLabelObject)

router.route('/label/:objectid')
    .get(adminCtrl.getLabelObject)

router.route('/label/disregard')
    .put(adminCtrl.disregardObject) 
    
router.route('/speller')
    .get(spellerCtrl.getObject)
    .put(spellerCtrl.approveObject)

router.route('/speller/:objectid')
    .get(spellerCtrl.getObject)

router.route('/speller/disregard')
    .put(spellerCtrl.disregardObject) 

router.route('/nerlabel')
    .get(nerLabelCtrl.getLabelObject)
    .put(nerLabelCtrl.approveLabelObject)

router.route('/nerlabel/:objectid')
    .get(nerLabelCtrl.getLabelObject)

router.route('/meta/nerlabel')
    .post(nerLabelCtrl.addTag)
    .get(nerLabelCtrl.getTag)
    .put(nerLabelCtrl.updateTag)

router.route('/nerlabel/disregard')
    .put(nerLabelCtrl.disregardObject)  

router.route('/stats/workflow')
    .get(adminLabelStatsCtrl.getWorkflowStats)

router.route('/stats/bbox')
    .get(adminLabelStatsCtrl.getImgLabelStats)

router.route('/stats/nertags')
    .get(adminLabelStatsCtrl.getNERLabelStats)

router.route('/maintain/publishAllOCR')
    .post(adminCtrl.publishAllToOCR)

module.exports = router;