function ping(user1, channelID1) {
    bot.sendMessage({
        to: channelID1,
        message: '@'+user1+' don\'t ping me you bitch. Only I can ping you.'
    });
    bot.sendMessage({
        to: channelID1,
        message: 'ping'
    });
}


var Discord = require('discord.io');
var logger = require('winston');
var auth = require('./auth.json');

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';

// Initialize Discord Bot
var bot = new Discord.Client({
    token: auth.token,
    autorun: true
});

bot.on('ready', function (evt) {
    logger.info('Connected');
    logger.info('Logged in as: ');
    logger.info(bot.username + ' - (' + bot.id + ')');
});

bot.on('disconnect', function (errMsg, code) { });

bot.on('message', function (user, userID, channelID, message, evt) {
    // Our bot needs to know if it will execute a command
    // It will listen for messages that will start with `!`
    if (message.substring(0, 1) == '!') {
        var args = message.substring(1).split(' ');
        var cmd = args[0];

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
        }
    }
});

bot.on('all', function(event) { }) {
    logger.info('log: ' + event);
}
