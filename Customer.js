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
            err = new Error('405 Unrecognized operation');
            err.name = 'Unrecognized operation "${event.operation}"'
            callback(err, null)
    }
};

function validateCustomer(item) {
    var err = null;
    if("email" in item) {
        err = validateEmail(item.email);
        if (err) return err;
    }
    if("firstname" in item) {
        err = validateFirstName(item.firstname);
        if (err) return err;
    }
    if("lastname" in item) {
        err = validateLastName(item.lastname);
        if (err) return err;
    }
    if("phone_num" in item) {
        err = validatePhone(item.phone_num);
        if (err) return err;
    }
    return err;
}

function validateEmail(email) {
    // regular expression borrowed from a post in stackoverflow
    var err = null;
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if(email === undefined || !re.test(email)) {
        err = new Error("400 Invalid parameter");
        err.name = "Email is invalid";
    }
    return err;
}

function validateFirstName(name) {
    var err = null;
    var re = /^[A-Za-z]+$/;
    if (name === undefined || !re.test(name)) {
        err = new Error('400 Invalid parameter');
        err.name = 'First name is invalid!';
    }
    return err;
}

function validateLastName(name) {
    var err = null;
    var re = /^[A-Za-z]+$/;
    if (name === undefined|| !re.test(name)) {
        err = new Error('400 Invalid parameter');
        err.name = 'Last name is invalid!';
    }
    return err;
}

function validatePhone(phone) {
    var err = null;
    var re = /^\d+$/;
    if (phone === undefined || !re.test(phone) || phone.length != 10) {
        err = new Error('400 Invalid parameter');
        err.name = 'Phone number is invalid!';
    }
    return err;
}
function hasAllAttributes(item) {
    // check whether the new customer has all necessary attributes.
    var obj = {'firstname': false, 'lastname': false, 'email': false, 'phone_num' : false, 'address_ref' : false};
    for (var key in item) {
        if (key in obj) obj.key = true;
    }
    return obj.city && obj.number && obj.street && obj.zip && obj.address;
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
                err = new Error('404 Resource not found');
                err.name = 'Item is not found in the table, cannot read!';
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

    var err = hasAllAttributes(params.item);
    if (err) {
        console.log('400 Invalid input, newCustomer does not have enough attributes');
        err = new Error('400 invalid parameter');
        err.name = 'newCustomer does not have enough attributes';
        callback(err, null);
    }
    else
    {
        err = validateCustomer(params.Item);

        if (err) {
            console.log('Invalid Input: ' + JSON.stringify(err));
            callback(err, null);
        } else {
            dynamo.putItem(params, function(err, data) {
                if (err) {
                    if (err.code === 'ConditionalCheckFailedException') {
                        err = new Error('403 permission denied');
                        err.name = 'Creating Customer already exists in the table';
                    }
                    console.log('createCustomer err: ' + JSON.stringify(err));
                    callback(err, null);
                } else {
                    console.log('createCustomer success, data: ' + JSON.stringify(data));
                    callback(null, data);
                }
            });
        }
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
    
    var err = validateCustomer(event.updates);
    if (err) {
        console.log('validateEmail() returns err: ' + JSON.stringify(err));
        callback(err, null);
    } else {
        params = updateExpression(event.updates, params);
        dynamo.updateItem(params, function(err, data) {
            if (err) {
                if (err.code === 'ConditionalCheckFailedException') {
                    err = new Error('404, permission denied');
                    err.name = 'updating Customer not exists in the table.';
                }
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
                if (err.code === 'ConditionalCheckFailedException') {
                    err = new Error('404, permission denied');
                    err.name = 'deleting Customer not exists in the table.';
                }
                console.log('deleteCustomer err: ' + JSON.stringify(err));
                callback(err, null);
            } else {
                console.log('deleteCustomer complete, data: ' + JSON.stringify(data));
                callback(null, data);
            }
        });
    }
}

function getCustomerAddress(event, callback) {
    var params = {
        TableName: event.tableName,
        Key: {'email': event.email},
    };
    
    console.log('In deleteCustomer, params is: ' + JSON.stringify(params));

    var errEmail = validateEmail(params.Key.email);

    if(errEmail) {
        console.log('validateEmail() returns err: ' + JSON.stringify(errEmail));
        callback(errEmail, null);
    } else {
        var addressRef = null;
        dynamo.getItem(params, function (err, data) {
            if (err) {
                console.log('getCustomer err: ' + JSON.stringify(err));
                callback(err, null);
            } else if (Object.keys(data).length === 0) {
                err = new Error('404 Resource not found');
                err.name = 'Item is not found in the table, cannot read!';
                callback(err, null);
           } else {
                console.log('getCustomer success, data: ' + JSON.stringify(data));
                addressRef = data.Item.address_ref;
                params.TableName = 'Address';
                params.Key = {'UUID': addressRef};
                dynamo.getItem(params, function(err, data) {
                    if (err) {
                        console.log('get customer address err: ' + JSON.stringify(err));
                        callback(err, null);
                    } else if (Object.keys(data).length === 0) {
                        err = new Error('404 Resource not found');
                        err.name = 'Item is not found in the table, cannot read!';
                        callback(err, null);
                    } else {
                        console.log('getCustomer success, data: ' + JSON.stringify(data));
                        callback(null, data);
                    }
                });
            }
        });
    }
}