const API_AI_TOKEN = 'c258e554566a493cb6742a83c65e1c0b';
const apiAiClient = require('apiai')(API_AI_TOKEN);
const FACEBOOK_ACCESS_TOKEN = 'EAAQZAHMkoHGIBAGpNHIHWzhZAvrjMHb6PQLhZCX2l94glNgFxi4RVPDfN3e6LF2KAEqDOZBHZCteQVskp7wP2g7Qv1DjkbGHZB4u0TMHJZC6QqR9ZCD2cvFhZAOhwZC3atwwT6JGs2TTp2vGFtm1tAvVLclZCWYE9MQBnlyMJSXfqpZBmKUkPstFn1p2';
const request = require('request');
const sendTextMessage = (senderId, text) => {
 request({
 url: 'https://graph.facebook.com/v2.6/me/messages',
 qs: { access_token: FACEBOOK_ACCESS_TOKEN },
 method: 'POST',
 json: {
 recipient: { id: senderId },
 message: { text },
 }
 });
};
module.exports = (event) => {
 const senderId = event.sender.id;
 const message = event.message.text;
const apiaiSession = apiAiClient.textRequest(message, {sessionId: 'crowdbotics_bot'});
apiaiSession.on('response', (response) => {
 const result = response.result.fulfillment.speech;
sendTextMessage(senderId, result);
 });
apiaiSession.on('error', error => console.log(error));
 apiaiSession.end();
};