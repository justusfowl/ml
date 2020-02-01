var express = require('express'); 
var router = express.Router();

var adminCtrl = require('../controllers/admin.controller');
var wfCtrl = require('../controllers/wf.controller');


var multer = require('multer');



var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname) 
    }
})

var upload = multer({ storage: storage });

router.route('/')
    .get(adminCtrl.hb)

router.route('/file')
    .post(upload.single('file'),wfCtrl.processFile)


router.route('/objIds')
    .post(wfCtrl.issueObjIdToWf)

router.route('/objIds/setStatus')
    .post(wfCtrl.setWfStatusOfObject)

module.exports = router;