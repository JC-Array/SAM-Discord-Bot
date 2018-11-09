var Discord = require('discord.io');
var fs = require('fs');
const ytdl = require('ytdl-core');
var readline = require('readline');
var google = require('googleapis').google;
//var OAuth2 = google.auth.OAuth2;

var users;
var channelWhiteList = ['507390751001542667', '507390809922994177', '507390777446498304', '507390932233224202', '507391013984403466', '507391055361212417', '507387673204490240'];
var channelBlackList = ['507390016234979328'];

// handle the different authentication techniques
let jsonToken = "";
try {
    jsonToken = require('./auth.json').token;
} catch (err) {
    jsonToken = "";
}

let token = process.env.DISCORD_AUTH_TOKEN || jsonToken;
let youtubeToken = process.env.YOUTUBE_AUTH_TOKEN;

if (!token) {
    console.log('error with token, does not exist.  Please set up DISCORD_AUTH_TOKEN or auth.json file');
} else {
    //console.log(`found token: ${token}`);
}


// Initialize Discord Bot
var bot = new Discord.Client({
    token: token,
    autorun: true
});

bot.on('ready', function (evt) {
    console.log('Connected');
    console.log('Logged in as: ');
    console.log(bot.username + ' - (' + bot.id + ')');
    //console.log('Server info:');
    //JSON.stringify(bot.servers, null, 4).split('\n').forEach (function(element) {
    //    console.log(element);
    //});
    //console.log('Server info finished');
    users = JSON.parse(JSON.stringify(bot.servers["335603306879778819"].members));
});

bot.on('disconnect', function (errMsg, code) { });

bot.on('message', function (user, userID, channelID, message, evt) {
    // Our bot needs to know if it will execute a command
    // It will listen for messages that will start with `!`

    console.log('message: ' + message + ' user: ' + user);
    if (message.substring(0, 1) == '!') {
        var args = message.substring(1).split(' ');
        var cmd = args[0].toLowerCase();

        //user's voice channel
        var voiceChannelID = users[userID].voice_channel_id;
        console.log('user in channel: ' + voiceChannelID);

        args = args.splice(1);

        switch (cmd) {
            // !ping
            case 'ping':
                ping(user, channelID);
                break;
            case 'all':
                bot.sendMessage({
                    to: channelID,
                    message: 'sending all members'
                });
                var names = bot.getAllUsers();
                bot.sendMessage({
                    to: channelID,
                    message: names
                });
                break;
            case 'sound':
                //if user is not in voice channel
                if (voiceChannelID == null) {
                    break;
                }

                //play sound
                bot.joinVoiceChannel(voiceChannelID, function (error, events) {
                    if (error) return console.log('error: ' + error);
                    bot.getAudioContext(voiceChannelID, function (error, stream) {
                        if (error) return console.log('error: ' + error);
                        fs.createReadStream('soundClips/Daft Punk - Something About Us.mp3').pipe(stream, { end: false });
                        stream.on('done', function () {
                            bot.leaveVoiceChannel(voiceChannelID, function () { });
                        });
                    });
                });
                break;
            case 'gtfo':
                bot.leaveVoiceChannel(voiceChannelID, function () { });
                break;
            case 'townhall':
                townhall(voiceChannelID);
                break;
            case 'help':    //add actual help later
                bot.sendMessage({
                    to: channelID,
                    message: 'http://bfy.tw/6iBM'
                });
                break;
            case 'play':
                play(voiceChannelID, args);
                break;
            case 'search':
                searchYoutube(youtubeToken, args);
                break;

        }
    }
});

// Detect changes in voice channels, if one leaves, kick off message
bot.on('voiceStateUpdate', function (event) {
    console.log('Channel Update... user_id: ' + event.d.user_id + ' channel_id: ' + event.d.channel_id);
    //dont proc if it is the bot
    if (event.d.user_id == 505565942072475668) return;

    //update and grab previous channel
    var preVoiceChannelID = users[event.d.user_id].voice_channel_id;
    users = JSON.parse(JSON.stringify(bot.servers["335603306879778819"].members));

    var flag = false;
    console.log('preVCI: ' + preVoiceChannelID);

    if (event.d.channel_id == null) {    //user left the channel
        console.log('MHG: ' + preVoiceChannelID);
        for (var i = 0; i < channelBlackList.length; i++) {
            if (preVoiceChannelID == channelBlackList[i]) {
                flag = true;
                break;
            }
        }
        if (!flag) {
            MHG(preVoiceChannelID);
        }
    }
 
    //birthday function
    if (event.d.user_id == "175539927956717568" && preVoiceChannelID == null) { 
        //birthday(event.d.channel_id);
    }

});

// LOG ALL EVENTS
bot.on('any', function (event) {
    //un comment for the logger
    //logger.debug(`[ANY EVENT FIRED] ${JSON.stringify(event)}`);
});

//Ping function
let ping = function ping(user1, channelID1) {
    bot.sendMessage({
        to: channelID1,
        message: '@'+user1+' don\'t ping me you bitch. Only I can ping you.'
    });
    bot.sendMessage({
        to: channelID1,
        message: 'ping'
    });
};

//Man I hate that guy function
let MHG = function MHG(voiceChannelID) {

    bot.joinVoiceChannel(voiceChannelID, function (error, events) {
        if (error) return console.log('error: ' + error);
        bot.getAudioContext(voiceChannelID, function (error, stream) {
            if (error) return console.log('error: ' + error);
            //choose a random file
            var fileNum = Math.floor((Math.random() * 5) + 1);
            switch (fileNum) {
                case 1: fs.createReadStream('soundClips/MHG1.mp3').pipe(stream, { end: false });
                    break;
                case 2: fs.createReadStream('soundClips/MHG2.mp3').pipe(stream, { end: false });
                    break;
                case 3: fs.createReadStream('soundClips/MHG3.mp3').pipe(stream, { end: false });
                    break;
                case 4: fs.createReadStream('soundClips/MHG4.mp3').pipe(stream, { end: false });
                    break;
                case 5: fs.createReadStream('soundClips/MHG5.mp3').pipe(stream, { end: false });
                    break;
            }
            stream.on('done', function () {
                bot.leaveVoiceChannel(voiceChannelID, function () { });
            });
        });
    });
};

//Townhall
let townhall = function townhall(voiceChannelID) {
    //move the users
    Object.keys(users).forEach((key) => {
        console.log('user: ' + key);
        if (users[key].voice_channel_id != null) {
            console.log('accepted');
            channelBlackList.forEach((channel) => {
                if (channel == users[key].voice_channel_id) return;
                bot.moveUserTo({ 'serverID': '335603306879778819', 'userID': key, 'channelID': voiceChannelID }, function (error, stream) {
                    if (error) return console.log('error: ' + error);
                });
            });
        }
    });
    //join and play intro
    bot.joinVoiceChannel(voiceChannelID, function (error, events) {
        if (error) return console.log('error: ' + error);
        bot.getAudioContext(voiceChannelID, function (error, stream) {
            if (error) return console.log('error: ' + error);
            fs.createReadStream('soundClips/TownhallCall.mp3').pipe(stream, { end: false });
            stream.on('done', function () {
                bot.leaveVoiceChannel(voiceChannelID, function () { });
            });
        });
    });
};

let birthday = function birthday(voiceChannelID) {
    bot.joinVoiceChannel(voiceChannelID, function (error, events) {
        if (error) return console.log('error: ' + error);
        bot.getAudioContext(voiceChannelID, function (error, stream) {
            if (error) return console.log('error: ' + error);
            fs.createReadStream('soundClips/BDay.mp3').pipe(stream, { end: false });  
            stream.on('done', function () {
                bot.leaveVoiceChannel(voiceChannelID, function () { });
            });
        });
    });
};

let play = function play(voiceChannelID, args) {
    console.log('Time to play music: ' + args[0]);
    bot.joinVoiceChannel(voiceChannelID, function (error, events) {
        if (error) return console.log('error: ' + error);
        bot.getAudioContext(voiceChannelID, function (error, stream) {
            if (error) return console.log('error: ' + error);
            ytdl(String(args[0]), { quality: 'highestaudio' }).pipe(stream, { end: false });
            stream.on('done', function () {
                bot.leaveVoiceChannel(voiceChannelID, function () { });
            });
        });
    });
};

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
    var clientSecret = credentials.installed.client_secret;
    var clientId = credentials.installed.client_id;
    var redirectUrl = credentials.installed.redirect_uris[0];
    var oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, function (err, token) {
        if (err) {
            getNewToken(oauth2Client, callback);
        } else {
            oauth2Client.credentials = JSON.parse(token);
            callback(oauth2Client);
        }
    });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
    var authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES
    });
    console.log('Authorize this app by visiting this url: ', authUrl);
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question('Enter the code from that page here: ', function (code) {
        rl.close();
        oauth2Client.getToken(code, function (err, token) {
            if (err) {
                console.log('Error while trying to retrieve access token', err);
                return;
            }
            oauth2Client.credentials = token;
            storeToken(token);
            callback(oauth2Client);
        });
    });
}

/**
 * Lists the names and IDs of up to 10 files.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function searchYoutube(auth, args) {
    var service = google.youtube('v3');
    console.log('Youtube API request');
    service.search.list({
        auth: auth,
        part: 'snippet',
        q: args.join(' '),
        type: 'video',
        maxResults: '10'
    }, function (err, response) {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        }
        console.log('Response: ' + response.status + ' ' + response.statusText);
        var data = response.data.items;
        if (data.length == 0) {
            console.log('No response found.');
        } else {
            console.log('Printing search: ');
            data.forEach((video) => {
                console.log(video);
            });
        }
    });
}
