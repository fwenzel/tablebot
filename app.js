var fork = require('child_process').fork;
var fs = require('fs');


var bot_instance = fork('init.js');
console.log('Tablebot started');


// Touching the file .updateme will result in a bot update and restart.
fs.watchFile('.updateme', function (event, filename) {
    bot_instance.kill();
    console.log('Tablebot stopped');
    bot_instance = fork('init.js');
    console.log('Tablebot restarted');
});

process.on('SIGINT', function () {
    bot_instance.kill('SIGINT');
    fs.unwatchFile('.updateme');
    process.exit();
});
