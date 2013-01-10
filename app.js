var nconf = require('nconf');
nconf.argv().env().file({ file: 'local.json' });

var Bot = require('ttapi');
var bot = new Bot(nconf.get('tt_auth'), nconf.get('tt_userid'),
                  nconf.get('tt_roomid'));

var state = {
    up: false  // Am I on stage?
};

/**
 * Step up as DJ.
 */
var stepUp = function() {
    bot.addDj(function() {
        state.up = true;
        console.log('Stepped up!');
    });
}

/**
 * Step down as DJ.
 */
var stepDown = function() {
    bot.remDj(function() {
        state.up = false;
        console.log('Stepped down!');
    });
}

/**
 * Check if we should become a DJ, or stop becoming one.
 */
var check_dj = function() {
    bot.roomInfo(false, function(info) {
        var djs = info.room.metadata.djcount;
        if (djs == 1 && !state.up) {
            // If only one DJ is up, support them.
            stepUp();
        } else if ((djs == 1 || djs > 2) && state.up) {
            // If I am the only one up or one of many, step down.
            stepDown();
        }
    });
}

/** Events */
bot.on('ready', function(data) {
    console.log('Ready to roll!');
    check_dj();
});

bot.on('add_dj', function(data) {
    if (data.user.userid == nconf.get('tt_userid')) return;  // Ignore self.
    console.log('Someone became DJ');
    check_dj();
});

bot.on('rem_dj', function(data) {
    if (data.user.userid == nconf.get('tt_userid')) return;  // Ignore self.
    console.log('Someone stopped being DJ');
    check_dj();
});
