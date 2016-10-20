'use strict';

console.log('Loading Address.js...');
const https = require('https');
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
    // check whether the new Address has all four attributes city, number, street, state, and zipcode
    var obj = {'city': false, 'number': false, 'street': false, 'state': false, 'zipcode' : false};
    for (var key in item) {
        if (key in obj) obj[key] = true;
    }
    return obj.city && obj.number && obj.street && obj.state && obj.zipcode;
}

function getNormAddr(item, callback) {
    // set auth-id and auth-token
    var id = '1a121d57-acec-669e-5f64-c413e1cd****';
    var token = '0eBxLrzCLDYDZm77****';
    var titleString = 'https://us-street.api.smartystreets.com/street-address?';
    var tileString  = "&'%20-H%20%22Content-Type:%20application/json";
    
    // check if the input item contains every field
    if (item.city === undefined || item.number === undefined || item.street === undefined
    || item.state === undefined || item.zipcode === undefined) {
        console.log('Lost some fields');
        callback(new Error('400 Invalid address: Lost some fields'), null);
    } else {
        // use SmartyStreet API and get the barcode from the response
        // create corresponding street string
        var streetArr = item.street.split(' ');
        var streetStr = '';
        for (var i in streetArr) {
            streetStr += streetArr[i] + '%20';
        }
        streetStr = streetStr.substring(0, streetStr.length-3);
        
        // create corresponding city string
        var cityArr = item.city.split(' ');
        var cityStr = '';
        for (var j in cityArr) {
            cityStr += cityArr[j] + '%20';
        }
        cityStr = cityStr.substring(0, cityStr.length-3);
        
        // create the url string
        var urlString = titleString + "auth-id=" + id + "&auth-token=" + token
                        + "&street=" + item.number + "%20" + streetStr + "&city="
                        + cityStr + "&state=" + item.state + tileString;
        
        https.get(urlString, function(res) {
            console.log("Got response: " + res.statusCode);
            res.on('data', function(d) {
                process.stdout.write(d);
                console.log('data: ' + d);
                var obj = JSON.parse(d);
                if (obj[0] === undefined) {
                    console.log('get response failed');
                    callback(new Error('400 Invalid address'), null);
                } else {
                    var resAddress = {};
                    resAddress.barcode = obj[0]["delivery_point_barcode"];
                    resAddress.components = obj[0]["components"];
                    console.log('code: ' + JSON.stringify(resAddress.addressBarcode));
                    console.log('components: ' + JSON.stringify(resAddress.addressComponents));
                    callback(null, resAddress);
                }
            });
        }).on('error', function(e) {
            console.log("Got error: " + e.message);
            callback(new Error('500 Failed to get address, err: ' + e.message), null);
        });
    }
}

function validateAddress(item, create, callback) {
    var err = null;
    if (create) {
        if (!hasAllAttributes(item)) {
            err = new Error('400 Invalid parameter');
            err.name = 'newAddress does not have enough attributes';
            callback(err, null);
        }
    } 
    for (var col in item) {
        switch (col) {
            case ('city'):
                if (typeof item.city != 'string') {
                    err = new Error('400 Invalid parameter');
                    err.name = 'wrong type! city has to be a Js string type';
                    callback(err, null);
                }
                break;
            case ('street'):
                if (typeof item.street != 'string') { 
                    err = new Error('400 Invalid parameter');
                    err.name = 'wrong type! street has to be a Js string type';
                    callback(err, null);
                }
                break;
            case ('number'):
                if (typeof item.number != 'string') {
                    err = new Error('400 Invalid parameter');
                    err.name = 'wrong type! number has to be a Js string type';
                    callback(err, null);
                } else {
                    var isNum = /^\d+$/.test(item.number);
                    if(!isNum){
                        err = new Error('400 Invalid parameter');
                        err.name = 'wrong type! street number has to be a real number';
                        callback(err, null);
                    }
                }
                break;
            case ('state'):
                if (typeof item.state != 'string') { 
                    err = new Error('400 Invalid parameter');
                    err.name = 'wrong type! state has to be a Js string type';
                    callback(err, null);
                }
                break;
            case ('zipcode'):
                if (typeof item.zipcode != 'string') {
                    err = new Error('400 Invalid parameter'); 
                    err.name = 'wrong type! zip code has to be a Js string type';
                    callback(err, null);
                }
                var re = /\d{5}/;
                if (!re.test(item.zipcode)) {
                    err = new Error('400 Invalid parameter');
                    err.name = 'zip code has to be a 5-digits number';
                    callback(err, null);
                }
                break;
            default:
               err = new Error('400 Invalid parameter');
               err.name = 'add cannot have additional fields';
               callback(err, null);
        }
    }
    getNormAddr(item, callback);
}

function ssAddr2DBFields(addr) {
    var comp = addr.components;
    return {
        'UUID': addr.barcode,
        'number': comp.primary_number,
        'city': comp.city_name,
        'street': (comp.street_predirection ? (comp.street_predirection + " ") : "") +
                comp.street_name +
                (comp.street_postdirection ? (" " + comp.street_postdirection) : "") +
                (comp.street_suffix ? (" " + comp.street_suffix) : ""),
        'state': comp.state_abbreviation,
        'zipcode': comp.zipcode + (comp.plus4_code ? ("-" + comp.plus4_code) : "")
    };
}

function createAddress(event, callback) {
    var params = {
        TableName: event.tableName,
        Item: {},
        ConditionExpression: "attribute_not_exists(#myid)",
        ExpressionAttributeNames: {"#myid": "UUID"}
    };

    console.log('In createAddress, params is: ' + JSON.stringify(params));

    validateAddress(event.item, true, function(err, addr) {
        if (err) {
            console.log('validateAddress() returns err: ' + JSON.stringify(err));
            callback(err, null);
        } else {
            params.Item = ssAddr2DBFields(addr);
            dynamo.putItem(params, function(err, data) {
                // Return OK and the UUID when address is already in table
                if (err && err.code != "ConditionalCheckFailedException") {
                    console.log('createAddress err: ' + JSON.stringify(err));
                    callback(err, null);
                } else {
                    if (err) {
                        // err.code == "ConditionalCheckFailedException"
                        console.log('createAddress: UUID conflict, treat it as successful creation');
                    }
                    else {
                        console.log('createAddress success, data: ' + JSON.stringify(data));
                    }
                    // return the UUID as the API response
                    callback(null, { UUID: params.Item.UUID });
                }
            });
        }
    });
}

function updateExpression(item, params) {
    var expr = " SET";
    var exprAttrName = params.ExpressionAttributeNames;
    var exprAttrVal = params.ExpressionAttributeValues;

    for (var key in item) {
        var attrKey = "#" + key;
        var attrVal = ":" + key;
        expr += " " + attrKey + " = " + attrVal + ",";
        exprAttrName[attrKey] = key;
        exprAttrVal[attrVal] = item[key];
    }
    expr = expr.slice(0, -1);

    console.log("Translated expr in updateExpression: " + expr);
    console.log("Translated exprAttrName in updateExpression: " + JSON.stringify(exprAttrName));
    console.log("Translated exprAttrVal in updateExpression: " + JSON.stringify(exprAttrVal));

    params.UpdateExpression += expr;

    return params;
}

function __doUpdateAddress(event, callback) {
    // have to create the updated address,
    // for the primary key UUID isn't allowed to modify
    createAddress(event, callback);
}

function updateAddress(event, callback) {
    if (!hasAllAttributes(event.item)) {
        // if event.item is lack of some attributes, patch it for verifying the address
        getAddress({tableName: event.tableName, UUID: event.UUID}, function (err, data) { 
            if (err) {
                console.log('updateAddress err: getAddress failed- ' + JSON.stringify(err));
                callback(err, null);
            } 
            // patch missed fields by its original values
            for (var key in data.Item) {
                if (!(key in event.item) && key != 'UUID') {
                    event.item[key] = data.Item[key];
                }
            }
            console.log('updateAddress: patched item- ' + JSON.stringify(event.item));
            __doUpdateAddress(event, callback);
        });
    } 
    else {
        __doUpdateAddress(event, callback);
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
