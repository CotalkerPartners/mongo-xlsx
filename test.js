'use strict';
/**
 * Created by eddie on 11/21/15.
 */

var mongoxlsx = require('./lib/mongo-xlsx');
var fs = require('fs');
var compare = require('./test/compare');

var INPUT_PATH = './test/input';
var OUTPUT_PATH = './test/output';
var OUTPUT_XLSX_PATH = './test/outputxlsx';

if (!fs.existsSync(OUTPUT_PATH)) {
  fs.mkdirSync(OUTPUT_PATH);
}
if (!fs.existsSync(OUTPUT_XLSX_PATH)) {
  fs.mkdirSync(OUTPUT_XLSX_PATH);
}

var oldFiles = fs.readdirSync(OUTPUT_PATH);
oldFiles.forEach(function(f) {
  console.log("unlink:", OUTPUT_PATH+"/"+f);
  fs.unlinkSync(OUTPUT_PATH+"/"+f);
});

var oldXlsxFiles = fs.readdirSync(OUTPUT_XLSX_PATH);
oldXlsxFiles.forEach(function(f) {
  console.log("unlink:", OUTPUT_XLSX_PATH+"/"+f);
  fs.unlinkSync(OUTPUT_XLSX_PATH+"/"+f);
});

var files = fs.readdirSync(INPUT_PATH);
console.log(files, typeof files);

var processFile = function(file) {

  {
    var json1 = JSON.parse(fs.readFileSync(INPUT_PATH + "/" + file, 'utf8'));
    var model = mongoxlsx.buildDynamicModel(json1);
    var excel = mongoxlsx.mongoData2XlsxData(json1, model);
    var json = mongoxlsx.xlsxData2MongoData(excel, model);
    fs.writeFileSync(OUTPUT_PATH + "/" + file, JSON.stringify(json));
    for (var i = 0; i < json1.length; i += 1) {
      console.log("COMPARING ", file, "[",i,"]", compare.deepCompare(json1[i], json[i]));
    }
  }
  {
    var json1Xlsx = JSON.parse(fs.readFileSync(INPUT_PATH + "/" + file, 'utf8'));
    var modelXlsx = mongoxlsx.buildDynamicModel(json1Xlsx);
    mongoxlsx.mongoData2Xlsx(json1Xlsx, modelXlsx, {fileName:file + ".xlsx", path:OUTPUT_XLSX_PATH}, function(err, data) {
      mongoxlsx.xlsx2MongoData(data.fullPath, modelXlsx, function(err, jsonXlsx) {
        ///console.log("RESULT", err, jsonXlsx);
        for (var i = 0; i < json1Xlsx.length; i += 1) {
          console.log("COMPARING XLSX ", file, "[",i,"]", compare.deepCompare(json1Xlsx[i], jsonXlsx[i]));
        }
      });
    });
  }

};

files.forEach(processFile);
