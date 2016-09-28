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
            callback(new Error('Unrecognized operation "${event.operation}"'));
    }
};

function validateCreate(item) {
    var errEmail = validateEmail(item.email);
    var errName = validateName(item.firstName, item.lastName);
    var errPhone = validatePhone(item.phone); 
    if(errEmail) {
        return "invalid email";
    }
    if(errName) {
        return "invalid name";
    }
    if(errPhone) {
        return "invalid phone";
    }
}
function validateEmail(email) {
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return !re.test(email);
}

function validateName(firstName, lastName) {
    var re = /^[A-Za-z]+$/;
    return !(re.test(firstName) && re.test(lastName));
}

function validatePhone(phone) {
    var re = /^\d+$/;
    return !(re.test(phone) && phone.length == 10);
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
            } else {
                console.log('getCustomer success, data: ' + JSON.stringify(data));
                callback(null, data);
            }
        });
    }    
}

function hashString(s) {
    // NOTE: This hash generates a signed int
    // Borrowed from a post on StackOverflow
    var hash = 0, i, chr, len;
    if (s.length === 0) return hash;
    for (i = 0, len = s.length; i < len; i++) {
        chr   = s.charCodeAt(i);
        hash  = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash.toString();
}

function genAddressID(item) {
    return hashString(item.city + item.street + item.number + item.zipcode);
}

function createCustomer(event, callback) {
    var params = {
        TableName: event.tableName,
        Item: {
            "email": event.item.email,
            "lastName": event.item.lastName,
            "firstName": event.item.firstName,
            "phone": event.item.phone,
        },
        ConditionExpression: ''
    };

    console.log('In createCustomer, params is: ' + JSON.stringify(params));

    var errorInput = validateCreate(params.Item);

    if (errorInput) {
        console.log('Invalid Input: ' + JSON.stringify(errorInput));
        callback(errorInput, null);
    } else {
        params.Item.addressReference = genAddressID(event.item.address);
        params.ConditionExpression  = "attribute_not_exists(#myid)";
        params.ExpressionAttributeNames = {
            "#myid": "email"
        };
        dynamo.putItem(params, function(err, data) {
            if (err) {
                console.log('createCustomer err: ' + JSON.stringify(err));
                callback(err, null);
            } else {
                console.log('createCustomer success, data: ' + JSON.stringify(data));
                callback(null, data);
            }
        });
    }
}

function updateExpression(updates, params) {
    var expr = "SET";
    var exprAttrName = {};
    var exprAttrVal = {};

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

    params.UpdateExpression = expr;
    params.ExpressionAttributeNames = exprAttrName;
    params.ExpressionAttributeValues = exprAttrVal;

    return params;
}

function updateCustomer(event, callback) {
    var params = {
        TableName: event.tableName,
        Key: {'email': event.email},
        UpdateExpression: "",
        ExpressionAttributeNames: {},
        ExpressionAttributeValues: {}
    };

    console.log('In updateCustomer, params is: ' + JSON.stringify(params));
    
    // TODO: Add condition expression 
    // TODO: validate input data
    //var err = validateUpdate(event.updates);
    var err = null;
    if (err) {
        console.log('validateEmail() returns err: ' + JSON.stringify(err));
        callback(err, null);
    } else {
        params = updateExpression(event.updates, params);
        dynamo.updateItem(params, function(err, data) {
            if (err) {
                console.log('updateCustomer err: ' + JSON.stringify(err));
                callback(err, null);
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
        ConditionExpression: ''
    };
    
    console.log('In deleteCustomer, params is: ' + JSON.stringify(params));

    var errEmail = validateEmail(params.Key.email);

    if(errEmail) {
        console.log('validateEmail() returns err: ' + JSON.stringify(errEmail));
        callback(errEmail, null);
    } else {
        params.ConditionExpression  = "attribute_exists(#myid)";
        params.ExpressionAttributeNames = {
            "#myid": "email"
        };
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
