'use strict';

console.log('Loading Customer.js...');
const doc = require('dynamodb-doc');
const dynamo = new doc.DynamoDB();

exports.handler = function(event, context, callback) {
    console.log('handler event: ' + JSON.stringify(event));
    console.log('handler context: ' + JSON.stringify(context));
    
    var operation = event.operation;

    switch (operation) {
        case ('read'):
            getCustomer(event, callback);
            break;
        case ('create'):
            createCustomer(event, callback);
            break;
        case ('update'):
            updateCustomer(event, callback);
            break;
        case ('delete'):
            deleteCustomer(event, callback);
            break;
        default:
            callback(new Error('405 Unrecognized operation'));
    }
};

function validateCreate(item) {
    var errEmail = validateEmail(item.email);
    var errFirstName = validateFirstName(item.firstname);
    var errLastName = validateLastName(item.lastname);
    var errPhone = validatePhone(item.phone_num); 
    if(errEmail) {
        return errEmail;
    }
    if(errFirstName) {
        return errFirstName;
    }
    if(errLastName) {
        return errLastName;
    }
    if(errPhone) {
        return errPhone;
    }
    // TODO: Check address_ref
    return null;
}

function validateUpdate(updates) {
    var errEmail = null;
    var errFirstName = null;
    var errLastName = null;
    var errPhone = null; 
    if (updates.email != undefined) errEmail = validateEmail(updates.email);
    if (updates.firstname != undefined) errFirstName = validateFirstName(updates.firstname);
    if (updates.lastname != undefined) errLastName = validateLastName(updates.lastname);
    if (updates.phone_num != undefined) errPhone = validatePhone(updates.phone_num);
    if(errEmail) {
        return errEmail;
    }
    if(errFirstName) {
        return errFirstName;
    }
    if(errLastName) {
        return errLastName;
    }
    if(errPhone) {
        return errPhone;
    }
    // TODO: Check address_ref
    return null;
}

function validateEmail(email) {
    var err = null;
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (email == undefined || !re.test(email)) {
        err = new Error('400 Email is invalid!');
    }
    return err;
}

function validateFirstName(name) {
    var err = null;
    var re = /^[A-Za-z]+$/;
    if (name == undefined || !re.test(name)) {
        err = new Error('400 First name is invalid!');
    }
    return err;
}

function validateLastName(name) {
    var err = null;
    var re = /^[A-Za-z]+$/;
    if (name == undefined || !re.test(name)) {
        err = new Error('400 Last name is invalid!');
    }
    return err;
}

function validatePhone(phone) {
    var err = null;
    var re = /^\d+$/;
    if (phone == undefined || !re.test(phone)) {
        err = new Error('400 Phone number is invalid!');
    }
    return err;
}

function getCustomer(event, callback) {
    
    var params = {
        TableName: event.tableName,
        Key: {'email': event.email}
    };
    
    console.log('In getCustomer, params is: ' + JSON.stringify(params));
    
    var err = validateEmail(params.Key.email);

    if(err) {
        console.log('validateEmail() returns err: ' + JSON.stringify(err));
        callback(err, null);
    } else {
        dynamo.getItem(params, function (err, data) {
            if (err) {
                console.log('getCustomer err: ' + JSON.stringify(err));
                callback(err, null);
            } else if (Object.keys(data).length === 0) {
                err = new Error('404, Item is not found in the table, cannot read!');
                callback(err, null);
           } else {
                console.log('getCustomer success, data: ' + JSON.stringify(data));
                callback(null, data);
            }
        });
    }    
}

function createCustomer(event, callback) {
    var params = {
        TableName: event.tableName,
        Item: event.item,
        ConditionExpression: "attribute_not_exists(#myid)",
        ExpressionAttributeNames: {"#myid": "email"}
    };

    console.log('In createCustomer, params is: ' + JSON.stringify(params));

    var err = validateCreate(params.Item);

    if (err) {
        console.log('Invalid Input: ' + JSON.stringify(err));
        callback(err, null);
    } else {
        dynamo.putItem(params, function(err, data) {
            if (err) {
                console.log('createCustomer err: ' + JSON.stringify(err));
                callback(err, null);
                // TODO check errtype == 'ConditionalCheckFailedException'
            } else {
                console.log('createCustomer success, data: ' + JSON.stringify(data));
                callback(null, data);
            }
        });
    }
}

function updateExpression(updates, params) {
    var expr = " SET";
    var exprAttrName = params.ExpressionAttributeNames;
    var exprAttrVal = params.ExpressionAttributeValues;

    for (var key in updates) {
        var attrKey = "#" + key;
        var attrVal = ":" + key;
        expr += " " + attrKey + " = " + attrVal + ",";
        exprAttrName[attrKey] = key;
        exprAttrVal[attrVal] = updates[key];
    }
    expr = expr.slice(0, -1);

    console.log("Translated expr in updateExpression: " + expr);
    console.log("Translated exprAttrName in updateExpression: " + JSON.stringify(exprAttrName));
    console.log("Translated exprAttrVal in updateExpression: " + JSON.stringify(exprAttrVal));

    params.UpdateExpression += expr;

    return params;
}

function updateCustomer(event, callback) {
    var params = {
        TableName: event.tableName,
        Key: {'email': event.email},
        ConditionExpression: "attribute_exists(#myid)",
        UpdateExpression: "",
        ExpressionAttributeNames: {"#myid": "email"},
        ExpressionAttributeValues: {}
    };

    console.log('In updateCustomer, params is: ' + JSON.stringify(params));
    
    var err = validateUpdate(event.updates);
    if (err) {
        console.log('validateEmail() returns err: ' + JSON.stringify(err));
        callback(err, null);
    } else {
        params = updateExpression(event.updates, params);
        dynamo.updateItem(params, function(err, data) {
            if (err) {
                console.log('updateCustomer err: ' + JSON.stringify(err));
                callback(err, null);
                // TODO check errtype == 'ConditionalCheckFailedException'
            } else {
                console.log('updateCustomer success, data: ' + JSON.stringify(data));
                callback(null, data);
            }
        });
    }
}

function deleteCustomer(event, callback) {
    var params = {
        TableName: event.tableName,
        Key: {'email': event.email},
        ConditionExpression: "attribute_exists(#myid)",
        ExpressionAttributeNames: {"#myid": "email"}
    };
    
    console.log('In deleteCustomer, params is: ' + JSON.stringify(params));

    var errEmail = validateEmail(params.Key.email);

    if(errEmail) {
        console.log('validateEmail() returns err: ' + JSON.stringify(errEmail));
        callback(errEmail, null);
    } else {
        dynamo.deleteItem(params, function(err, data) {
            if (err) {
                console.log('deleteCustomer err: ' + JSON.stringify(err));
                callback(err, null);
            } else {
                console.log('deleteCustomer complete, data: ' + JSON.stringify(data));
                callback(null, data);
            }
        });
    }
}
