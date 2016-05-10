# mongo-xlsx

IMPORTANT: Pre-ALPHA quality.

mongo-xlsx is a node.js utility module which provides tools that convert excel spreadsheets into/from MongoDB data.
(MongoDB data -> Array of JSONs)

The general data conversion flow:

`MongoDB`   -> (extract data w/`MongooseModel.find`)  -> `MongoData` -> (convert w/`mongoData2Xlsx`) -> `file.xlsx`

`file.xlsx` -> (convert data w/`xlsx2MongoData`) -> `MongoData` -> (save to MongoDB w/`mongoose.save`) -> `MongoDB`


### mongoData2Xlsx
```json
[
  { 
    "name" : "eddie", 
    "likes" : [ "video games", "ninjas" ] 
  },
  { 
    "name" : "nico", 
    "likes" : [ "nyc" ], 
    "description" : { 
      "mascot" : "dog" 
    }
  }
]
```
converts to

name | likes[0] | likes[1] | description[mascot]
-----|----------| ---------| -----------------
eddie| video games | ninjas | 
nico | nyc   |    |   dog

### xlsx2MongoData

Reverses the previous example (table -> json array)

## Screenshots
Screenshots: spreedsheet <--> json

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

| Name          | Email         |
| ------------- | ------------- |
| Eddie         | edward@mail   |
| Nico          | nicolas@mail  |

```javascript
/* Read xlsx file without a model */
/* The library will use the first row the key */
var model = null;
var xlsx  = './file.xlsx';

mongoxlsx.xlsx2MongoData(xlsx, model, function(err, data) {
  console.log(data);
  /*
  [{ Name: 'Eddie', Email: 'edward@mail' }, { Name: 'Nico', Email: 'nicolas@mail' }]  
  */
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
[Github issue] (https://github.com/Moblox/mongo-xlsx/issues/5)
