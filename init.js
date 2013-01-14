var nconf = require('nconf');
var ttapi = require('ttapi');

nconf.argv().env().file({ file: 'local.json' });

var bot = new ttapi(nconf.get('tt_auth'), nconf.get('tt_userid'),
                    nconf.get('tt_roomid'));

var events = require('./events.js')(nconf, bot);


/** Hook up Events Handlers */
process.on('SIGINT', events.quitEventHandler);

bot.on('ready', events.readyEventHandler);

bot.on('roomChanged', events.roomchangeEventHandler);

bot.on('add_dj', events.addDjEventHandler);
bot.on('rem_dj', events.remDjEventHandler);

bot.on('newsong', events.newsongEventHandler);
bot.on('endsong', events.endsongEventHandler);

bot.on('update_votes', events.votesEventHandler);
bot.on('snagged', events.snagEventHandler);

bot.on('pmmed', events.speakEventHandler);
bot.on('speak', events.speakEventHandler);
