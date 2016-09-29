'use strict';

console.log('Loading Address.js...');
const doc = require('dynamodb-doc');
const dynamo = new doc.DynamoDB();

exports.handler = function(event, context, callback) {
    console.log('handler event: ' + JSON.stringify(event));
    console.log('handler context: ' + JSON.stringify(context));
    
    var operation = event.operation;

    switch (operation) {
        case ('read'):
            getAddress(event, callback);
            break;
        case ('create'):
            createAddress(event, callback);
            break;
        case ('update'):
            updateAddress(event, callback);
            break;
        case ('delete'):
            deleteAddress(event, callback);
            break;
        default:
            var err = new Error('405 Unrecognized operation "${event.operation}"');
            err.name = '405';
            callback(err, null);
    }
};

function getAddress(event, callback) {
    
    var params = {
        TableName: event.tableName,
        Key: {'UUID': event.UUID}
    };
    
    console.log('In getAddress, params is: ' + JSON.stringify(params));
    
    dynamo.getItem(params, function (err, data) {
       if (err) {
           console.log('getAddress err: ' + JSON.stringify(err));
           callback(err, null);
       } else if (JSON.stringify(data).length === 0) {
           err = new Error ('key not found in the table');
           err.name = '404';
           callback(err, null);
       }
       else{
           console.log('getAddress success, data: ' + JSON.stringify(data));
           callback(null, data);
       }
    });
}

function hasAllAttributes(item) {
    // check whether the new Address has all four attributes city, number, street and zip
    var obj = {'city': false, 'number': false, 'street': false, 'zip' : false};
    for (var key in item) {
        if (key in obj) obj.key = true;
    }
    return obj.city && obj.number && obj.street && obj.zip;
}

function validateAddress(item, create) {
    // TODO: Check duplicate item
    if (create) {
        if (hasAllAttributes(item)) {
            var err = new Error('400 newAddress does not have enough attributes');
            err.name = '400';
            return err;
        }
    } 
    for (var col in item) {
        switch (col) {
            case ('city'):
                if (typeof item.city != 'string') {
                    err = new Error('400 wrong type! city has to be a Js string type');
                    err.name = '400';
                    return err;
                }
                break;
            case ('street'):
                if (typeof item.street != 'string') { 
                    err = new Error('400 wrong type! street has to be a Js string type');
                    err.name = '400';
                    return err;
                }
                break;
            case ('number'):
                if (typeof item.number != 'number') {
                    err = new Error('400 wrong type! number has to be a Js number type');
                    err.name = '400';
                    return err;
                }
                break;
            case ('zip'):
                if (typeof item.zip != 'string') {
                    err = new Error('400 wrong type! zip code has to be a Js string type'); 
                    err.name = '400';
                    return err;
                }
                var re = /\d{5}/;
                if (!re.test(item.zip)) {
                    err = new Error('400 zip code has to be a 5-digits number');
                    err.name = '400';
                    return err;
                }
                break;
            default:
                return new Error('400 new address can not have colmun other than city, street, number and zip');
        }
    }
    return null;
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

function createAddress(event, callback) {
    var params = {
        TableName: event.tableName,
        Item: event.item,
        ConditionExpression: "attribute_not_exists(#myid)",
        ExpressionAttributeNames: {"#myid": "UUID"}
    };

    console.log('In createAddress, params is: ' + JSON.stringify(params));

    var err = validateAddress(params.Item, true);
    if (err) {
        console.log('validateAddress() returns err: ' + JSON.stringify(err));
        callback(err, null);
    } else {
        params.Item.UUID = genAddressID(params.Item); 
        dynamo.putItem(params, function(err, data) {
            if (err) {
                // TODO check errtype == 'ConditionalCheckFailedException'
                console.log('createAddress err: ' + JSON.stringify(err));
                callback(err, null);
            } else {
                console.log('createAddress success, data: ' + JSON.stringify(data));
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

function updateAddress(event, callback) {
    var params = {
        TableName: event.tableName,
        Key: {'UUID': event.UUID},
        ConditionExpression: "attribute_exists(#myid)",
        UpdateExpression: "",
        ExpressionAttributeNames: {"#myid": "UUID"},
        ExpressionAttributeValues: {}
    };

    console.log('In updateAddress, params is: ' + JSON.stringify(params));
    
    var err = validateAddress(event.updates, false);
    if (err) {
        console.log('validateAddress() returns err: ' + JSON.stringify(err));
        callback(err, null);
    } else {
        params = updateExpression(event.updates, params);
        dynamo.updateItem(params, function(err, data) {
            if (err) {
                console.log('updateAddress err: ' + JSON.stringify(err));
                callback(err, null);
                // TODO check errtype == 'ConditionalCheckFailedException'
            } else {
                console.log('updateAddress success, data: ' + JSON.stringify(data));
                callback(null, data);
            }
        });
    }
}

function deleteAddress(event, callback) {
    var params = {
        TableName: event.tableName,
        Key: {'UUID': event.UUID},
        ConditionExpression: "attribute_not_exists(#myid)",
        ExpressionAttributeNames: {"#myid": "UUID"}
    };
    
    console.log('In deleteAddress, params is: ' + JSON.stringify(params));
    
    dynamo.deleteItem(params, function(err, data) {
        if (err) {
            console.log('deleteAddress err: ' + JSON.stringify(err));
            callback(err, null);
        } else {
            console.log('deleteAddress complete, data: ' + JSON.stringify(data));
            callback(null, data);
        }
    });
}
