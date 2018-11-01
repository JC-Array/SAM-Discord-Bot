var Discord = require('discord.io');
var logger = require('winston');
var fs = require('fs');
var users;
var channelWhiteList = ['381957445536317441', '381957832129380352', '499695195537932299', '500376094134763527', '486366628229939202'];

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
    colorize: true
});
logger.level = process.env.LOGGER_LEVEL || 'debug';
logger.debug(`LOGGER_LEVEL set to ${logger.level}`);
// handle the different authentication techniques
let jsonToken = "";
try {
    jsonToken = require('./auth.json').token;
} catch (err) {
    jsonToken = "";
}

let token = process.env.DISCORD_AUTH_TOKEN || jsonToken;

if (!token) {
    logger.error('error with token, does not exist.  Please set up DISCORD_AUTH_TOKEN or auth.json file');
} else {
    logger.info(`found token: ${token}`);
}


// Initialize Discord Bot
var bot = new Discord.Client({
    token: token,
    autorun: true
});

bot.on('ready', function (evt) {
    logger.info('Connected');
    logger.info('Logged in as: ');
    logger.info(bot.username + ' - (' + bot.id + ')');
    logger.info('Server info:');
    JSON.stringify(bot.servers, null, 4).split('\n').forEach (function(element) {
        logger.info(element);
    });
    logger.info(bot.servers[0]);
    users = bot.servers[0].members;
});

bot.on('disconnect', function (errMsg, code) { });

bot.on('message', function (user, userID, channelID, message, evt) {
    // Our bot needs to know if it will execute a command
    // It will listen for messages that will start with `!`

    logger.info('message: ' + message + ' user: ' + user);
    if (message.substring(0, 1) == '!') {
        var args = message.substring(1).split(' ');
        var cmd = args[0];

        //user's voice channel
        var voiceChannelID = -1
        for (var i = 0; i < users.length; i++) {
            if (users[i].userID == userID) {
                voiceChannelID = users[i].voice_channel_id;
                break;
            }
        }

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
                if (voiceChannelID == -1) {
                    break;
                }
                MHG(voiceChannelID);
                break;
            case 'GTFO':
                bot.leaveVoiceChannel(voiceChannelID, function () { });
                break;
            case 'Townhall':
                townhall(voiceChannelID);
                break;
            case 'Help':    //add actual help later
                bot.sendMessage({
                    to: channelID,
                    message: 'http://bfy.tw/6iBM'
                });
                break;
        }
    }
});

// Detect changes in voice channels, if one leaves, kick off message
bot.on('voiceStateUpdate', function (event) {
    logger.info('Channel Update... user_id: ' + event.d.user_id + ' channel_id: ' + event.d.channel_id);
    //dont proc if it is the bot
    if (event.d.user_id == 505565942072475668) return;
    var prevChannelID = -1;

    //update and grab previous channel      //optimise
    for (var i = 0; i < users.length; i++) {
        if (users[i].id == event.d.user_id) {
            prevChannelID = users[i].voice_channel_id;
            users[i].voice_channel_id = event.d.channel_id;
            break;
        }
    }

    if (event.d.channel_id == null && prevChannelID != -1) {    //user left the channel
        for (var i = 0; i < channelWhiteList.length; i++) {
            if (prevChannelID == channelWhiteList[i]) {
                MHG(prevChannelID);
                break;
            }
        }
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
        if (error) return logger.info('error: ' + error);
        bot.getAudioContext(voiceChannelID, function (error, stream) {
            if (error) return logger.info('error: ' + error);
            //choose a random file
            var fileNum = Math.floor((Math.random() * 5) + 1);
            switch (fileNum) {
                case 1: fs.createReadStream('MHG1.mp3').pipe(stream, { end: false });
                    break;
                case 2: fs.createReadStream('MHG2.mp3').pipe(stream, { end: false });
                    break;
                case 3: fs.createReadStream('MHG3.mp3').pipe(stream, { end: false });
                    break;
                case 4: fs.createReadStream('MHG4.mp3').pipe(stream, { end: false });
                    break;
                case 5: fs.createReadStream('MHG5.mp3').pipe(stream, { end: false });
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
    for (var i = 0; i < users.length; i++) {
        logger.info('i: ' + i + ' user' + JSON.stringify(users[i]));
        if (users[i].voice_channel_id != 'null') {
            logger.info('accepted');
            bot.moveUserTo({ 'serverID': '335603306879778819', 'userID': users[i].userID, 'channelID': voiceChannelID }, function (error, stream) {
                if (error) return logger.info('error: ' + error);
            });
        }
    }
    //join and play intro
    bot.joinVoiceChannel(voiceChannelID, function (error, events) {
        if (error) return logger.info('error: ' + error);
        bot.getAudioContext(voiceChannelID, function (error, stream) {
            if (error) return logger.info('error: ' + error);
            fs.createReadStream('TownhallCall.mp3').pipe(stream, { end: false });
            stream.on('done', function () {
                bot.leaveVoiceChannel(voiceChannelID, function () { });
            });
        });
    });
};