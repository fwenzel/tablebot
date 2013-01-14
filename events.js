var exec = require('child_process').exec;
var util = require('util');


var state = {
    up: false  // Am I on stage?
};
var current_song = {
    song: null,
    artist: null,
    up: 0,
    down: 0,
    snags: 0
};


module.exports = function(nconf, bot) {
    // Ready?
    var ready = function(data) {
        console.log('Ready to roll!');
        check_dj(true);
    };

    // Out!
    var quit = function() {
        console.log("That's it, I'm outta here!");
        bot.roomDeregister();  // Leave room.
        process.exit();
    };

    // djs++
    var add_dj_handler = function(data) {
        if (data.user.userid == nconf.get('tt_userid')) return;  // Ignore self.
        console.log('Someone became DJ');
        check_dj();
    };

    // djs--
    var rem_dj_handler = function(data) {
        if (data.user.userid == nconf.get('tt_userid')) return;  // Ignore self.
        console.log('Someone stopped being DJ');
        check_dj();
    };

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
    var check_dj = function(log_counts) {
        bot.roomInfo(false, function(data) {
            var djs = data.room.metadata.djcount;
            if (log_counts) {
                console.log(util.format('%d listeners and %d DJs.',
                            data.room.metadata.listeners, djs));
            }
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
        var room_data = data.room.metadata;
        if (room_data.current_song) {
            var song_data = room_data.current_song.metadata;
            current_song.song = song_data.song;
            current_song.artist = song_data.artist;
        }
        current_song.up = room_data.upvotes;
        current_song.down = room_data.downvotes;
        current_song.snags = 0;

        console.log('Reset song data');
    };

    // Speaks stats about song to chat.
    var speak_stats = function() {
        bot.speak(
            util.format('"%s" by %s. STATS: :+1: %d / :-1: %d / :heart: %d',
                current_song.song, current_song.artist, current_song.up,
                current_song.down, current_song.snags));
    };

    // Listen to via chat
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
        update: {
            help: 'Update bot from git and restart.',
            run: function(data) {
                exec('git pull', function(err, stdout, stderr) {
                    if (err !== null) {
                        bot.pm(stderr, data.senderid);
                    } else {
                        bot.roomDeregister();
                        exec('touch .updateme');  // Notify supervisor!
                    }
                });
            },
            mod: true
        },
        quit: {
            help: 'Quit the bot.',
            run: exports.quitEventHandler,
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

        if (COMMANDS[cmd].mod) {  // Moderator-only command!
            bot.roomInfo(false, function(info) {
                if (info.room.metadata.moderator_id.indexOf(data.senderid) != -1) {
                    console.log('Got moderator command: ' + cmd)
                    COMMANDS[cmd].run(data);
                }
            });
        } else {  // Public command.
            console.log('Got command: ' + cmd)
            COMMANDS[cmd].run(data);
        }
    };


    return {
        readyEventHandler: ready,
        quitEventHandler: quit,
        roomchangeEventHandler: reset_song_data,
        addDjEventHandler: add_dj_handler,
        remDjEventHandler: rem_dj_handler,
        newsongEventHandler: new_song_handler,
        endsongEventHandler: end_song_handler,
        speakEventHandler: command,
        snagEventHandler: track_snags,
        votesEventHandler: track_votes
    }
}
