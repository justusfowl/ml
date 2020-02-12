const config = require('../../config/config');
var amqp = require('amqplib/callback_api');
var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
var _ = require('lodash');
var mongoURL = config.getMongoURL();


/**
 * Function to return the first date of X-months ago
 * @param {*} numMonthAgo 
 */
function _getDateXMonthAgo(numMonthAgo){
    // Get a date object for the current time
    var d = new Date();

    // Set it to one month ago
    d.setMonth(d.getMonth() - numMonthAgo);

    // Zero the hours
    d.setHours(0, 0, 0);

    // Zero the milliseconds
    d.setMilliseconds(0);

    d.setDate(1);

    return d
}

function _checkIsDateInTargetMonth(baseDate, wfDate){

    // ensure it is a valid JS date 
    baseDate = new Date(baseDate);
    wfDate = new Date(wfDate);

    if (baseDate.getYear() == wfDate.getYear()){
        if (baseDate.getMonth() == wfDate.getMonth()){
            return true;
        }else{
            return false;
        }
    
    }else{
        return false;
    }
}

function _getMonthYearTag(date){

    // ensure it is a valid JS date 
    baseDate = new Date(date);

    return baseDate.getFullYear() + "_" + baseDate.getMonth();
}

function _getIsMonthYearTagCurrent(tag){
    let month = tag.substring(tag.indexOf("_")+1,tag.length);
    let year = tag.substring(0,4);

    let today = new Date();

    if (today.getFullYear() == parseInt(year) && today.getMonth() == parseInt(month)){
        return true;
    }else{
        return false;
    }

}

function _group_by_MonthYearTag(results){
    
    // get data ready for further aggregation based on months 

    let dates = []; 

    for (var i=0; i<5;i++){
        dates.push(_getDateXMonthAgo(i));
    }

    var aggsResults = _.groupBy(results, function (sub) {
        
        let key = _getMonthYearTag(new Date());
 
        _.forEach(dates, function (key, value) {
 
            if (_checkIsDateInTargetMonth(key, sub.wfstatus_change.timeChange)) {
 
                key = _getMonthYearTag(key);
                return false;
            }
 
        });
 
        return key;
 
    });

    return aggsResults;
}

function _aggregate_wfstatus(aggsResults){

    let statsResult = [];

    _.forEach(aggsResults, function (monthArray, key) {
 
        let obj = {
            "monthYear" : key, 
            "current" : _getIsMonthYearTagCurrent(key),
            "wfsteps" : []
        }

        monthArray.forEach(wfstatusChangeElem => {
            
            let wfIdx = obj.wfsteps.findIndex(x => x.wfstatus == wfstatusChangeElem.wfstatus_change.wfstatus);
            
            if (wfIdx == -1){
                obj.wfsteps.push({
                    "wfstatus" : wfstatusChangeElem.wfstatus_change.wfstatus, 
                    "duration" : 0, 
                    "totalChar" : 0, 
                    "objects" : []
                });
                wfIdx = 0;
            }

            let totalChar =  Math.round((wfstatusChangeElem.wfstatus_change.duration / wfstatusChangeElem.wfstatus_change.durationPer100Char) * 100)

            obj.wfsteps[wfIdx].totalChar = obj.wfsteps[wfIdx].totalChar + totalChar;
            obj.wfsteps[wfIdx].duration = obj.wfsteps[wfIdx].duration + wfstatusChangeElem.wfstatus_change.duration;
            obj.wfsteps[wfIdx].objects.push(wfstatusChangeElem._id)
            
            
        });

        obj.wfsteps.forEach(element => {
            element["income"] = (element.totalChar/100)*0.08;
        });
        
        obj.wfsteps = _.orderBy(obj.wfsteps, ['wfstatus'],['asc']);

        statsResult.push(obj);

    });

    return statsResult;

}


function getTransactionAggregates(req,res){

    let userId = req.userId;

    MongoClient.connect(mongoURL, function(err, db) {

        if (err) throw err;
        
        let dbo = db.db("medlabels");

        // Get the documents collection
        const collection = dbo.collection('labels');
        // Find some documents

        collection.aggregate(
            [
                {$unwind: '$wfstatus_change'},
                {$match: {
                    "wfstatus_change.userId" : userId,
                    "wfstatus_change.duration" : { $exists : true}
                    }
                }, 
                {
                    $project : {
                            "pages" : 0, 
                            "sentences" : 0
                    }
                }
            ]

        ).toArray(function(err, results) {
        
            try{
                
                
                aggsResults = _group_by_MonthYearTag(results);

                statsResult = _aggregate_wfstatus(aggsResults);



                res.json(statsResult);
    
            
            }catch(err){
                console.error(err);
            res.status(500).send({message : "An error occured requesting label stats"});
            }
        
            db.close();
                
        });

    });
}


module.exports = {
    getTransactionAggregates
}