# mongo-xlsx

IMPORTANT: Pre-ALPHA quality.

Mongo-xlsx is a utility module which provides tools to converts excels into data for mongoDB

The general conversion flow:

```
MongoDB   -> (extract data with mongoose.find)  -> MongoData -> (convert with mongoData2Xlsx)        -> file.xlsx
file.xlsx -> (convert data with xlsx2MongoData) -> MongoData -> (save to MongoDB with mongoose.save) -> MongoDB
```

## Quick Examples 

```javascript
var mongoXlsx = require('mongo-xlsx');

var data = [ { name : "Peter", lastName : "Parker", isSpider : true } , 
             { name : "Remy",  lastName : "LeBeau", powers : ["kinetic cards"] }];

/* Generate automatic model for processing (A static model should be used) */
var model = mongoXlsx.buildDynamicModel(data);

/* Generate Excel */
mongoxlsx.mongoData2Xlsx(json1Xlsx, model, function(err, data) {
  console.log('File saved at:', data.fullPath); 
});
```

```javascript
/* Read Excel */
mongoxlsx.xlsx2MongoData("./file.xlsx", model, function(err, mongoData) {
  console.log('Mongo data:', mongoData); 
});
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


