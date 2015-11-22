/**
 * Created by eddie on 11/21/15.
 */

var mongoxlsx = require('./lib/mongo-xlsx');
var fs = require('fs');
var compare = require('./test/compare');

var INPUT_PATH = './test/input';
var OUTPUT_PATH = './test/output';

var oldFiles = fs.readdirSync(OUTPUT_PATH);
oldFiles.forEach(function(f) {
  console.log("unlink:", OUTPUT_PATH+"/"+f);
  fs.unlinkSync(OUTPUT_PATH+"/"+f);
});

var files = fs.readdirSync(INPUT_PATH);
console.log(files, typeof files);

var processFile = function(file) {
  //if (file != "menu_test.json") return;

  var json1 = JSON.parse(fs.readFileSync(INPUT_PATH + "/" + file, 'utf8'));

  var model = mongoxlsx.buildDynamicModel(json1);
  //console.log("model for json1:", model);

  var excel = mongoxlsx.mongoToExcel(json1, model);
  //console.log("excel for json1:", excel);

  var json = mongoxlsx.excelToMongo(excel, model);
  //console.log("recovering:", json1, json);

  for (var i = 0 ; i < json1.length; i+=1) {
    console.log("COMPARING ",file,"[i] ", compare.deepCompare(json1[i], json[i]));
  }

  fs.writeFileSync(OUTPUT_PATH + "/" + file, JSON.stringify(json));
};

files.forEach(processFile);
