/**

100.000 / 3 element dataset
i7 @ 2.2 GHZ w/16GB

0.4[s] 'MODEL DONE'
6.1[s] 'WRITING XLSX DONE'
4.1[s] 'READING AND PARSING XLSX DONE'

*/

var mongoxlsx = require('../../lib/mongo-xlsx');

// External
var mongoose = require('mongoose');
var async = require('async');

// Config DB
mongoose.connect('mongodb://localhost/mongo-xlsx-test');
var db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  startTest();
});

var startTest = function() { 

  var simpleSchema = mongoose.Schema({
      name: String,
      lastname: String,
      createdAt: { type: Date, default: Date.now },
      age: Number
  });
  var SimpleModel = mongoose.model('SimpleTest', simpleSchema);

  var names = new Array(100000);

  async.series([
    function(next) {
      SimpleModel.remove({}, next);
    },
    function(next) {
      async.eachLimit(names, 1000, function(name, done) {
        new SimpleModel({ name : 'abc', lastname : 'abc', age : 25  }).save(done);
      }, next);
    }],
    function(err) {

      SimpleModel.find().exec(function(err, data) {
        var time = [];
        time[0] = new Date().getTime()/1000;
        console.log(0, "START");
        /* Generate automatic model for processing (A manual model may be used!) */
        var model = mongoxlsx.buildDynamicModel(data);

        time[1] = new Date().getTime()/1000;
        console.log(time[1]-time[0],"MODEL DONE");
        /* Generate data for excel */
        mongoxlsx.mongoData2Xlsx(data, model, function(err, data) {

          time[2] = new Date().getTime()/1000;
          console.log(time[2]-time[1], "WRITING XLSX DONE");
          /* Generate JSON from excel */
          mongoxlsx.xlsx2MongoData(data.fullPath, model, function(err, json) {
            time[3] = new Date().getTime()/1000;
            console.log(time[3]-time[2], "READING AND PARSING XLSX DONE");

            console.log(json.length);
            console.log(json[0], json[json.length-1]);
          });
        });
      });
    }
  );
}
