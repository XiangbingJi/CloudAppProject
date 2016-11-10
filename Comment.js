'use strict';

console.log('Loading Comment.js...');
const doc = require('dynamodb-doc');
const dynamo = new doc.DynamoDB();

exports.handler = function(event, context, callback) {
    console.log('handler event: ' + JSON.stringify(event));
    console.log('handler context: ' + JSON.stringify(context));

    var operation = event.operation;

    switch (operation) {
        case ('create'):
            createComment(event, callback);
            break;
        case ('read'):
            getComment(event, callback);
            break;
        case ('update'):
            updateComment(event, callback);
            break;
        case ('delete'):
            deleteComment(event, callback);
            break;
        default:
            var err = new Error('405 Unrecognized operation');
            err.name = 'Unrecognized operation "${event.operation}"';
            callback(err, null);
    }
};

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

function validateComment(item) {
    var err = null;
    if("comment" in item) {
        err = validateCommentStr(item.comment);
        if (err) return err;
    }
    if("content_id" in item) {
        err = validateContentID(item.content_id);
        if (err) return err;
    }
    if("user_id" in item) {
        err = validateUserID(item.user_id);
        if (err) return err;
    }
    return err;
}

function validateCommentStr(comment) {
    var err = null;
    if(comment === undefined || typeof comment != 'string') {
        err = new Error("400 Invalid parameter");
        err.name = "Comment is invalid";
    }
    return err;
}

function validateContentID(contid) {
    var err = null;
    if(contid === undefined || typeof contid != 'string') {
        err = new Error("400 Invalid parameter");
        err.name = "content_id is invalid";
    }
    return err;
}

function validateUserID(uid) {
    var err = null;
    // RE of the pattern of email address
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if(uid === undefined || !re.test(uid)) {
        err = new Error("400 Invalid parameter");
        err.name = "user_id is invalid";
    }
    return err;
}

function validateID(id) {
    var err = null;
    if(id === undefined || typeof id != 'string') {
        err = new Error("400 Invalid parameter");
        err.name = "comment_id is invalid";
    }
    return err;
}

function hasAllAttributes(item) {
    // check whether the new comment has all necessary attributes.
    var attrs = ['comment', 'content_id', 'user_id'];
    attrs.forEach(function (attr) {
        if (!(attr in item)) return false;
    });
    return true;
}

function getComment(event, callback) {
    var params = {
        TableName: event.tableName,
        Key: {'comment_id': event.comment_id}
    };

    console.log('In getComment, params is: ' + JSON.stringify(params));

    var err = validateID(params.Key.comment_id);

    if(err) {
        console.log('validateID() returns err: ' + JSON.stringify(err));
        callback(err, null);
    } else {
        dynamo.getItem(params, function (err, data) {
            if (err) {
                console.log('getComment err: ' + JSON.stringify(err));
                callback(err, null);
            } else if (Object.keys(data).length === 0) {
                err = new Error('404 Resource not found');
                err.name = 'Item is not found in the table, cannot read!';
                callback(err, null);
           } else {
                console.log('getComment success, data: ' + JSON.stringify(data));
                callback(null, data);
            }
        });
    }
}

function createComment(event, callback) {
    var params = {
        TableName: event.tableName,
        Item: event.item,
        ConditionExpression: "attribute_not_exists(#myid)",
        ExpressionAttributeNames: {"#myid": "comment_id"}
    };

    console.log('In createComment, params is: ' + JSON.stringify(params));

    var err = !hasAllAttributes(params.Item);
    if (err) {
        console.log('400 Incomplete input');
        err = new Error('400 invalid parameter');
        err.name = 'Incomplete input';
        callback(err, null);
    }
    else
    {
        err = validateComment(params.Item);

        if (err) {
            console.log('Invalid Input: ' + JSON.stringify(err));
            callback(err, null);
        } else {
            params.Item.comment_id = randomID();
            dynamo.putItem(params, function(err, data) {
                if (err) {
                    if (err.code === 'ConditionalCheckFailedException') {
                        err = new Error('403 permission denied');
                        err.name = 'ID conflicts';
                    }
                    console.log('createComment err: ' + JSON.stringify(err));
                    callback(err, null);
                } else {
                    console.log('createComment success, data: ' + JSON.stringify(data));
                    data.comment_id = params.Item.comment_id;
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

function updateComment(event, callback) {
    var params = {
        TableName: event.tableName,
        Key: {'comment_id': event.comment_id},
        ConditionExpression: "attribute_exists(#myid)",
        UpdateExpression: "",
        ExpressionAttributeNames: {"#myid": "comment_id"},
        ExpressionAttributeValues: {}
    };

    console.log('In updateComment, params is: ' + JSON.stringify(params));

    var err = validateComment(event.item);
    if (err) {
        console.log('validateComment() returns err: ' + JSON.stringify(err));
        callback(err, null);
    } else {
        params = updateExpression(event.item, params);
        dynamo.updateItem(params, function(err, data) {
            if (err) {
                if (err.code === 'ConditionalCheckFailedException') {
                    err = new Error('404, Resource not found');
                    err.name = 'updating comment does not exist in the table.';
                }
                console.log('updateComment err: ' + JSON.stringify(err));
                callback(err, null);
            } else {
                console.log('updateComment success, data: ' + JSON.stringify(data));
                callback(null, data);
            }
        });
    }
}

function deleteComment(event, callback) {
    var params = {
        TableName: event.tableName,
        Key: {'comment_id': event.comment_id},
        ConditionExpression: "attribute_exists(#myid)",
        ExpressionAttributeNames: {"#myid": "comment_id"}
    };

    console.log('In deleteComment, params is: ' + JSON.stringify(params));

    var err = validateID(params.Key.comment_id);
    if(err) {
        console.log('validateID() returns err: ' + JSON.stringify(err));
        callback(err, null);
    } else {
        dynamo.deleteItem(params, function(err, data) {
            if (err) {
                if (err.code === 'ConditionalCheckFailedException') {
                    err = new Error('404 Resource not found');
                    err.name = 'deleting comment does not exist in the table.';
                }
                console.log('deleteComment err: ' + JSON.stringify(err));
                callback(err, null);
            } else {
                console.log('deleteComment complete, data: ' + JSON.stringify(data));
                callback(null, data);
            }
        });
    }
}

