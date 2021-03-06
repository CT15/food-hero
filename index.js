'use strict';
let express = require('express'),
  bodyParser = require('body-parser'),
  app = express();

const https = require('https');
const fetch = require('node-fetch');
const imgur = require('imgur');

var admin = require("firebase-admin");

var serviceAccount = require("./fbreducewastage-firebase-adminsdk-j5xi5-9fb749300a.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://fbreducewastage.firebaseio.com"
});

var FieldValue = require('firebase-admin').firestore.FieldValue;

var db = admin.firestore();

let messageCount = 0;

const request = require('request');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.listen(process.env.PORT || 1337, () => console.log('Example app listening on port 1337!'));

// Adds support for GET requests to our webhook
app.get('/webhook', (req, res) => {

  // Your verify token. Should be a random string.
  let VERIFY_TOKEN = "1234567890";

  // Parse the query params
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];

  // Checks if a token and mode is in the query string of the request
  if (mode && token) {

    // Checks the mode and token sent is correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {

      // Responds with the challenge token from the request
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);

    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  }
});

app.post('/webhook', (req, res) => {  

  // Parse the request body from the POST
  let body = req.body;

  // Check the webhook event is from a Page subscription
  if (body.object === 'page') {

    // Iterate over each entry - there may be multiple if batched
    body.entry.forEach(function(entry) {

      // Gets the body of the webhook event
      let webhook_event = entry.messaging[0];
      console.log(webhook_event);
    
    
      // Get the sender PSID
      let sender_psid = webhook_event.sender.id;
      console.log('Sender PSID: ' + sender_psid);
    
      // Check if the event is a message or postback and
      // pass the event to the appropriate handler function
      if (webhook_event.message) {
        handleMessage(sender_psid, webhook_event.message);        
      } else if (webhook_event.postback) {
        handlePostback(sender_psid, webhook_event.postback);
      }
      
    });

    // Return a '200 OK' response to all events
    res.status(200).send('EVENT_RECEIVED');

  } else {
    // Return a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }

});

let docId = '';
let attachment_url = '';

function handleMessage(sender_psid, received_message) {
  let response;
  
  // Checks if the message contains text
  if (received_message.text) {    
    // Create the payload for a basic text message, which
    // will be added to the body of our request to the Send API

    let text = '';
    var message = '';
    switch(messageCount) {
      case 0:
        db.collection('Shares').add({
          isAvailable: true,
          submissionTime: FieldValue.serverTimestamp()
        }).then(ref => {
          docId = ref.id;
        });

        // location
        text = "Please share your location with me so that we can come and pick up your food!"
          response = {"message":{
            "text": "Here is a quick reply example!",
            "quick_replies":[
              {
                "content_type":"location"
              }
            ]
          }
        }
        response = {
          "text": text
        }
        break;
      case 1:
        // location
        db.collection('Shares').doc(docId).update({
          location: received_message.text
        });
        // expiry
        text = 'Please indicate the number of hours (or part thereof) left till the expiry of food.'
        response = {
          "text": text
        }
        break;
      case 2:
        // expiry
        db.collection('Shares').doc(docId).update({
          bestBefore: received_message.text
        });
        // dietary restriction
        text = 'If the food is suitable for people with any special dietary restrictions, please indicate so (e.g. halal, vegetarian). Otherwise, please reply "None". '
        response = {
          "text": text
        }

        break;
      case 3:
        // dietary restriction
        db.collection('Shares').doc(docId).update({
          dietRestrictions: received_message.text.split(" ")
        });
        // describe food
        text = 'Please provide a short description of the food.'
        response = {
          "text": text
        }
        break;
      case 4:
        // describe food
        db.collection('Shares').doc(docId).update({
          title: received_message.text
        });
        // collection time
        text = 'Please indicate how long more (in hour) you want us to come and pick up the food.'
        response = {
          "text": text
        }
        break;
      case 5:
        // collection time
        db.collection('Shares').doc(docId).update({
          collectionTime: received_message.text
        });

        // photo
        text = 'Please take a photo of the food so that we can estimate how many it will feed.'
        response = {
          "text": text
        }
        break;
    }


    messageCount++;

  } else if (received_message.attachments) {
    // Get the URL of the message attachment
    if (received_message.attachments[0].payload != null) {
      attachment_url = received_message.attachments[0].payload.url;
    } else {
      attachment_url = "";
    }
    response = {
      "attachment": {
        "type": "template",
        "payload": {
          "template_type": "generic",
          "elements": [{
            "title": "Is this the right picture?",
            "subtitle": "Tap a button to answer.",
            "image_url": attachment_url,
            "buttons": [
              {
                "type": "postback",
                "title": "Yes!",
                "payload": "yes",
              },
              {
                "type": "postback",
                "title": "No!",
                "payload": "no",
              }
            ],
          }]
        }
      }
    }
  } 
  console.log("handle message");
  // Send the response message
  callSendAPI(sender_psid, response);    
}

// 

function handlePostback(sender_psid, received_postback) {
  let response;
  
  // Get the payload for the postback
  let payload = received_postback.payload;

  // Set the response based on the postback payload
  if (payload === 'yes') {
    imgur.uploadUrl(attachment_url).then((json) => {
      db.collection('Shares').doc(docId).update({
        image: json.data.link
      });
      let url = 'https://foodhero.pythonanywhere.com/foodhero/default/numBoxes?url=' + json.data.link + '&width=2.5';
      let numBoxes = 0
      fetch(url).then((res) => {
        return res.json();
      }).then((data) => {
        console.log('collecting data: ', data);
        numBoxes = data.numBoxes
        db.collection('Shares').doc(docId).update({
          numUnits: numBoxes
        })

        if (data.numBoxes > 0) {
          response = { "text": "That is all. Thank you! From the image, we estimate that " + numBoxes + " box(es) are needed to contain the items. Volunteers will collect the food at around the indicated timing." }
        } else {
          response = { "text": "That is all. Thank you! Volunteers will collect the food at around the indicated timing." }
        }
        // Send the message to acknowledge the postback
        callSendAPI(sender_psid, response);
      })
    })
    .catch(err => {
      console.log("error for http", err)
    })
    // https.get(url, function(res){
    //   var body = '';
  
    //   res.on('data', function(chunk){
    //       body += chunk;
    //   });
  
    //   res.on('end', function(){
    //       var json = JSON.parse(body);
    //       console.log("json obj", json)
    //       console.log("Got a response: ", json.numBoxes);
    //   });
    // }).on('error', function(e){
    //     console.log("Got an error: ", e);
    // });
    messageCount = 0;
  } else if (payload === 'no') {
    response = { "text": "Oops, try sending another image." }
    // Send the message to acknowledge the postback
    callSendAPI(sender_psid, response);
  }
}

const callSendAPI = (sender_psid, response, cb = null) => {
  let request_body = {
    recipient: {
      id: sender_psid,
    },
    message: response,
  };

  request({
    "uri": "https://graph.facebook.com/v2.6/me/messages",
    "qs": { "access_token": "EAAQZAHMkoHGIBAPWCt3PggojczuYUTljaxfK5lfGJJSzOQOHwBcuv67pCvUcNUi0P8NiZBEXpPUK6M2UjTZAVKbvqLYzt3Gt83ELZCi3eF5EWtMplDoa86aU8Cn1yHQXZAFxJqpeZAx29Vsb4eayfPRjz53xZBstlVLCTYnFOYgmZCbUFRZAoavcK" },
    "method": "POST",
    "json": request_body
  }, (err, res, body) => {
    if (!err) {
      if (cb) {
        cb();
      }
      console.log("message sent");
    } else {
      console.error("Unable to send message:" + err);
    }
  });
}

const askTemplate = (text) => {
  return {
    "attachment": {
      "type": "template",
      "payload": {
        "template_type": "button",
        "text": text,
        "buttons": [
          {
            "type": "postback",
            "title": "Cats",
            "payload": "CAT_PICS"
          },
          {
            "type": "postback",
            "title": "Dogs",
            "payload": "DOG_PICS"
          }
        ]
      }
    }
  }
}




