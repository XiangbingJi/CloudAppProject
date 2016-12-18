'use strict';

console.log('Loading TheApp.js...');

var aws = require('aws-sdk');  
var sns = new aws.SNS();

exports.handler = function(event, context, callback) {  
    console.log('handler event: ' + JSON.stringify(event));
    console.log('handler context: ' + JSON.stringify(context)); 

    var pub_event = deepcopy(event);
    delete pub_event.topic;
    pub_event.res_key = generateUUID();

    sns.publish({
        Message: JSON.stringify(pub_event),
        TopicArn: event.topic
    }, function(err, data) {
        if (err) {
            callback(err, null);
        } else {
            callback(null, { "location": "/result/" + pub_event.res_key });
        }
    });
};

function deepcopy(obj) {
    return JSON.parse(JSON.stringify(obj));
}

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
