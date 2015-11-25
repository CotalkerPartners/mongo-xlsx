'use strict';
/**
 * Created by eddie on 11/22/15.
 *
 * Read Write Layer.
 * This layer uses node-xlsx / xlsx-js for reading and parsing data.
 */
var xlsx = require('node-xlsx');
var fs = require('fs');
var path = require('path');

exports.writeXlsx = function(data, options, callback) {
  return exports.writeXlsxMultiPage([data], [], options, callback);
};

exports.writeXlsxMultiPage = function(dataArray, nameArray, options, callback) {
  if (!options) {
    options = makeDefault();
  } else if (typeof options === 'function') {
    callback = options;
    options = makeDefault();
  } else {
    // TODO use _.merge or something...
    if (!options.save)      {options.save      = makeDefault('save');}
    if (!options.sheetName) {options.sheetName = makeDefault('sheetName');}
    if (!options.fileName)  {options.fileName  = makeDefault('fileName');}
    if (!options.path)      {options.path      = makeDefault('path');}
  }
  if (!callback) {
    callback = function(){};
  }

  var xlsxRawData = [];
  for(var i = 0; i < dataArray.length; i++) {
    xlsxRawData.push({
      name: nameArray[i] ? nameArray[i] : options.defaultSheetName + '-' +  i,
      data: dataArray[i]
    });
  }

  var buffer = xlsx.build(xlsxRawData);
  if (!options.save) {
    return buffer;
  }

  /** write some data in the original options copy*/
  options = JSON.parse(JSON.stringify(options));
  options.fullPath = path.join(options.path,options.fileName);
  options.size = buffer.length;

  fs.writeFile(options.fullPath, buffer, function(err) {
    return callback(err, options);
  });
};


exports.parseXlsx = function(path, options, callback) {
  if (!options) {
    options = {};
  } else if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  fs.readFile(path, function(err, rawData) {
    if (err || !rawData) {
      return callback(err || new Error("No data"));
    }
    var data = xlsx.parse(rawData); // __dirname + '/myFile.xlsx'); // parses a file
    return callback(null, data);
  });
};

var makeDefault = function(arg) {
  var defaultObject = {
    save:true,
    sheetName:[],
    fileName: "mongo-xlsx-" + new Date().getTime() + ".xlsx",
    path: "./",
    defaultSheetName: "worksheet"
  };

  if (!arg) {
    return defaultObject;
  }
  return defaultObject[arg];
};


/* workaround to write a date cell directly */
exports.buildDate = function(date) {
  var datenum = function(v, date1904) {
    if(date1904) {
      v += 1462;
    }
    var epoch = Date.parse(v);
    return (epoch - new Date(Date.UTC(1899, 11, 30))) / (24 * 60 * 60 * 1000);
  };

  return {
    t: 'n',
    z: xlsx.XLSX.SSF._table[15],
    v: datenum(date)
    //original: date
  };
};