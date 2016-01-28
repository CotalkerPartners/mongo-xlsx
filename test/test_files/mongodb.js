var mongoose = require('mongoose');
var mongoxlsx = require('../../lib/mongo-xlsx');
var fs = require('fs');

mongoose.connect('mongodb://localhost/mongo-xlsx-test');
var db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  startTest();
});

var startTest = function() { 

var simpleSchema = mongoose.Schema({
    name: String
});
var SimpleModel = mongoose.model('SimpleTest', simpleSchema);

new SimpleModel({ name : 'abc' }).save(function() {
  new SimpleModel({ name : 'xyz' }).save(function() {
    SimpleModel.find().exec(function(err, data) {

      /* Generate automatic model for processing (A manual model may be used!) */
      var model = mongoxlsx.buildDynamicModel(data);
      console.log(model);

      /* Generate data for excel */
      mongoxlsx.mongoData2Xlsx(data, model, function(err, data) {
        console.log(data);

        /* Generate JSON from excel */
        mongoxlsx.xlsx2MongoData(data.fullPath, model, function(err, json) {
          console.log(err, json);
        });
      });
    });
  });
});
}
