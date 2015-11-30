'use strict';

/**
 * Main Test File
 * TODO: Still need to split this into files
 * TODO: Add more empty-cell testing
 * TODO: Add MODEL tests
 */
var mongoxlsx = require('../../lib/mongo-xlsx');
var fs = require('fs');
var compare = require('./compare');
var async = require('async');
var path = require('path');

/** PATHS FOR TESTING */
var INPUT_PATH = './test/input';
var MODEL_PATH = './test/models';
var RELATIVE_INPUT_PATH = '../input';
var OUTPUT_PATH = './test/output';
var OUTPUT_XLSX_PATH = './test/outputxlsx';

/** Clean up! */
if (!fs.existsSync(OUTPUT_PATH)) fs.mkdirSync(OUTPUT_PATH);
if (!fs.existsSync(OUTPUT_XLSX_PATH)) fs.mkdirSync(OUTPUT_XLSX_PATH);
var oldFiles = fs.readdirSync(OUTPUT_PATH);
var oldXlsxFiles = fs.readdirSync(OUTPUT_XLSX_PATH);
oldFiles.forEach(function(f) { fs.unlinkSync(OUTPUT_PATH+"/"+f); });
oldXlsxFiles.forEach(function(f) { fs.unlinkSync(OUTPUT_XLSX_PATH+"/"+f); });

var startTest = function() {
  var files = fs.readdirSync(INPUT_PATH);
  describe('mongo-xlsx', function() {
    files = files.filter(function(f) { return (!f.match("private"));});
    //files = files.filter(function(f) { return (f.match("users_test"));});
    files.forEach(processFileIntoData);
    files.forEach(processFileIntoFiles);
    processAllTogether(files);
  });
};


var processFileIntoData = function(file) {
  describe('RW JSON/JSON', function()
  {
    var json1;
    if (file.match("\.json")) {
      json1 = JSON.parse(fs.readFileSync(INPUT_PATH + "/" + file, 'utf8'));
    } else if (file.match("\.js")) {
      json1 = require(RELATIVE_INPUT_PATH + "/" + file).anObject();
    } else {
      console.log("Skipping: Unknown test format");
      return;
    }

    {
      var model = mongoxlsx.buildDynamicModel(json1);
      var excel = mongoxlsx.mongoData2XlsxData(json1, model);
      var json = mongoxlsx.xlsxData2MongoData(excel, model);
      fs.writeFileSync(OUTPUT_PATH + "/" + file, JSON.stringify(json));

      var m = function (i) {
        return function () {
          var status = compare.deepCompare(json1[i], json[i]);
          assert.equal(true, status, file + "[" + i + "]");
        };
      };

      for (var i = 0; i < json1.length; i += 1) {
        it(file + "[" + i + "]", m(i));
      }
    }

    {
      var modelFile = path.join(MODEL_PATH, file.match(/^(.*)\.(.*)$/)[1] + ".model.json");
      if (!fs.existsSync(modelFile)) {
        return;
      }

      var content = fs.readFileSync(modelFile, 'utf8');
      if (content) {
        var model_ = JSON.parse(content);
        var excel_ = mongoxlsx.mongoData2XlsxData(json1, model_);
        var json_ = mongoxlsx.xlsxData2MongoData(excel_, model_);
        var file_ = "/_static_model_" + file;
        fs.writeFileSync(path.join(OUTPUT_PATH, file_), JSON.stringify(json));

        var m_ = function (i) {
          return function () {
            var status = compare.deepCompare(json1[i], json_[i]);
            assert.equal(true, status, file + "[" + i + "]");
          };
        };

        for (var j = 0; j < json1.length; j += 1) {
          it(file + " + static_model [" + j + "]", m(j));
        }

      }
    }
  });
};

var processFileIntoFiles = function(file) {
  describe('RW JSON/XLSX', function()
  {
    var json1Xlsx;
    if (file.match("\.json")) {
      json1Xlsx = JSON.parse(fs.readFileSync(INPUT_PATH + "/" + file, 'utf8'));
    } else if (file.match("\.js")) {
      json1Xlsx = require(RELATIVE_INPUT_PATH + "/" + file).anObject();
    } else {
      console.log("Skipping: Unknown test format");
      return;
    }
    {
      it(file, function () {
        var modelXlsx = mongoxlsx.buildDynamicModel(json1Xlsx);
        mongoxlsx.mongoData2Xlsx(json1Xlsx, modelXlsx, {
          fileName: file + ".xlsx",
          path: OUTPUT_XLSX_PATH
        }, function (err, data) {
          if (err) return done(err);
          mongoxlsx.xlsx2MongoData(data.fullPath, modelXlsx, function (err, jsonXlsx) {
            if (err) return done(err);
            for (var i = 0; i < json1Xlsx.length; i += 1) {
              var status = compare.deepCompare(json1Xlsx[i], jsonXlsx[i]);
              assert.equal(true, status, file + "[" + i + "]");
            }
            done();
          });
        });
      });
    }
    {
      var modelFile = path.join(MODEL_PATH, file.match(/^(.*)\.(.*)$/)[1] + ".model.json");
      if (!fs.existsSync(modelFile)) {
        return;
      }

      var content = fs.readFileSync(modelFile, 'utf8');
      if (!content) {
        console.log("SKIP NO STATIC MODEL TEST");
        return;
      }

      it(file + " + static_model", function () {
        var modelXlsx = JSON.parse(content);
        mongoxlsx.mongoData2Xlsx(json1Xlsx, modelXlsx, {
          fileName: "static_model_" + file + ".xlsx",
          path: OUTPUT_XLSX_PATH
        }, function (err, data) {
          if (err) return done(err);
          mongoxlsx.xlsx2MongoData(data.fullPath, modelXlsx, function (err, jsonXlsx) {
            if (err) return done(err);
            for (var i = 0; i < json1Xlsx.length; i += 1) {
              var status = compare.deepCompare(json1Xlsx[i], jsonXlsx[i]);
              assert.equal(true, status, file + "[" + i + "]");
            }
            done();
          });
        });
      });
    }
  });
};

var processAllTogether = function(files) {
  describe('read json / write multipage xlsx', function() {
    var excelPageData = [];
    var excelPageName = [];
    var excelModels = [];
    var originalData = [];
    //console.log('file', files);
    it ("Multiple Files", function() {

      async.eachSeries(files, function (aFile, next) {
        var json2Xlsx;
        if (aFile.match("\.json$")) {
          json2Xlsx = JSON.parse(fs.readFileSync(INPUT_PATH + "/" + aFile, 'utf8'));
        } else if (aFile.match("\.js$")) {
          json2Xlsx = require(RELATIVE_INPUT_PATH + "/" + aFile).anObject();
        } else {
          console.log("Skipping: Unknown test format");
          return next();
        }
        var model2Xlsx = mongoxlsx.buildDynamicModel(json2Xlsx);

        excelPageName.push(aFile.match(/^(.*)\.(.*)$/)[1]);
        excelPageData.push(mongoxlsx.mongoData2XlsxData(json2Xlsx, model2Xlsx));
        originalData.push(json2Xlsx);
        excelModels.push(model2Xlsx);
        next();
      }, function (err) {
        if (err) {
          assert.equal(true, false, err);
          done(err);
          return;
        }
        mongoxlsx.mongoData2XlsxMultiPage(excelPageData, excelPageName, {path: OUTPUT_XLSX_PATH}, function (err, data) {
          if (err) return done(err);
          mongoxlsx.xlsx2MongoData(data.fullPath, excelModels, function (err, jsonXlsx, names) {
            if (err) return done(err);
            for (var i = 0; i < jsonXlsx.length; i++) {
              for (var j = 0; j < jsonXlsx[i].length; j++) {
                var status = compare.deepCompare(originalData[i][j], jsonXlsx[i][j]);
                assert.equal(true, status, names[i] + "[" + i + "][" + j + "]");
              }
            }
            done();
          });
        });
      });
    });
  });
};

/** Start testing! */
startTest();