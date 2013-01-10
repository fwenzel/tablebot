# tablebot

A simple (?) turntable.fm bot.


## Getting started

* Clone the repo
* install node
* ``cd tablebot; cp local.json-dist local.json``
* ``npm install``  # install dependencies
* ``node app.js``  # run it


## Configuration

Check out the [ttapi docs](https://github.com/alaingilbert/Turntable-API).

You might want to create a new, separate user account for this bot. Then, retrieve its user id, auth token and room id via the ttapi bookmarklet, and set those values in ``local.json``.
