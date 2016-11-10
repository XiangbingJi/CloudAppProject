const doc = require('dynamodb-doc');
const dynamo = new doc.DynamoDB();

exports.handler = function(event, context) {
    // this lambda function is used to get item from a dynamoDB table

    // TableName and Key should be in the event
    
    dynamo.getItem(event, function (err, data) {
        if (err) {
            console.log('getItem err: ' + JSON.stringify(err));
            context.done(err);
        } else if (Object.keys(data).length === 0) {
            err = new Error('404 Resource not found');
            err.name = 'Item is not found in the table, cannot read!';
            context.done(err);
       } else {
            console.log('getItem success, data: ' + JSON.stringify(data));
            context.succeed(data);
        }
    });
    
};