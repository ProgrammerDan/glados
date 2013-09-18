
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');
var cors = require('cors');
var mineflayer = require('mineflayer');

var app = express();
var bot = mineflayer.createBot({
  host: 'localhost',
  username: 'GLaDOS',
});

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/users', user.list);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

//Api
app.get('/players', cors(), function (req, res) {
  var players = [];
  for (var i in bot.players) {
    players.push({username: bot.players[i].username});
  }
  res.send(players);
});

//Bot
bot.on('playerJoined', function (player) {
  bot.chat(player.username + " has joined.");
  console.log(player.username + " has joined.");
});

bot.on('playerLeft', function (player) {
  bot.chat(player.username + " has left.");
  console.log(player.username + " has left.");
});

bot.on('chat', function (sender, message) {
  if (message === 'players') {
    console.log(bot.players);
  }
});
