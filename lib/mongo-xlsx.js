'use strict';
/**
 * Convert multidimensional JSONObjects into two-dimensional JSONObjects and vice versa
 * e.g. [{ a : [ 3 , 4 ], b : "hi"}] -> [['a[0]','a[1]',b],[3,4,"hi"]]
 */

var xlsxRW = require("./xlsx-rw");

/**
 * Builds a model for MongoData to ExcelData conversion (and around)
 * @param mongoData
 * @returns {Array}
 */
exports.buildDynamicModel = function(mongoData) {
  var mongoModel = [];
  var mongoModelMap = {}; // For quickly searching if value exist.

  var parseType = function(value, currentKeyArray) {
    var type = typeof value;
    var pushAnElement = function() {
      var access = currentKeyArray.reduce(buildColumnName);
      if (mongoModelMap[access]) { return; }
      mongoModelMap[access] = access;
      mongoModel.push({
        displayName: access,
        access: access,
        type: type
      });
    };

    switch (type) {
      case "boolean":
      case "number":
      case "string":
        return pushAnElement();

      case "object":
        if (!value) {
          return pushAnElement();
        }
        switch(value.constructor) {
          case Array:
            return searchArray(value, currentKeyArray.slice());
          case Object:
            return searchObject(value, currentKeyArray.slice());
          case Date:
            type = 'date';
            return pushAnElement();
          default:
            if (value.constructor.name === "ObjectID") {
              type = "ObjectID";
              return pushAnElement();
            } else if (value.constructor.name === "InternalCache") {
              // Skip this. Internal mongoose type.
              // Isn't  part of the document.
              return;
            } else {
              console.log("Unknown Object Type:", value.constructor.name);
            }
        }
        break;

      case "symbol":
      case "function":
        return;

      default:
        break;
    }
  };

  var searchArray = function(anArray, currentKeyArray) {
    for(var index = 0; index < anArray.length; index++) {
      var value = anArray[index];
      var newCurrentKeyArray = currentKeyArray.slice();
      newCurrentKeyArray.push(index);
      parseType(value, newCurrentKeyArray);
    }
  };

  var searchObject = function(aObject, currentKeyArray) {
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
    var object = mongoData[index];
    // mongoose and other complex object have 'toObject'
    // mongoose also wraps its objects in a '_doc' field
    if (object && object.toObject && object._doc) {
      object = object._doc;
    }
    searchObject(object, []);
  }

  /**
   * Finds and try to sort elements in a continous-stable sort depending only on indexes
   * Example:    A, B, C[D], E,    F,    C[G], C[I]
   * is Sorted:  A, B, C[D], C[G], C[I], E,    F
   **/
  var sortModel = function(data, indexes, atLevel) {
    var done = false;
    var startSort = function() {
      for (var i = 0; i < indexes.length; i++) {
        var access_target = data[indexes[i]].access.split(/[\]\[]+/).filter(function (f) {
          return !!f;
        });
        var isContinuos = true;
        var lastContinousIndex = i;
        for (var j = i + 1; j < indexes.length; j++) {
          var access_comparison = data[indexes[j]].access.split(/[\]\[]+/).filter(function (f) {
            return !!f;
          });
          var areEqual = access_comparison[atLevel] === access_target[atLevel];
          if (areEqual && !isContinuos) {
            // we have a problem huston.
            var copy = data[indexes[j]];
            data.splice(indexes[j], 1);
            data.splice(lastContinousIndex+1, 0, copy);
            isContinuos = true;
            lastContinousIndex = i;
            j = i;
          }
          else if (!areEqual) isContinuos = false;
          else if (areEqual)  lastContinousIndex = j;
        }
      }
      done = true;
    };
    while (!done) {
      startSort();
    }
  };
  //console.log('sortModel', mongoModel.length, mongoModel.map(function(m) { return m.access; }).join() );
  var indexes = []; for(var i = 0; i < mongoModel.length; i++) indexes.push(i);
  sortModel(mongoModel, indexes, 0);
  //console.log('sortModel', mongoModel.length, mongoModel.map(function(m) { return m.access; }).join() );
  return mongoModel;
};

/**
 *
 * @param monogData
 * @param mongoModel
 * @param options
 * @param callback
 */
exports.mongoData2Xlsx = function(monogData, mongoModel, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = undefined;
  }
  var xlsxData = exports.mongoData2XlsxData(monogData, mongoModel);
  xlsxRW.writeXlsx(xlsxData, options, function(err, data) {
    callback(err, data);
  });
};

/**
 *
 * @param excelDataArray
 * @param sheetNamesArray
 * @param options
 * @param callback
 */
exports.mongoData2XlsxMultiPage = function(excelDataArray, sheetNamesArray, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = undefined;
  }
  xlsxRW.writeXlsxMultiPage(excelDataArray, sheetNamesArray, options, function(err, data) {
    callback(err, data);
  });
};

/**
 *
 * @param mongoData
 * @param mongoModel
 * @returns {*[]}
 */
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

      var isOriginal = true;
      var aCell = mongoData[dataIndex]; // JSON.parse(JSON.stringify(mongoData[dataIndex]));
      for (var i = 0; i < access.length; i+=1) {
        
        if (typeof aCell === 'undefined' || 
                   aCell === null        ||
                   typeof aCell[access[i]] === 'undefined' ||
                   aCell[access[i]] === null) {
          aCell = aCell ? aCell[access[i]] : aCell;
          break;
        }

        var isArrayOrObject = ( aCell[access[i]].constructor === Array || 
                                aCell[access[i]].constructor === Object );

        if (isOriginal && isArrayOrObject) {
          /* make a copy */
          isOriginal = false;
          var js = JSON.stringify(aCell[access[i]])
          var jp = JSON.parse(js) 
          aCell = jp;
        } else if (!isArrayOrObject) {
          aCell = aCell[access[i]]; // .toString();
        } else {
          aCell = aCell[access[i]];
        } 
      }
      if (parse.type === 'date') {
        // Convert dates into special date fields
        excelRow.push(xlsxRW.buildDate(new Date(aCell)));
      } else if (parse.type === 'ObjectID') {
        // Convert mongoose ObjectId's into string.
        excelRow.push(aCell ? aCell.toString() : null);
      } else {
        excelRow.push(aCell);
      }
    }
    excel.push(excelRow);
  }
  return excel;
};

/**
 *
 * @param path
 * @param mongoModel
 * @param options
 * @param callback
 */
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
  }

  for (var index = 0; index < excelData.length; index+=1) {
    if (index === 0) {
      headers = excelData[0];
    } else {
      var aRow = excelData[index];
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
        if (mongoModel && (mongoData || mongoData === 0 || mongoData === false)) {
          if (!mongoModelObject[accessString]) {
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

/* Helper function */
var convertMongoModelToObject = function(mongoModel) {
  var mongoModelObject = {};
  mongoModel.forEach(function(f) {
    mongoModelObject[f.displayName] = f;
  });
  return mongoModelObject;
};

var buildColumnName = function (a, b) { return a + "[" + b + "]"; };

function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}
