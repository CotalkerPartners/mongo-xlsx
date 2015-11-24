# mongo-xlsx

IMPORTANT: Pre-ALPHA quality.

Mongo-xlsx is a utility module which provides tools to converts excels into data for mongoDB

The general conversion flow:

```
MongoDB   -> (extract data with mongoose.find)  -> MongoData -> (convert with mongoData2Xlsx)        -> file.xlsx
file.xlsx -> (convert data with xlsx2MongoData) -> MongoData -> (save to MongoDB with mongoose.save) -> MongoDB
```

![alt tag](https://raw.github.com/moblox/mongo-xlsx/master/assets/sample.png)

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

- Fix test system & add more complex tests
- Allow to read Excel without model
- Read from the modelMap while converting from excel to json (allow custom headers on excel)
- Allow to filter fields with model
- Fix performance issues
- Fix date objects (Fixed: test@ test_time.js but test are more lax)

## Known Limitations:

1. Not using modelMap to convert from excel to json
2. May not work well with mixed types for the same key

e.g. error1_test.json is passing but their may be unknown side effects. More test are needed 
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

5. nulls, empty cells, undefined may not be mixed 
