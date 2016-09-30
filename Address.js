'use strict';

console.log('Loading Address.js...');
const doc = require('dynamodb-doc');
const dynamo = new doc.DynamoDB();

function generateUUID() {
    var totalCharacters = 39; // length of number hash; in this case 0-39 = 40 characters
    var txtUuid = "";
    do {
        var point = Math.floor(Math.random() * 10);
        if (txtUuid.length === 0 && point === 0) {
            do {
                point = Math.floor(Math.random() * 10);
            } while (point === 0);
        }
        txtUuid = txtUuid + point;
    } while ((txtUuid.length - 1) < totalCharacters);
    return txtUuid;
}


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
            var err = new Error('405 Invalid request method');
            err.name = 'Unrecognized operation "${event.operation}"';
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
       } else if (Object.keys(data).length === 0) {
           err = new Error ('404 Resource not found');
           err.name = 'key not found in the table';
           callback(err, null);
       }
       else{
           console.log('getAddress success, data: ' + JSON.stringify(data));
           callback(null, data);
       }
    });
}

function hasAllAttributes(item) {
    // check whether the new Address has all four attributes city, number, street and zipcode
    var obj = {'city': false, 'number': false, 'street': false, 'zipcode' : false};
    for (var key in item) {
        if (key in obj) obj.key = true;
    }
    return obj.city && obj.number && obj.street && obj.zipcode;
}


function validateAddress(item, create) {
    var err = null;
    if (create) {
        if (hasAllAttributes(item)) {
            err = new Error('400 Invalid parameter');
            err.name = 'newAddress does not have enough attributes';
            return err;
        }
    } 
    for (var col in item) {
        switch (col) {
            case ('city'):
                if (typeof item.city != 'string') {
                    err = new Error('400 Invalid parameter');
                    err.name = 'wrong type! city has to be a Js string type';
                    return err;
                }
                break;
            case ('street'):
                if (typeof item.street != 'string') { 
                    err = new Error('400 Invalid parameter');
                    err.name = 'wrong type! street has to be a Js string type';
                    return err;
                }
                break;
            case ('number'):
                if (typeof item.number != 'string') {
                    err = new Error('400 Invalid parameter');
                    err.name = 'wrong type! number has to be a Js string type';
                    return err;
                } else {
                    var isNum = /^\d+$/.test(item.number);
                    if(!isNum){
                        err = new Error('400 Invalid parameter');
                        err.name = 'wrong type! street number has to be a real number';
                        return err;
                    }
                }
                break;
            case ('zipcode'):
                if (typeof item.zipcode != 'string') {
                    err = new Error('400 Invalid parameter'); 
                    err.name = 'wrong type! zip code has to be a Js string type';
                    return err;
                }
                var re = /\d{5}/;
                if (!re.test(item.zipcode)) {
                    err = new Error('400 Invalid parameter');
                    err.name = 'zip code has to be a 5-digits number';
                    return err;
                }
                break;
            default:
               err = new Error('400 Invalid parameter');
               err.name = 'add cannot have additional fields';
               return err;
        }
    }
    return null;
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
        var thisUUID = generateUUID();
        params.Item.UUID = thisUUID; 
        dynamo.putItem(params, function(err, data) {
            if (err && err.code == "ConditionalCheckFailedException") {
                err = new Error('403 Permission denied');
                err.name = "This address is already in the table";
                console.log('createAddress err: ' + JSON.stringify(err));
                callback(err, null);
            } else if (err) {
                console.log('createAddress err: ' + JSON.stringify(err));
                callback(err, null);
            } else {
                console.log('createAddress success, data: ' + JSON.stringify(data));
                data['UUID'] = thisUUID;
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
            if (err && err.code == "ConditionalCheckFailedException") {
                err = new Error('404 Resource not found');
                err.name = "Updating address is not found in the table";
                console.log('updateAddress err: ' + JSON.stringify(err));
                callback(err, null);
            } else if (err) {
                console.log('updateAddress err: ' + JSON.stringify(err));
                callback(err, null);
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
        ConditionExpression: "attribute_exists(#myid)",
        ExpressionAttributeNames: {"#myid": "UUID"}
    };
    
    console.log('In deleteAddress, params is: ' + JSON.stringify(params));
    
    dynamo.deleteItem(params, function(err, data) {
        if (err && err.code == "ConditionalCheckFailedException") {
            err = new Error('404 Resource not found');
            err.name = "Deleting address is not found in the table";
            console.log('deleteAddress err: ' + JSON.stringify(err));
            callback(err, null);
        } else if (err) {
            console.log('deleteAddress err: ' + JSON.stringify(err));
            callback(err, null);
        } else {
            console.log('deleteAddress complete, data: ' + JSON.stringify(data));
            callback(null, data);
        }
    });
}
