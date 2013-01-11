var nconf = require('nconf');
nconf.argv().env().file({ file: 'local.json' });

var Bot = require('ttapi');
var bot = new Bot(nconf.get('tt_auth'), nconf.get('tt_userid'),
                  nconf.get('tt_roomid'));

var state = {
    up: false  // Am I on stage?
};
var current_song = {
    up: 0,
    down: 0,
    snags: 0
};

// Out!
var quit = function() {
    console.log("That's it, I'm outta here!");
    bot.roomDeregister();  // Leave room.
    process.exit();
}

// Step up as DJ.
var stepUp = function() {
    bot.addDj(function() {
        state.up = true;
        console.log('Stepped up!');
    });
};

// Step down as DJ.
var stepDown = function() {
    bot.remDj(function() {
        state.up = false;
        console.log('Stepped down!');
    });
};

// Check if we should become a DJ, or stop becoming one.
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
};

// Track vote stats.
var track_votes = function(data) {
    current_song.up = data.room.metadata.upvotes;
    current_song.down = data.room.metadata.downvotes;

    if (data.room.metadata.votelog[0][1] == 'up') {
        console.log('[Upvote] (+' + data.room.metadata.upvotes + ' -' + data.room.metadata.downvotes + ')');
    } else {
        console.log('[Downvote] (+' + data.room.metadata.upvotes + ' -' + data.room.metadata.downvotes + ')');
    }
};

// Track snags.
var track_snags = function(data) {
    current_song.snags++;

    console.log('[Snagged]');
};

// Callback handler when a new song starts.
var new_song_handler = function(data) {
    reset_song_data(data);
};

// Callback handler when a song ends.
var end_song_handler = function(data) {
    speak_stats();
};

// Reset current song stats.
var reset_song_data = function(data) {
    current_song.up = data.room.metadata.upvotes;
    current_song.down = data.room.metadata.downvotes;
    current_song.snags = 0;

    console.log('Reset song data');
};

// Speaks stats about song to chat.
var speak_stats = function() {
    bot.speak('STATS: :+1: ' + current_song.up +
              ' / :-1: ' + current_song.down +
              ' / :heart: ' + current_song.snags);
};

// Listen to commands from moderators
var COMMANDS = {
    help: {
        help: 'List all commands.',
        run: function(data) {
            for (var n in COMMANDS) {
                bot.pm('/' + n + (COMMANDS[n].mod ? '*' : '') + ': ' +
                       COMMANDS[n]['help'], data.senderid);
            }
            bot.pm('*: mod only.', data.senderid)
        },
        mod: false
    },
    ping: {
        help: 'Pong.',
        run: function(data) {
            bot.pm('pong', data.senderid);
        },
        mod: false
    },
    quit: {
        help: 'Quit the bot.',
        run: quit,
        mod: true
    }
}
var command = function(data) {
    if (data.text[0] != '/') return;  // All commands start with slash.

    // If pmmed, the sender is in senderid. If spoken, it's userid. Silly.
    if (!data.senderid) {
        data.senderid = data.userid;
    }

    var cmd = data.text.slice(1);
    if (!(cmd in COMMANDS)) return;  // Unknown command.
    console.log('Got command: ' + cmd)

    if (COMMANDS[cmd].mod) {  // Moderator-only command!
        bot.roomInfo(false, function(info) {
            if (info.room.metadata.moderator_id.indexOf(data.senderid) != -1) {
                COMMANDS[cmd].run(data);
            }
        });
    } else {  // Public command.
        COMMANDS[cmd].run(data);
    }
};


/** Events */
process.on('SIGINT', quit);

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

bot.on('newsong', new_song_handler);
bot.on('endsong', end_song_handler);

bot.on('update_votes', track_votes);
bot.on('snagged', track_snags);

bot.on('pmmed', command);
bot.on('speak', command);
