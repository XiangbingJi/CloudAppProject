const doc = require('dynamodb-doc');
const dynamo = new doc.DynamoDB();

exports.handler = function(event, context) {
    // this lambda function is used to delete item from a dynamoDB table
    
    // TableName and Key should be in the event
    
    dynamo.deleteItem(event, function(err, data) {
        if (err) {
            if (err.code === 'ConditionalCheckFailedException') {
                err = new Error('404 Resource not found');
                err.name = 'deleting Customer not exists in the table.';
            }
            console.log('deleteCustomer err: ' + JSON.stringify(err));
            context.done(err);
        } else {
            console.log('deleteCustomer complete, data: ' + JSON.stringify(data));
            context.succeed(data);
        }
    });
};