/**
 * Lib
 */

var querystring = require("querystring");
var http = require("http");
var https = require("https");

var Mattermost = require('node-mattermost');
var hook_url = "MATTERMOST_HOOK_URL"
var NEXMO_KEY = "NEXMO KEY";
var NEXMO_SECRET = "NEXMO SECRET";
var NEXMO_PHONE_NUMBER = "10000000000"
var MATTERMOST_TOKEN = "";

var mattermost = new Mattermost(hook_url);


var get = function(options, onResult) {
  var prot = options.port == 443 ? https : http;
  var req = prot.request(options, function(res) {
    var output = '';
    console.log(options.host + ':' + res.statusCode);
    res.setEncoding('utf8');

    res.on('data', function(chunk) {
      output += chunk;
    });

    res.on('end', function() {
      var obj = JSON.parse(output);
      onResult(res.statusCode, obj);
    });
  });

  req.on('error', function(err) {
    //res.send('error: ' + err.message);
  });

  req.end();
};

var makeRequest = function(phone, text, cb) {
 
  var params = {
    api_key = NEXMO_KEY,
    api_secret: NEXMO_SECRET,
    to: phone,
    from: NEXMO_PHONE_NUMBER,
    text: text
  };

  var options = {
    host: 'rest.nexmo.com',
    port: 443,
    path: '/sms/json?' + querystring.stringify(params),
    method: 'GET',
  };
  get(options, function(status, data) {
    console.log(data);
    cb(null, data);
  })
};


var textMessageToMattermost = function(message, cb) {

  mattermost.send({
    text: message,
    channel: 'texting',
    username: 'TexterBot'
  }, cb);
};


module.exports.sendText = function(event, cb) {

  var token = event.token;
  if (token != MATTERMOST_TOKEN) {
    return cb("Wrong Token");
  }
  console.log(JSON.stringify(event));
  var text = event.text;
  var user = event.user_name;
  var msg = text.split(" ");

  if (msg.length < 3) {
    return textMessageToMattermost("Error, invalid text message, usage: text <10 digit number> <text...>, cmd: " + text, function() {
      cb(null, "Error");
    });
  }
  var number = msg[1];
  if (!number.match(/[0-9]{10}/)) {
    textMessageToMattermost("Error, invalid text message, usage: text <10 digit number> <text...>, cmd: " + text, function() {
      return cb(null, "ERROR");
    });
  }
  msg.splice(0, 2);

  text = msg.join(" ");
  console.log("Texting: '" + number + "' with text: '" + text + "' From " + user);

  makeRequest(number, text, function(data) {

    cb(null, data);
  });

};

module.exports.receiveText = function(event, cb) {
  if (!event.queryParams.msisdn || !event.queryParams.text) {
    console.log("not an incoming msg");
    return cb(null, "OK");
  }

  var msg = "<" + event.queryParams.msisdn + "> " + event.queryParams.text;

  textMessageToMattermost(msg, function() {
    return cb(null, msg);
  });
}

