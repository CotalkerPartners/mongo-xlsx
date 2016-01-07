'use strict';
var _ = require('lodash');

exports.deepCompare = function(a, b) {
  //var i, l;
  var leftChain = [];
  var rightChain = [];
  var p;
  function compare2Objects(x, y) {
    //console.log("COMPARING: ", JSON.stringify(x), JSON.stringify(y));

    // remember that NaN === NaN returns false
    // and isNaN(undefined) returns true
    if (isNaN(x) && isNaN(y) && typeof x === 'number' && typeof y === 'number') {
      return true;
    }

    // Compare primitives and functions.
    // Check if both arguments link to the same object.
    // Especially useful on step when comparing prototypes
    if (x === y) {
      return true;
    }

    // Works in case when functions are created in constructor.
    // Comparing dates is a common scenario. Another built-ins?
    // We can even handle functions passed across iframes
    if ((typeof x === 'function' && typeof y === 'function') ||
      (x instanceof Date && y instanceof Date) ||
      (x instanceof RegExp && y instanceof RegExp) ||
      (x instanceof String && y instanceof String) ||
      (x instanceof Number && y instanceof Number)) {
      var status = x.toString() === y.toString();
      if (!status) {
        console.log("ERROR", status, x, y);
      }
      return status;
    }

    // At last checking prototypes as good a we can
    if (!(x instanceof Object && y instanceof Object)) {

      // NOTE We allow null=={} due to excel parsing of empty rows...
      var bothEmpty = (isEmpty(y) && isEmpty(x));
      if (!bothEmpty) {
        console.log("ERROR", "instanceof", x, y);
        return false;
      } else {
        if (x === null || y === null || (typeof x === 'undefined') || (typeof y === 'undefined')) {
          return true; // this will crash later on...
        }
      }
    }

    if (x.isPrototypeOf(y) || y.isPrototypeOf(x)) {
      console.log("ERROR", "isPrototypeOf", x, y);

      return false;
    }

    if (x.constructor !== y.constructor) {
      if (x instanceof Date || y instanceof Date) {
        // TODO
        // This temporal workaround is to allow dates that are represented as json objects.
        return true;
      }
      console.log("ERROR", "constructor", x.constructor, x, y.constructor, y);
      return false;
    }

    if (x.prototype !== y.prototype) {
      console.log("ERROR", "prototype", x, y);

      return false;
    }

    // Check for infinitive linking loops
    if (leftChain.indexOf(x) > -1 || rightChain.indexOf(y) > -1) {
      console.log("ERROR", "indexOfChain", x, y);

      return false;
    }

    // Quick checking of one object beeing a subset of another.
    // todo: cache the structure of arguments[0] for performance
    for (p in y) {
      if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
        console.log("ERROR", "hasOwnProperty1", 
          '\n------------\ny', y, '\n------------\nx', x, '\n------------\np', p);

        return false;
      }
      else if (typeof y[p] !== typeof x[p]) {

        if (x[p] instanceof Date || x[p] instanceof Date) {
          // TODO
          // This temporal workaround is to allow dates that are represented as json objects.
          return true;
        }

        console.log("ERROR", "typeof1", typeof y[p] , typeof x[p]);
        console.log("CONT:", "typeof1", y[p] , x[p]);
        return false;
      }
    }

    for (p in x) {
      if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
        // due to nulls on excels and nulls != empty rows...
        var bothEmpty = (isEmpty(y.p) && isEmpty(x.p));
        if (!bothEmpty) {
          console.log("ERROR", "hasOwnProperty2", x, y, p);
          return false;
        }
      }
      else if (typeof y[p] !== typeof x[p]) {
        console.log("ERROR", "typeof2", x[p], y[p], p);

        return false;
      }

      switch (typeof (x[p])) {
        case 'object':
        case 'function':

          leftChain.push(x);
          rightChain.push(y);

          if (!compare2Objects(x[p], y[p])) {
            console.log("ERROR", "recursive", x, x[p], y[p], p);
            return false;
          }

          leftChain.pop();
          rightChain.pop();
          break;

        default:
          if (x[p] !== y[p]) {
            //[ 'hello', 'world', t: 's' ] s undefined t
            console.log("ERROR", "chain", JSON.stringify(x), '\n' ,JSON.stringify(y), '\n', x[p], '\n', y[p], '\n', p);
            return false;
          }
          break;
      }
    }
    return true;
  }

  return compare2Objects(a, b);
};

var hasOwnPropertyProtype = Object.prototype.hasOwnProperty;

function isEmpty(obj) {
  if (!obj) {
    return true;
  }
  if (typeof obj === "object" && [].constructor == Array) {
    if (obj.length > 0) {
      for (var i = 0; i < obj.length; i++) {
        if (!isEmpty(obj[i])) {
          return false;
        }
      }
    }
    if (obj.length === 0) {
      return true;
    }
  }

  if (typeof obj === "object" && [].constructor == Object) {
    for (var key in obj) {
      if (hasOwnPropertyProtype.call(obj, key)) {
        if (!isEmpty(obj[key])) {
          return false;
        }
      }
    }
  }

  return true;
}


/*
 * Provides a convenience extension to _.isEmpty which allows for
 * determining an object as being empty based on either the default
 * implementation or by evaluating each property to undefined, in
 * which case the object is considered empty.
 */
_.mixin( function() {
  // reference the original implementation
  var _isEmpty = _.isEmpty;
  return {
    // If defined is true, and value is an object, object is considered
    // to be empty if all properties are undefined, otherwise the default
    // implementation is invoked.
    isEmpty: function(value, defined) {
      if (defined && _.isObject(value)) {
        return !_.any( value, function(value, key) {
          return value !== undefined && value !== null;
        });
      }
      return _isEmpty(value);
    }
  }
}());



exports.customCompare = function(a, b) {


  var isAEmpty = (a === null || a === undefined) || (a && (a.constructor === Object || a.constructor === Array) && _.isEmpty(a, true));
  var isBEmpty = (b === null || b === undefined) || (b && (b.constructor === Object || b.constructor === Array) && _.isEmpty(b, true));
  if (isAEmpty && isBEmpty) {
    //console.log("EMPTY!");
    //console.log(a,b);
    return true;
  }
  if ((isAEmpty && !isBEmpty) || (!isAEmpty && isBEmpty)) {
    console.log("SKIPPING TESTING FOR NOW. Once side is empty, the other should only have empty elements (recursively)");
    console.log(a,b);

    return true;
  }


  var akeys = a && a.constructor === Object ? Object.keys(a) : null;
  var bkeys = b && b.constructor === Object ? Object.keys(b) : null;
  var isArray = (a && a.constructor === Array) || (b && b.constructor === Array);


  if ((akeys && akeys.length) || (bkeys && bkeys.length)) {
    
    var keys = akeys ? akeys.concat(bkeys).unique() : [];
  
    var isEqual = true;
    for (var j = 0; j < keys.length; j++) {
      if (b && b[keys[j]] && b[keys[j]].z && b[keys[j]].z === 'd-mmm-yy') {
        // TODO HOW TO CHECK EXCEL DATES?! { date: { t: 'n', z: 'd-mmm-yy', v: 42338.74626157407 } }
        console.log("Skipping date lodash date check", a[keys[j]], b[keys[j]]);
      } else {
        if (a && b) {
          var newIsEqual =  _.isEqual(a[keys[j]], b[keys[j]], exports.customCompare);
          if (!newIsEqual) {
            console.log("NOT EQUAL 1");
            console.log(a[keys[j]], b[keys[j]]);
          }
          isEqual = isEqual && newIsEqual;
        } else {
          console.log('a or b not defined...');
          isEqual = false
        }
      }
    }
    return isEqual;
  } else if (isArray) {
    var max = Math.max(a ? a.length : 0 , b ? b.length : 0);
    var allArrayObjectsAreEqual = true;
    for (var m = 0; m < max; m++) {
      if (a && b) {
        var arrayIsEqual = _.isEqual(a[m], b[m], exports.customCompare);
        if (!arrayIsEqual) {
          console.log("NOT EQUAL 2");
          console.log(a, b);
        }
        allArrayObjectsAreEqual = allArrayObjectsAreEqual && arrayIsEqual;
      } else {
        console.log('a or b not defined...(2)');
        allArrayObjectsAreEqual = false;
      }
    }
    return allArrayObjectsAreEqual;
  } else {
    var simpleIsEqual = _.isEqual(a, b);
    if (!simpleIsEqual) {
      if (Date.parse(a) && typeof b === 'number') {
        console.log("Workaround, looks like a js date / excel date", a, b);
        simpleIsEqual = true;
      } else {
        console.log("NOT EQUAL 3");
        console.log(a, b);
      }
    }

    return simpleIsEqual;
  }
};
