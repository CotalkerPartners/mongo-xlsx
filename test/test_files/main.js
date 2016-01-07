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
var _ = require('lodash');

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
    //files = files.filter(function(f) { return (f.match("users2"));});
    files.forEach(processFileIntoData);
    files.forEach(processFileIntoFiles);
    processAllTogether(files);
  });
};

/*
 * Provides a convenience extension to _.isEmpty which allows for
 * determining an object as being empty based on either the default
 * implementation or by evaluating each property to undefined, in
 * which case the object is considered empty.
 */
//_.mixin( function() {
//  // reference the original implementation
//  var _isEmpty = _.isEmpty;
//  return {
//    // If defined is true, and value is an object, object is considered
//    // to be empty if all properties are undefined, otherwise the default
//    // implementation is invoked.
//    isEmpty: function(value, defined) {
//      if (defined && _.isObject(value)) {
//        return !_.any( value, function(value, key) {
//          return value !== undefined;
//        });
//      }
//      return _isEmpty(value);
//    }
//  }
//}());
Array.prototype.unique = function() {
  var a = this.concat();
  for(var i=0; i<a.length; ++i) {
    for(var j=i+1; j<a.length; ++j) {
      if(a[i] === a[j]) {
        a.splice(j--, 1);
      }
    }
  }
  return a;
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

    var runTest = function(file, json1) {
      {
        var model = mongoxlsx.buildDynamicModel(json1);
        var excel = mongoxlsx.mongoData2XlsxData(json1, model);
        var json = mongoxlsx.xlsxData2MongoData(excel, model);

  // console.log('model', model);
  // console.log('json1', json1);
  // console.log('excel', excel);

        fs.writeFileSync(OUTPUT_PATH + "/" + file, JSON.stringify(json));

        var m = function (i) {
          return function () {
            assert.equal(true, compare.deepCompare(json1[i], json[i]), file + "[" + i + "]");
          };
        };

        var m2 = function (i) {
          return function () {
            var status = _.isEqual(json1[i], json[i], compare.customCompare);
            assert.equal(true, status, file + "[" + i + "]");
          };
        };

        for (var i = 0; i < json1.length; i += 1) {
          it(file + "(custom compare) [" + i + "]", m(i));
          it(file + "(lodash isEqual) [" + i + "]", m2(i));
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
    };

    if (file.match('multipage')) {
      for(var n = 0; n < json1.length; n++) {
        runTest('n'+n+'.'+file, json1[n]);
      }
    } else {
      runTest(file, json1);
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

    var runTest = function(file, json1Xlsx) {
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
    };

    if (file.match('multipage')) {
      for(var n = 0; n < json1Xlsx.length; n++) {
        runTest('n'+n+'.'+file, json1Xlsx[n]);
      }
    } else {
      runTest(file, json1Xlsx);
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

          var runTest = function(aFile, json2Xlsx, callback) {
            var model2Xlsx = mongoxlsx.buildDynamicModel(json2Xlsx);
            excelPageName.push(aFile.match(/^(.*)\.(.*)$/)[1]);
            excelPageData.push(mongoxlsx.mongoData2XlsxData(json2Xlsx, model2Xlsx));
            originalData.push(json2Xlsx);
            excelModels.push(model2Xlsx);
          };

          if (aFile.match('multipage')) {
            for(var n = 0; n < json2Xlsx.length; n++) {
              runTest('n'+n+'.'+aFile, json2Xlsx[n]);
            }
            next();
          } else {
            runTest(aFile, json2Xlsx);
            next();
          }

          
        }, function (err) {
          if (err) return done(err);
          fs.writeFileSync(path.join(OUTPUT_PATH, 'excelPageData.json'), excelPageData, 'utf-8');
          fs.writeFileSync(path.join(OUTPUT_PATH, 'excelPageName.json'), excelPageName, 'utf-8');
          mongoxlsx.mongoData2XlsxMultiPage(excelPageData, excelPageName, {path: OUTPUT_XLSX_PATH}, function (err, data) {
            if (err) return done(err);
            mongoxlsx.xlsx2MongoData(data.fullPath, excelModels, function (err, jsonXlsx, names) {
              if (err) return done(err);
              for (var i = 0; i < jsonXlsx.length; i++) {
                for (var j = 0; j < jsonXlsx[i].length; j++) {
                  var status = compare.deepCompare(originalData[i][j], jsonXlsx[i][j]);
                  var status2 = compare.customCompare(originalData[i][j], jsonXlsx[i][j]);
                  assert.equal(true, status, names[i] + "[" + i + "][" + j + "]");
                  assert.equal(true, status2, names[i] + "[" + i + "][" + j + "]");
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
