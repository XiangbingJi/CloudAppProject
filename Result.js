'use strict';

console.log('Loading Result.js...');
const doc = require('dynamodb-doc');
const dynamo = new doc.DynamoDB();

exports.handler = function(event, context, callback) {
    console.log('handler event: ' + JSON.stringify(event));
    console.log('handler context: ' + JSON.stringify(context));

    var params = {
        TableName: event.tableName,
        Key: { 'key': event.key }
    };

    dynamo.getItem(params, function (err, data) {
        if (err) {
            console.log('get result err: ' + JSON.stringify(err));
            callback(err, null);
        } else if (Object.keys(data).length === 0) {
            err = new Error('404 Resource not found');
            callback(err, null);
        } else { 
            console.log('get result success, data: ' + JSON.stringify(data));
            var ret = data.Item.result;

            var params = {
                TableName: event.tableName,
                Key: { 'key': event.key }
            };

            dynamo.deleteItem(params, function(err, data) {
                if (err) {
                    console.log('delete result err: ' + JSON.stringify(err));
                    callback(err, null);
                } else {
                    console.log('delete result complete, data: ' + JSON.stringify(data));
                    callback(null, JSON.parse(ret));
                }
            }); 
        }
    });
};

