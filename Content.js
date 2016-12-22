'use strict';

console.log('Loading Content.js...');
const doc = require('dynamodb-doc');
const dynamo = new doc.DynamoDB();

exports.handler = function(event, context, callback) {
    console.log('handler event: ' + JSON.stringify(event));
    console.log('handler context: ' + JSON.stringify(context));

    if (event.Records !== undefined)
        event = JSON.parse(event.Records[0].Sns.Message);

    var operation = event.operation;

    switch (operation) {
        case ('create'):
            createContent(event, callback);
            break;
        case ('read'):
            getContent(event, callback);
            break;
        case ('update'):
            updateContent(event, callback);
            break;
        case ('delete'):
            deleteContent(event, callback);
            break;
        default:
            var err = new Error('405 Unrecognized operation');
            err.name = 'Unrecognized operation "${event.operation}"';
            // callback(err, null);
            putResult(event.res_key, err, callback);
    }
};

function putResult(key, res, cb) {
    var params = {
        TableName: "Result",
        Item: { "key": key, "result": JSON.stringify(res) }
    };

    dynamo.putItem(params, function(err, data) {
        if (err) {
            console.log('putResult err: ' + JSON.stringify(err));
        }
    });
    cb(null, 'putResult ends');
}

function randomID() {
  var totalCharacters = 39; // length of number hash; in this case 0-39 = 40 characters
   var txtId = "";
   do {
       var point = Math.floor(Math.random() * 10);
       if (txtId.length === 0 && point === 0) {
           do {
               point = Math.floor(Math.random() * 10);
           } while (point === 0);
       }
       txtId = txtId + point;
   } while ((txtId.length - 1) < totalCharacters);
   return txtId;
 }

function validateContent(item) {
    var err = null;
    if("property" in item) {
        err = validateProperty(item.property);
        if (err) return err;
    }
    if("franchise" in item) {
        err = validateFranchise(item.franchise);
        if (err) return err;
    }
    if("series" in item) {
        err = validateSeries(item.series);
        if (err) return err;
    }
    if("episode" in item) {
        err = validateEpisode(item.episode);
        if (err) return err;
    }
    return err;
}

function validateProperty(prop) {
    var err = null;
    if(prop === undefined || typeof prop != 'string') {
        err = new Error("400 Invalid parameter");
        err.name = "Property is invalid";
    }
    return err;
}

function validateFranchise(franc) {
    var err = null;
    if(franc === undefined || typeof franc != 'string') {
        err = new Error("400 Invalid parameter");
        err.name = "Franchise is invalid";
    }
    return err;
}

function validateSeries(series) {
    var err = null;
    if(series === undefined || typeof series != 'string') {
        err = new Error("400 Invalid parameter");
        err.name = "Series is invalid";
    }
    return err;
}

function validateEpisode(episode) {
    var err = null;
    if(episode === undefined || typeof episode != 'string') {
        err = new Error("400 Invalid parameter");
        err.name = "Episode is invalid";
    }
    return err;
}

function validateID(id) {
    var err = null;
    if(id === undefined || typeof id != 'string') {
        err = new Error("400 Invalid parameter");
        err.name = "content_id is invalid";
    }
    return err;
}

function hasAllAttributes(item) {
    // check whether the new content has all necessary attributes.
    var attrs = ['property', 'franchise', 'series', 'episode'];
    attrs.forEach(function (attr) {
        if (!(attr in item)) return false;
    });
    return true;
}

function getContent(event, callback) {
    var params = {
        TableName: event.tableName,
        Key: {'content_id': event.content_id}
    };

    console.log('In getContent, params is: ' + JSON.stringify(params));

    var err = validateID(params.Key.content_id);

    if(err) {
        console.log('validateID() returns err: ' + JSON.stringify(err));
        // callback(err, null);
        putResult(event.res_key, err, callback);
    } else {
        dynamo.getItem(params, function (err, data) {
            if (err) {
                console.log('getContent err: ' + JSON.stringify(err));
                // callback(err, null);
                putResult(event.res_key, err, callback);
            } else if (Object.keys(data).length === 0) {
                err = new Error('404 Resource not found');
                err.name = 'Item is not found in the table, cannot read!';
                // callback(err, null);
                putResult(event.res_key, err, callback);
           } else {
                console.log('getContent success, data: ' + JSON.stringify(data));
                // callback(null, data);
                putResult(event.res_key, data, callback);
            }
        });
    }
}

function createContent(event, callback) {
    var params = {
        TableName: event.tableName,
        Item: event.item,
        ConditionExpression: "attribute_not_exists(#myid)",
        ExpressionAttributeNames: {"#myid": "content_id"}
    };

    console.log('In createContent, params is: ' + JSON.stringify(params));

    var err = !hasAllAttributes(params.Item);
    if (err) {
        console.log('400 Incomplete input');
        err = new Error('400 invalid parameter');
        err.name = 'Incomplete input';
        // callback(err, null);
        putResult(event.res_key, err, callback);
    }
    else
    {
        err = validateContent(params.Item);

        if (err) {
            console.log('Invalid Input: ' + JSON.stringify(err));
            // callback(err, null);
            putResult(event.res_key, err, callback);
        } else {
            params.Item.content_id = randomID();
            dynamo.putItem(params, function(err, data) {
                if (err) {
                    if (err.code === 'ConditionalCheckFailedException') {
                        err = new Error('403 permission denied');
                        err.name = 'ID conflicts';
                    }
                    console.log('createContent err: ' + JSON.stringify(err));
                    // callback(err, null);
                    putResult(event.res_key, err, callback);
                } else {
                    console.log('createContent success, data: ' + JSON.stringify(data));
                    data.content_id = params.Item.content_id;
                    // callback(null, data);
                    putResult(event.res_key, data, callback);
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

function updateContent(event, callback) {
    var params = {
        TableName: event.tableName,
        Key: {'content_id': event.content_id},
        ConditionExpression: "attribute_exists(#myid)",
        UpdateExpression: "",
        ExpressionAttributeNames: {"#myid": "content_id"},
        ExpressionAttributeValues: {}
    };

    console.log('In updateContent, params is: ' + JSON.stringify(params));

    var err = validateContent(event.item);
    if (err) {
        console.log('validateContent() returns err: ' + JSON.stringify(err));
        // callback(err, null);
        putResult(event.res_key, err, callback);
    } else {
        params = updateExpression(event.item, params);
        dynamo.updateItem(params, function(err, data) {
            if (err) {
                if (err.code === 'ConditionalCheckFailedException') {
                    err = new Error('404, Resource not found');
                    err.name = 'updating content does not exist in the table.';
                }
                console.log('updateContent err: ' + JSON.stringify(err));
                // callback(err, null);
                putResult(event.res_key, err, callback);
            } else {
                console.log('updateContent success, data: ' + JSON.stringify(data));
                // callback(null, data);
                putResult(event.res_key, data, callback);
            }
        });
    }
}

function deleteContent(event, callback) {
    var params = {
        TableName: event.tableName,
        Key: {'content_id': event.content_id},
        ConditionExpression: "attribute_exists(#myid)",
        ExpressionAttributeNames: {"#myid": "content_id"}
    };

    console.log('In deleteContent, params is: ' + JSON.stringify(params));

    var err = validateID(params.Key.content_id);
    if(err) {
        console.log('validateID() returns err: ' + JSON.stringify(err));
        // callback(err, null);
        putResult(event.res_key, err, callback);
    } else {
        dynamo.deleteItem(params, function(err, data) {
            if (err) {
                if (err.code === 'ConditionalCheckFailedException') {
                    err = new Error('404 Resource not found');
                    err.name = 'deleting content does not exist in the table.';
                }
                console.log('deleteContent err: ' + JSON.stringify(err));
                // callback(err, null);
                putResult(event.res_key, err, callback);
            } else {
                console.log('deleteContent complete, data: ' + JSON.stringify(data));
                // callback(null, data);
                putResult(event.res_key, data, callback);
            }
        });
    }
}

