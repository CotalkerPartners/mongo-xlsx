# mongo-xlsx

IMPORTANT: Pre-ALPHA quality.

mongo-xlsx is a node.js utility module which provides tools that convert excel spreadsheets into/from MongoDB data.
(MongoDB data -> Array of JSONs)

The general data conversion flow:

```
MongoDB   -> (extract data with mongoose.find)  -> MongoData -> (convert with mongoData2Xlsx)        -> file.xlsx
file.xlsx -> (convert data with xlsx2MongoData) -> MongoData -> (save to MongoDB with mongoose.save) -> MongoDB
```

![alt tag](https://raw.github.com/moblox/mongo-xlsx/master/assets/sample.png)


Custom headers for writing and reading excel files:

![alt tag](https://raw.github.com/moblox/mongo-xlsx/master/assets/sample2.png)
Just define a model! [Example](https://github.com/Moblox/mongo-xlsx/tree/master/test/models/users_test.model.json)

## Quick Examples 

```javascript
var mongoXlsx = require('mongo-xlsx');

var data = [ { name : "Peter", lastName : "Parker", isSpider : true } , 
             { name : "Remy",  lastName : "LeBeau", powers : ["kinetic cards"] }];

/* Generate automatic model for processing (A static model should be used) */
var model = mongoXlsx.buildDynamicModel(data);

/* Generate Excel */
mongoXlsx.mongoData2Xlsx(data, model, function(err, data) {
  console.log('File saved at:', data.fullPath); 
});
```

```javascript
/* Read Excel */
mongoXlsx.xlsx2MongoData("./file.xlsx", model, function(err, mongoData) {
  console.log('Mongo data:', mongoData); 
});
```

## Instalation

`npm install mongo-xlsx`

## Testing

mocha

## Models

A model is used for converting Excel into Mongo data.
The model allows, to have custom headers for writing and reading Excel files.

```json
[
 {
    "displayName": "User Identifier",
    "access": "_id",
    "type": "string"
  },
  {
    "displayName": "Main Index",
    "access": "index",
    "type": "number"
  }
]
```

```
displayName : Excel header name
access : Object key
type: Data Type 
```

A model can be automaticly build with:

`buildDynamicModel(mongoData)`

For example:

`buildDynamicModel([{name:"eddie", age:40}, {name:"moe", age:19}, {name:"andrew", age:33} ])`

gives:

```
[ { displayName: 'name', access: 'name', type: 'string' },
  { displayName: 'age', access: 'age', type: 'number' } ]  
```


## Documentation

#### buildDynamicModel(mongoData)
Generates a Model for converting into/from Excel/MongoData.
This can be used to create a static conversion model.

#### mongoData2Xlsx(monogData, mongoModel, [options], callback)
Converts MongoData into a Excel File

#### mongoData2XlsxMultiPage(excelDataArray, sheetNamesArray, [options], callback)
Converts an array of MongoData into a Excel file with multiple sheets

#### mongoData2XlsxData(mongoData, mongoModel)
Converts MongoData into Excel Data to allow merging into single Excel File

#### xlsx2MongoData(path, mongoModel, [options], callback)
Converts Excel File into Mongo Data.
If mongoModel is null trys to use the file's header to build the JSON
Otherwise the mongoModel map will be used to build the JSON

#### xlsxData2MongoData(excelData, mongoModel)
Converts Excel Data into Mongo Data.
If mongoModel is null trys to use the file's header to build the JSON
Otherwise the mongoModel map will be used to build the JSON

## Roadmap

- Fix performance issues
- Fix date objects (Fixed: test@ test_time.js but test are more lax)
- Add Model examples and tests (more model examples needed!)
- Add negative test so that we can check the custom-deep-comparators
- Add Mongoose import/export test (Support for ObjectIDs was added)

## Known Limitations

1. Not using modelMap to convert from excel to json
2. May not work well with mixed types for the same key

e.g. error1_test.json is passing but their may be unknown side effects. More test are still neededed.
```json
[{"a":1},{"a":["hello","world"]},{"a":{"b":true,"c":false}}]
```

3. Nested objects "first" element element may not be a numeric or string-numeric:
(ECMA-262 does not specify enumeration order. The de facto standard is to match insertion order.)

e.g., 
```json
  {
    "0" : "Hello",
    "a" : "world"
  }
```

4. Very Slow :'(
Some Performance Issues @ JSON.parse(JSON.stringify(x)) to make a copy and not modify original data (error1_test.json)

5. nulls, empty cells, undefined hell 
