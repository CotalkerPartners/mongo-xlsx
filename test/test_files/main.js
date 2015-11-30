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
    //files = files.filter(function(f) { return (f.match("menu_test"));});
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

    {
      var model = mongoxlsx.buildDynamicModel(json1);
      var excel = mongoxlsx.mongoData2XlsxData(json1, model);
      var json = mongoxlsx.xlsxData2MongoData(excel, model);
      fs.writeFileSync(OUTPUT_PATH + "/" + file, JSON.stringify(json));

      var m = function (i) {
        return function () {
          assert.equal(true, compare.deepCompare(json1[i], json[i]), file + "[" + i + "]");
        };
      };

      var customCompare = function(a, b) {
        var akeys = a && a.constructor === Object ? Object.keys(a) : null;
        var bkeys = b && b.constructor === Object ? Object.keys(b) : null;
        var isArray = (a && a.constructor == Array) || (b && b.constructor === Array);


        if ((akeys && akeys.length) || (bkeys && bkeys.length)) {
          var keys = akeys.concat(bkeys).unique();
          var isEqual = true;
          for (var j = 0; j < keys.length; j++) {

            //console.log(keys[j]);
            //var empty1 = !a[keys[j]];
            //var empty2 = !b[keys[j]];
            //if ((a[keys[j]] && (a[keys[j]].constructor === Object || a[keys[j]].constructor === Array)) ||
            //    (b[keys[j]] && (b[keys[j]].constructor === Object || b[keys[j]].constructor === Array))) {
            //  empty1 = _.isEmpty(a[keys[j]], true);
            //  empty2 = _.isEmpty(b[keys[j]], true);
            //}
            //
            //if (empty1 && empty2) {
            //  console.log("Skipping empty data", a[keys[j]], b[keys[j]]);
            //} else
            if (b[keys[j]] && b[keys[j]].z && b[keys[j]].z === 'd-mmm-yy') {
              // TODO HOW TO CHECK EXCEL DATES?! { date: { t: 'n', z: 'd-mmm-yy', v: 42338.74626157407 } }
              console.log("Skipping date lodash date check", a[keys[j]], b[keys[j]]);
            } else {
              var newIsEqual =  _.isEqual(a[keys[j]], b[keys[j]], customCompare);
              if (!newIsEqual) {
                console.log("NOT EQUAL 1");
                console.log(a[keys[j]], b[keys[j]]);
              }
              isEqual = isEqual && newIsEqual;
            }
          }
          return isEqual;
        } else if (isArray) {
          var max = Math.max(a ? a.length : 0 , b ? b.length : 0);
          var allArrayObjectsAreEqual = true;
          for (var m = 0; m < max; m++) {
            var arrayIsEqual = _.isEqual(a[m], b[m], customCompare);
            if (!arrayIsEqual) {
              console.log("NOT EQUAL 2");
              console.log(a, b);
            }
            allArrayObjectsAreEqual = allArrayObjectsAreEqual && arrayIsEqual;
          }
          return allArrayObjectsAreEqual;
        } else {
            var simpleIsEqual = _.isEqual(a, b);
            if (!simpleIsEqual) {
              console.log("NOT EQUAL 3");
              console.log(a, b);
            }
            return simpleIsEqual;
        }
      };

      var m2 = function (i) {
        return function () {
          var status = _.isEqual(json1[i], json[i], customCompare);
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