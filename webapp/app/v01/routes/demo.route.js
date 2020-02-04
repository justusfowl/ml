var express = require('express'); 
var router = express.Router();

var demoCtrl = require('../controllers/demo.controller');


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


router.route('/tbody')
    .post(upload.single('file'), demoCtrl.processPdfBbox)

router.route('/tner')
    .post(demoCtrl.processNERTags)

router.route('/tner/demotext')
    .get(demoCtrl.getDemoNERTestDataText)

module.exports = router;