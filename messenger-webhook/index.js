'use strict';
let express = require('express'),
    bodyParser = require('body-parser'),
    app = express();
 
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
 
app.listen(process.env.PORT || 1337, () => console.log('Example app listening on port 8989!'));
 
//app.get('/', (req, res) => res.send('583615801'));

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
 
    let body = req.body;
 
    if (body.object === 'page') {
 
        // Iterates over each entry - there may be multiple if batched
        body.entry.forEach(function(entry) {
 
            // Gets the message. entry.messaging is an array, but
            // will only ever contain one message, so we get index 0
            let webhook_event = entry.messaging[0];
            console.log(webhook_event);
 
            // Get the sender PSID
            let sender_psid = webhook_event.sender.id;
            console.log('Sender PSID: ' + sender_psid);
 
            // Check if the event is a message or postback and
            // pass the event to the appropriate handler function
            if (webhook_event.message) {
                console.log(webhook_event.message)
                handleMessage(sender_psid, webhook_event.message)
            } else if (webhook_event.postback) {
                console.log(webhook_event.postback)
                handlePostback(sender_psid, webhook_event.postback)
            }
        });
 
        // Returns a '200 OK' response to all requests
        res.status(200).send('EVENT_RECEIVED');
    } else {
        // Returns a '404 Not Found' if event is not from a page subscription
        res.sendStatus(404);
    }
 
});

// Handles messages events
const handleMessage = (sender_psid, received_message) => {
    let response;
 
    if (received_message.text) {
      res.send('Hello World!')
    }
}
 
// 

const handlePostback = (sender_psid, received_postback) => {
    let response;
 
    // Get the payload for the postback
    let payload = received_postback.payload;
 
    // Set the response based on the postback payload
    if (payload === 'CAT_PICS') {
        response = imageTemplate('cats', sender_psid);
        callSendAPI(sender_psid, response, function(){
            callSendAPI(sender_psid, askTemplate('Show me more'));
        });
    } else if (payload === 'DOG_PICS') {
        response = imageTemplate('dogs', sender_psid);
        callSendAPI(sender_psid, response, function(){
            callSendAPI(sender_psid, askTemplate('Show me more'));
        });
    } else if(payload){
        response = askTemplate('Are you a Cat or Dog Person?');
        callSendAPI(sender_psid, response);
        console.log('inside payload and printing response because of callSendAPI')
    }
    // Send the message to acknowledge the postback
}



