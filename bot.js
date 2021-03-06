var Discord = require('discord.io');
var fs = require('fs');
const ytdl = require('ytdl-core');
var readline = require('readline');
var google = require('googleapis').google;
//var OAuth2 = google.auth.OAuth2;

var users;
var channelWhiteList = ['507390751001542667', '507390809922994177', '507390777446498304', '507390932233224202', '507391013984403466', '507391055361212417', '507387673204490240'];
var channelBlackList = ['507390016234979328'];
var tau = '301151072087441408';

var waitingForSearchReply;
var playingMusic = false;

var musicQueueSource = [];
var musicQueueTime = [];

var searchReturn;   //searchs
var searchReturn2;  //time

var afkChime;
var chimedUser;

var readStream;

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
    bot.sendMessage({
        to: '507703901663920141',
        message: ':robot: I am back :robot:'
    });

    afkChime = 1;
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
            var args = message.substring(1).split(' ');
            var video = 'https://youtu.be/' + searchReturn[parseInt(message) - 1].id.videoId;
            args[0] = video;
            args[1] = searchReturn2[parseInt(message) - 1].contentDetails.duration;
            queue(voiceChannelID, cmd, args);
            bot.sendMessage({
                to: '507703901663920141',
                message: 'added to queue ' + video
            });
        } catch (err) {
            console.log('not valid search response');
            bot.sendMessage({
                to: '507703901663920141',
                message: 'not valid search response'
            });
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
            case 'getpunked':
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
            case 'clear':
                musicQueueSource = [];
                musicQueueTime = [];
                playingMusic = false;
                break;
            case 'gtfo':    //fix
                musicQueueSource = [];
                playingMusic = false;
                bot.leaveVoiceChannel(voiceChannelID, function () { });
                break;
            case 'townhall':
                townhall(voiceChannelID);
                break;
            case 'help':    //add actual help later
                var helpMessage = "";
                helpMessage += '**COMMANDS**\n';
                helpMessage += '** ping:** PONG!\n';
                helpMessage += '** play:** Play a song with a youtube link\n';
                helpMessage += '** search:** Search for a song\n';
                helpMessage += '** queue:** Prints the song queue\n';
                helpMessage += '** skip:** Skip song ** not working **\n';
                helpMessage += '** clear:** Clear the music queue\n';
                helpMessage += '** gtfo:** Attempts to make the bot leave\n';
                helpMessage += '** townhall:** Welcome the King\n';
                helpMessage += '** getpunked:** Daft Punked\n';
                helpMessage += '** all:** For one\n';
                helpMessage += '** reset:** For when the bot breaks (WIP)\n'
                helpMessage += 'for fruther documentation: http://bfy.tw/6iBM';
                bot.sendMessage({
                    to: channelID,
                    message: helpMessage
                });
                break;
            case 'skip':
                play(voiceChannelID, 'skip', args);
                break;
            case 'play':
                queue(voiceChannelID, cmd, args);
                break;
            case 'search':
                bot.sendMessage({
                    to: channelID,
                    message: "Currently Disabled, API Key disabled by Google due to inactivity"
                });
                break;
                searchYoutube(youtubeToken, args);
                waitingForSearchReply = userID;
                break;
            case 'queue':
                var queueString = "";
                if (musicQueueSource.length == 0) {
                    queueString = "There is no queue";
                } else {
                    queueString = '**Currently playing: ' + queueString[0] + '**\n';
                    for (var i = 1; i < musicQueueSource.length; i++) {
                        queueString = queueString + musicQueueSource[i] + ' **[' + convert_time(musicQueueTime[i]) + ']**\n'
                    }
                }
                bot.sendMessage({
                    to: channelID,
                    message: queueString
                });
                break;
            case 'read':
                play(voiceChannelID, 'read', args);
                break;
            case 'billiam':
                voiceChannelID = users[tau].voice_channel_id
                if (voiceChannelID == null) {
                    voiceChannelID = users[userID].voice_channel_id;
                }
                play(voiceChannelID, 'billiam', args);
                break;
            case 'reset':
                afkChime = 1;
                break;
        }
    }
});

// Detect changes in voice channels, if one leaves, kick off message
bot.on('voiceStateUpdate', function (event) {
    console.log('Channel Update... user_id: ' + event.d.user_id + ' channel_id: ' + event.d.channel_id);

    //update and grab previous channel
    var preVoiceChannelID = users[event.d.user_id].voice_channel_id;
    users = JSON.parse(JSON.stringify(bot.servers["335603306879778819"].members));

    //dont proc if it is the bot
    if (event.d.user_id == 505565942072475668) {
        if (afkChime == 4) {
            bot.moveUserTo({ 'serverID': '335603306879778819', 'userID': chimedUser, 'channelID': '507390016234979328' }, function (error, stream) {
                if (error) return console.log('error: ' + error);
            });
            afkChime = 5;
        }
        return;
    } 
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
            play(preVoiceChannelID, 'userleft', []);
        }
    }


    //AFK Movement
    if (!playingMusic && event.d.channel_id == '507390016234979328' && afkChime == 1) {    //user joined AFK
        afkChime = 2;
        console.log('AFK Chime');
        //get pre bot channel

        //move user
        chimedUser = event.d.user_id;
        bot.moveUserTo({ 'serverID': '335603306879778819', 'userID': event.d.user_id, 'channelID': '567035853793394718' }, function (error, stream) {
            if (error) return console.log('error: ' + error);
        });

        //play chime
        if (!flag) {
            play('567035853793394718', 'afkchime', []);
        }
    } else if (afkChime == 5 && chimedUser == event.d.user_id) {
        afkChime = 1; 
        chimedUser = null;
    }

    //play christmas tone
    if (preVoiceChannelID == null) {    //if user joins channel
        //play(event.d.channel_id, 'christmas', []);
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

//Townhall
let townhall = function townhall(voiceChannelID) {
    //move the users
    Object.keys(users).forEach((key) => {
        if (users[key].voice_channel_id != null) {
            channelBlackList.forEach((channel) => {
                if (channel == users[key].voice_channel_id) return;
                bot.moveUserTo({ 'serverID': '335603306879778819', 'userID': key, 'channelID': voiceChannelID }, function (error, stream) {
                    if (error) return console.log('error: ' + error);
                });
            });
        }
    });

    //join and play intro
    play(voiceChannelID, 'townhall', []);
};


let play = function play(voiceChannelID, cmd, args) {

    if (voiceChannelID == null) {
        console.log("no voice channel id");
        return;
    }

    //check to see if bot is in a voice channel
    console.log('Play was called');
    if (users["505565942072475668"].voice_channel_id == null) {
        //join voice channel
        console.log("trying to join voice channel");
        bot.joinVoiceChannel(voiceChannelID, function (error, events) {
            if (error) return console.log('error: ' + error);
            play(voiceChannelID, cmd, args);
        });
        return;
    } else {
        console.log("joined voice channel or in a voice channel");
    }
    
    //get audio context
    bot.getAudioContext(voiceChannelID, function (error, stream) {
        if (error) return console.log('error: ' + error);
        //switch statement for commands related to audio currently playing
        switch(cmd){
            case 'skip':
                break;
                //trash skip function, but can't find other way to fix, doesn't work ether
                bot.leaveVoiceChannel(voiceChannelID, function () { });
                musicQueueSource.shift();
                musicQueueTime.shift();
                bot.joinVoiceChannel(voiceChannelID, function (error, events) {  });
                console.log("Skipped song");
                break;
            case 'birthday':
                //check to see if this will override current song playing
                readStream = fs.createReadStream('soundClips/BDay.mp3');
                readStream.pipe(stream, { end: false });
                console.log("Birthday tone");
                playingMusic = true;
                break;
            case 'christmas':
                //same as above
                readStream = fs.createReadStream('soundClips/MerryChristmas.mp3');
                readStream.pipe(stream, { end: false });
                console.log("Townhall tone");
                playingMusic = true;
                break;
            case 'townhall':
                //same as above
                readStream = fs.createReadStream('soundClips/TownhallCall.mp3');
                readStream.pipe(stream, { end: false });
                console.log("Townhall tone");
                playingMusic = true;
                break;
            case 'userleft':
                if(playingMusic) {
                    return;
                }
                //choose a random file
                var fileNum = Math.floor((Math.random() * 5) + 1);
                switch (fileNum) {
                    case 1: readStream = fs.createReadStream('soundClips/MHG1.mp3');
                        readStream.pipe(stream, { end: false });
                        break;
                    case 2: readStream = fs.createReadStream('soundClips/MHG2.mp3');
                        readStream.pipe(stream, { end: false });
                        break;
                    case 3: readStream = fs.createReadStream('soundClips/MHG3.mp3');
                        readStream.pipe(stream, { end: false });
                        break;
                    case 4: readStream = fs.createReadStream('soundClips/MHG4.mp3');
                        readStream.pipe(stream, { end: false });
                        break;
                    case 5: readStream = fs.createReadStream('soundClips/MHG5.mp3');
                        readStream.pipe(stream, { end: false });
                        break;
                }
                console.log("User left tone");
                playingMusic = true;
                break;
            case 'start':
                readStream = ytdl(String(musicQueueSource[0]), { quality: 'highestaudio' });
                readStream.pipe(stream, { end: false });
                console.log("Start songs");
                console.log(stream);
                playingMusic = true;
                break;
            case 'read':
                console.log(readStream);
                break;
            case 'billiam':
                //check to see if this will override current song playing
                readStream = fs.createReadStream('soundClips/HoM.mp3');
                readStream.pipe(stream, { end: false });
                console.log("billiam tone");
                playingMusic = true;
                break;
            case 'afkchime':
                afkChime = 3;
                //check to see if this will override current song playing
                readStream = fs.createReadStream('soundClips/AfkChime.mp3');
                readStream.pipe(stream, { end: false });
                console.log("afk Chime tone");
                playingMusic = true;
                break;
        }

        //when audio is finished playing
        stream.on('done', function () {
            if (afkChime == 3) afkChime = 4;
            //check to see if there is nothing in queue (for if there was an mp3 file playing)
            if (musicQueueSource.length == 0) {
                bot.leaveVoiceChannel(voiceChannelID, function () { });
                playingMusic = false;
                console.log("Stopped mp3");
                return;
            }

            //remove song that was playing
            musicQueueSource.shift();
            musicQueueTime.shift();
            //check to see if queue is empty
            if (musicQueueSource.length == 0) {
                bot.leaveVoiceChannel(voiceChannelID, function () { });
                playingMusic = false;
                console.log("Stopped music");
                return;
            } else {
                //play next song
                console.log('next song ' + musicQueueSource[0]);
                readStream = ytdl(String(musicQueueSource[0]), { quality: 'highestaudio' });
                readStream.pipe(stream, { end: false });
            }
        });
        //when error
        stream.on('error', function (err) {
            console.log(JSON.stringify(err));
        });
    });
}

let queue = function queue(voiceChannelID, cmd, args) {
    //if there is no queue
    if (musicQueueSource.length == 0) {
        console.log('start music queue: ' + args[0]);
        musicQueueSource.push(args[0]);
        musicQueueTime.push(args[1]);
        play(voiceChannelID, 'start', []);
        return;
    }

    //add to queue
    console.log('Add to music queue: ' + args[0]);
    musicQueueSource.push(args[0]);
    musicQueueTime.push(args[1]);

    //removed feature
    //if (args.length > 2) {
    //    //add to top otherwise put at the end
    //    if (args[2].toLowerCase == 'top') {
    //        console.log('Add to top of music queue: ' + args[0]);
    //        musicQueueSource.unshift(args[0]);
    //        musicQueueTime.unshift(args[1]);
    //    } else {
    //        console.log('Add to music queue: ' + args[0]);
    //        musicQueueSource.push(args[0]);
    //        musicQueueTime.push(args[1]);
    //    }
    //} else {
    //    console.log('Add to music queue: ' + args[0]);
    //    musicQueueSource.push(args[0]);
    //    musicQueueTime.push(args[1]);
    //}
    
}

//search youtube for a song
function searchYoutube(auth, args) {
    var searchIds = '-1';
    var service = google.youtube('v3');

    //call 1
    console.log('Youtube API request for searching');
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
        var data1 = response.data.items;
        //console.log(data1);

        //prep for call 2
        if (data1.length == 0) {
            console.log('No response found.');
            return;
        }

        for (i = 0; i < data1.length; i++) {
            if (searchIds == '-1') {
                searchIds = data1[i].id.videoId;
            } else {
                searchIds = searchIds + ',' + data1[i].id.videoId;
            }
        }

        //console.log('search ids');
        //console.log(searchIds);

        //call 2
        console.log('Youtube API request for duration');
        service.videos.list({
            auth: auth,
            part: 'contentDetails',
            id: searchIds,
            q: args.join(' '),
            type: 'video'

        }, function (err, response) {
            if (err) {
                console.log('The API returned an error: ' + err);
                return;
            }
            console.log('Response: ' + response.status + ' ' + response.statusText);
            var data2 = response.data.items;

            //print search results
            var searchString = "";
            //console.log('Printing search: ');
            for (i = 0; i < data1.length; i++) {
                searchString = searchString + (i + 1) + "\t";
                searchString = searchString + data1[i].snippet.title + "\t";
                searchString = searchString + "**[" + convert_time(data2[i].contentDetails.duration) + "]**" + "\n\n";
            }
            searchString = searchString + "**Type a number to make a choice, Type CANCEL to exit**\n";
            bot.sendMessage({
                to: '507703901663920141',
                message: searchString
            });
            searchReturn = JSON.parse(JSON.stringify(data1));
            searchReturn2 = JSON.parse(JSON.stringify(data2));
            //console.log(searchReturn);
        });
     });
}    

//convert youtube's time into normal
function convert_time(duration) {
    var newTime = "";

    try {
        for (var i = 0; i < duration.length; i++) {
            switch (duration[i]) {
                case 'P':
                    break;
                case 'T':
                    break;
                case 'D':
                    newTime = newTime + '::';
                    break;
                case 'H':
                    newTime = newTime + ':';
                    break;
                case 'M':
                    newTime = newTime + ':';
                    break;
                case 'S':
                    break;
                default:
                    newTime = newTime + duration[i];
            }
        }
    } catch {
        Console.log('Error in convert_time');
    }

    return newTime;
}

