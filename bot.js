var Discord = require('discord.io');
var fs = require('fs');
const ytdl = require('ytdl-core');
var readline = require('readline');
var google = require('googleapis').google;
//var OAuth2 = google.auth.OAuth2;

var users;
var channelWhiteList = ['507390751001542667', '507390809922994177', '507390777446498304', '507390932233224202', '507391013984403466', '507391055361212417', '507387673204490240'];
var channelBlackList = ['507390016234979328'];

var waitingForSearchReply;
var playingMusic = false;

var musicQueue = [];

var searchReturn;

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
    if (userID == 505565942072475668) return;
    // Our bot needs to know if it will execute a command
    // It will listen for messages that will start with `!`

    console.log('message: ' + message + ' user: ' + user);
    var voiceChannelID = users[userID].voice_channel_id;
    if (waitingForSearchReply == userID) {
        console.log('search reply ' + message);
        try {
            var video = 'https://youtu.be/' + searchReturn[parseInt(message) - 1].id.videoId;
            play(voiceChannelID, video);
        } catch (err) {
            console.log(err);
        }

        waitingForSearchReply = null;
        return;
    }

    if (message.substring(0, 1) == '!') {
        var args = message.substring(1).split(' ');
        var cmd = args[0].toLowerCase();

        //user's voice channel
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
                play(voiceChannelID, args[0]);
                break;
            case 'search':
                searchYoutube(youtubeToken, args);
                waitingForSearchReply = userID;
                break;
            case 'queue':
                var queueString = "";
                if (musicQueue.length() == 0) {
                    queueString = "There is no queue";
                } else {
                    musicQueue.forEach((element) => {
                        queueString = queueString + queueString
                    });
                }
                break;
            case 'test':
                console.log(ytdl.getBasicInfo('https://youtu.be/E-cvKiFf0n0'));
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

    if (playingMusic) {
        return;
    }

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
    if (playingMusic) {
        return;
    }
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

let play = function play(voiceChannelID, video) {    
    if (playingMusic) {
        //add to queue
        console.log('Add to music queue: ' + video);
        musicQueue.push(video);
    } else {
        //add to queue and play
        console.log('Time to play music: ' + video);
        musicQueue.push(video);
        bot.joinVoiceChannel(voiceChannelID, function (error, events) {
            if (error) return console.log('error: ' + error);
            bot.getAudioContext(voiceChannelID, function (error, stream) {
                if (error) return console.log('error: ' + error);
                playingMusic = true;
                console.log('play music true');
                console.log(musicQueue[0]);
                ytdl(String(musicQueue[0]), { quality: 'highestaudio' }).pipe(stream, { end: false });

                stream.on('error', function (err) {
                    console.log(JSON.stringify(err));
                });
                stream.on('done', function () {
                    musicQueue.shift();
                    console.log('next song' + musicQueue[0]);
                    ytdl(String(musicQueue[0]), { quality: 'highestaudio' }).pipe(stream, { end: false });
                    if (musicQueue.length == 0) {
                        bot.leaveVoiceChannel(voiceChannelID, function () { });
                        playingMusic = false;
                    }
                });
                console.log('play music false');
            });
        });
    }
};

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
            var searchString = "";
            console.log('Printing search: ');
            for (i = 0; i < data.length; i++) {
                searchString = searchString +  (i+1) + "\t";
                searchString = searchString + "Channel: " + data[i].snippet.channelTitle + "\t";
                searchString = searchString + "Title: " + data[i].snippet.title + "\n";
            }
            bot.sendMessage({
                to: '507703901663920141',
                message: searchString
            });
            searchReturn = JSON.parse(JSON.stringify(data));
            //console.log(searchReturn);
        }
    });
}
