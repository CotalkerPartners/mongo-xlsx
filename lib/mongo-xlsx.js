'use strict';
/**
 * Convert multidimensional JSONObjects into two-dimensional JSONObjects
 * e.g. [{ a : [ 3 , 4 ], b : "hi"}] -> [['a[0]','a[1]',b],[3,4,"hi"]]
 */

var xlsxRW = require("./xlsx-rw");

var debug = 0 && true;

var log = function() {
  if (debug) {
    console.log.apply(console, arguments);
  }
};

exports.buildDynamicModel = function(mongoData) {
  var mongoModel = [];
  var mongoModelMap = {}; // For fast searching if value exist.
  /* [{ displayName : String, access : [String] }] */

  var parseType = function(value, currentKeyArray) {

    var pushAnElement = function() {

      var access = currentKeyArray.reduce(function (a, b) {
        return a + "[" + b + "]";
      });

      if (mongoModelMap[access]) {
        return;
      }
      mongoModelMap[access] = access;

      mongoModel.push({
        displayName: access,
        access: access,
        type: type
      });

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
        } else if(value.constructor === Date) {
          type = 'date';
          pushAnElement();
        } else {
          console.log("Unknown Object Type!");
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
  xlsxRW.writeXlsx(exports.mongoData2XlsxData(monogData, mongoModel), options, function(err, data) {
    callback(err, data);
  });
};
exports.mongoData2XlsxMultiPage = function(excelDataArray, sheetNamesArray, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = undefined;
  }
  xlsxRW.writeXlsxMultiPage(excelDataArray, sheetNamesArray, options, function(err, data) {
    callback(err, data);
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
      if (parse.type === 'date') {
        excelRow.push(xlsxRW.buildDate(new Date(aCell)));
      } else {
        excelRow.push(aCell);
      }
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
    var data;
    var name;

    /** Combinations possible:
     * single page xlsx - single model
     * single page xlsx - multi model w/1 element.
     * multipage xlsx - multi model
     */

    var modelType ="none";
    if (mongoModel && mongoModel.length) {
      if (mongoModel[0].constructor === Array) {
        modelType = "multi";
      } else {
        modelType = "single";
      }
    }

    if (xlsxData.length === 1) {

      switch (modelType) {
        case "none":
          data = exports.xlsxData2MongoData(xlsxData[0].data);
          break;
        case "multi":
          data = exports.xlsxData2MongoData(xlsxData[0].data, mongoModel[0]);
          break;
        case "single":
          data = exports.xlsxData2MongoData(xlsxData[0].data, mongoModel);
          break;
      }
      name = data.name;
    } else {
      data = [];
      name = [];
      for (var i = 0 ; i < xlsxData.length; i+=1) {
        if (modelType === "none") {
          data[i] = exports.xlsxData2MongoData(xlsxData[i].data);
        } else {
          data[i] = exports.xlsxData2MongoData(xlsxData[i].data, mongoModel[i]);
        }
        name[i] = xlsxData[i].name;
      }
    }
    callback(null, data, name);
  });
};

var convertMongoModelToObject = function(mongoModel) {
  var mongoModelObject = {};
  mongoModel.forEach(function(f) {
    mongoModelObject[f.displayName] = f;
  });
  return mongoModelObject;
};

/**
 * Model conversion will convert a Array of Arrasys (excelData) into a JSON-Object based on
 * (1) mongoModel or (2) the headers of the excelData [if mongoData is null!]
 * @param excelData
 * @param mongoModel
 * @returns {Array}
 */
exports.xlsxData2MongoData = function(excelData, mongoModel) {
  var headers = [];
  var mongoData = [];
  var headersOffset = 1;
  var mongoModelObject = {};

  if (mongoModel) {
    mongoModelObject = convertMongoModelToObject(mongoModel);
    //console.log(mongoModel);
  }

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

        var accessString = headers[rIndex];
        if (mongoData) {
          if (!mongoModelObject[accessString]) {
            console.log('not found!', accessString, mongoModelObject[accessString]);
            continue;
          } else {
            accessString = mongoModelObject[accessString].access;
          }
        }

        var access = accessString.split(/[\]\[]+/).filter(function (f) {
          return !!f;
        });

        var mongoDataRef = mongoData[index-headersOffset];
        for (var i = 0; i < access.length; i+=1) {
          if (i === access.length-1) {
            // TODO THIS IS WRONG! DO NOT ACCESS BY INDEX !!
            //if (mongoModel[rIndex].type === 'date') {
            //  mongoDataRef[access[i]] = new Date(aRow[rIndex]);
            //} else {
              mongoDataRef[access[i]] = aRow[rIndex];
            //}
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