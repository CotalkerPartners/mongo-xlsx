'use strict';
var xlsxRW = require("./xlsx-rw");

var debug = 0 && true;

var log = function() {
  if (debug) {
    console.log.apply(console, arguments);
  }
};

exports.buildDynamicModel = function(mongoData) {
  var mongoModel = [];
  /* [{ displayName : String, access : [String] }] */

  var parseType = function(value, currentKeyArray) {

    var pushAnElement = function() {

      var access = currentKeyArray.reduce(function (a, b) {
        return a + "[" + b + "]";
      });

      if (!mongoModel.filter(function(f) { return f.access === access; }).length) {
        mongoModel.push({
          displayName: access,
          access: access,
          type: type
        });
      }
    };

    var type = typeof value;
    switch (type) {
      case "object":

        if (!value) {
          return pushAnElement();
        }

        var newCurrentKeyArray = currentKeyArray.slice();
        if(value.constructor === Array){
          searchArray(value, newCurrentKeyArray);
        } else if(value.constructor === Object){
          searchObject(value, newCurrentKeyArray);
        }
        break;

      case "boolean":
      case "number":
      case "string":
        return pushAnElement();

      case "symbol":
      case "function":
        log("SKIPPING");
        return;
      default:
        log("WTF");
        break;
    }
  };

  var searchArray = function(anArray, currentKeyArray) {
    log('searchArray@', currentKeyArray.join());
    for(var index = 0; index < anArray.length; index++) {
      var value = anArray[index];
      var newCurrentKeyArray = currentKeyArray.slice();
      newCurrentKeyArray.push(index);
      parseType(value, newCurrentKeyArray);
    }
  };

  var searchObject = function(aObject, currentKeyArray) {
    log('searchObject@', currentKeyArray.join());
    for (var key in aObject) {
      if (Object.prototype.hasOwnProperty.call(aObject, key)) {
        var value = aObject[key];
        var newCurrentKeyArray = currentKeyArray.slice();
        newCurrentKeyArray.push(key);
        parseType(value, newCurrentKeyArray);
      }
    }
  };

  for (var index = 0; index < mongoData.length; index+=1) {
    searchObject(mongoData[index], []);
  }

  return mongoModel;
};

exports.mongoData2Xlsx = function(monogData, mongoModel, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = undefined;
  }
  xlsxRW.writeXlsx(exports.mongoData2XlsxData(monogData, mongoModel), options, function(err) {
    callback(err, options);
  });
};

exports.mongoData2XlsxData = function(mongoData, mongoModel) {
  var excel = [[]];
  var index;
  for (index = 0; index < mongoModel.length; index+=1) {
    excel[0][index] = mongoModel[index].displayName;
  }

  for (var dataIndex = 0; dataIndex < mongoData.length; dataIndex+=1) {
    if (!mongoData[dataIndex]) {
      excel.push(null);
      continue;
    }

    var excelRow = [];
    for (index = 0; index < mongoModel.length; index+=1) {
      var parse = mongoModel[index];
      var access = parse.access.split(/[\]\[]+/).filter(function(f) { return !!f; });
      // TODO this makes it a lot slower for complex JSONs
      var aCell = JSON.parse(JSON.stringify(mongoData[dataIndex]));
      for (var i = 0; i < access.length; i+=1) {
        if (typeof aCell === 'undefined' || aCell === null) {
          break;
        } else {
          aCell = aCell[access[i]];
        }
      }
      excelRow.push(aCell);
    }
    excel.push(excelRow);
  }
  return excel;
};

exports.xlsx2MongoData = function(path, mongoModel, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = undefined;
  }
  xlsxRW.parseXlsx(path, options, function(err, xlsxData) {
    if (err || !xlsxData) {
      return callback(err || new Error("No data"));
    }
    // TODO Only parsing first sheet
    var data = exports.xlsxData2MongoData(xlsxData[0].data, mongoModel);
    callback(null, data);
  });
};

exports.xlsxData2MongoData = function(excelData, mongoModel) {
  var headers = [];
  var mongoData = [];
  var headersOffset = 1;
  for (var index = 0; index < excelData.length; index+=1) {
    if (index === 0) {
      headers = excelData[0];
      log("Headers", headers);
    } else {
      var aRow = excelData[index];
      log("ROW:", aRow);
      if (!aRow) {
        mongoData[index-headersOffset] = null;
        continue;
      }

      mongoData[index-headersOffset] = {};
      for (var rIndex = 0; rIndex < aRow.length; rIndex+=1) {

        if (typeof aRow[rIndex] === "undefined") {
          continue;
        }

        // TODO Do not use headers, use mongoModel
        var access = headers[rIndex].split(/[\]\[]+/).filter(function (f) {
          return !!f;
        });

        var mongoDataRef = mongoData[index-headersOffset];
        for (var i = 0; i < access.length; i+=1) {
          if (i === access.length-1) {
            mongoDataRef[access[i]] = aRow[rIndex];
          } else {
            if (!mongoDataRef[access[i]]) {
              if (isNumeric(access[i+1])) {
                mongoDataRef[access[i]] = [];
              } else {
                mongoDataRef[access[i]] = {};
              }
            }
          }
          mongoDataRef = mongoDataRef[access[i]];

        }
      }
    }
  }
  return mongoData;
};

function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}