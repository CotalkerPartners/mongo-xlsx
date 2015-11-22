# mongo-xlsx

Mongo-xlsx is a utility module which provides tools to converts excels into data for mongoDB

## Quick Examples

```javascript

```

## Mongo (w/Mongoose) Example 

```javascript

var mongoose = require('mongoose');
var mongoXlsx = require('mongo-xlsx');

var data = [ { name : "Peter", lastName : "Parker", isSpider : true } , 
             { name : "Remy",  lastName : "LeBeau", powers : ["kinetic cards"] }];

/* Generate automatic model for processing (A manual model may be used!) */
var model = mongoXlsx.buildDynamicModel(data);

/* Generate data for excel */
var excel = mongoXlsx.mongoToExcel(data, model);



var json = mongoxlsx.excelToMongo(excel, model);

```


## instalation

`npm install mongo-xlsx`

## Roadmap

- Read from the modelMap while converting from excel to json

## Known Limitations:

Not using modelMap to convert from excel to json

Nested objects "first" element element may not be a numeric or string-numeric:
(ECMA-262 does not specify enumeration order. The de facto standard is to match insertion order.)

e.g., 
  {
    "0" : "Hello",
    "a" : "world"
  }


