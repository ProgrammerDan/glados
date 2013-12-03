
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');
var request = require('request');
var cors = require('cors');
var mongoose = require('mongoose');
var mineflayer = require('mineflayer');

var config = require('configurizer').getVariables();
var app = express();
var loggingIn = true;
var bot = mineflayer.createBot({
  host: config.host,
  port: config.port,
  username: config.username,
  password: config.password
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

//Database
var db = mongoose.connect('mongodb://localhost/glados');
var Schema = mongoose.Schema;

var loginSchema = new Schema({
  username: String,
  date: {type: Date, default: Date.now},
  logout: { type: Boolean, default: false}
});
var Login = db.model('Login', loginSchema);
var entrySchema = new Schema({
  username: String,
  date: {type: Date, default: Date.now},
  coords: [{x: Number, y: Number, z: Number}],
  snitchName: String
});
var Entry = db.model('Entry', entrySchema);
mongoose.connection.once('connected', function() {
  console.log('Connected to database');
});

//Api
app.get('/players', cors(), function (req, res) {
  var players = [];
  for (var i in bot.players) {
    players.push({username: bot.players[i].username});
  }
  res.send(players);
});

app.get('/players/login', cors(), function (req, res) {
  var limit = req.query.limit;
  delete req.query.limit;
  var skip = req.query.skip;
  delete req.query.skip;
  var findLogin = Login.find(req.query, 'username logout date -_id').limit(limit).sort({'date': -1}).skip(skip);
  findLogin.execFind(function(err, docs) { res.send(docs); });
});

app.get('/entries', cors(), function (req, res) {
  var limit = req.query.limit;
  delete req.query.limit;
  var skip = req.query.skip;
  delete req.query.skip;
  var findEntry = Entry.find(req.query, 'username coords date snitchName -_id').limit(limit).sort({'date': -1}).skip(skip);
  findEntry.execFind(function(err, docs) { res.send(docs); });
});

app.get('/status/:stat', cors(), function (req, res) {
  var serverStats = {
    time: /^.8    Time since last restart: .6(\d+).8 W, .6(\d+).8 D, .6(\d+).8 H, .6(\d+).8 M, .6(\d+).8 S/,
    memory: /^.8    Free allocated memory: .6(\d+).8 MB \((\d+)%\)/,
    serverLogSize: /^.8    Server log size: .6(\d+) bytes \((\d+) MB\)/,
    freeDisk: /^.8    Free disk size: .6(\d+) MB/,
    currentWorldSize: /^.8    Current world size: .6(\d+) MB/,
    loadedChunks: /^.8    Loaded chunks in this world: .6(\d+)/,
    livingEntities: /^.8    Living entities in this world: .6(\d+)/,
    tps: /^.8    TPS: .6(\d+\.\d+)/,
    getQueueSize: /^(\d+) players are in the queue./
  }

  if (req.params.stat === 'getQueueSize') {
    bot.plainChat('/gqs');
  } else {
    bot.plainChat('/ss');
  }
  bot.on('message', function(jsonMsg) {
    if(serverStats[req.params.stat].exec(jsonMsg.text)) {
      res.send(serverStats[req.params.stat].exec(jsonMsg.text));
    }
  })
});

//CORS forwarding for Civtrade and Civbounty
app.get('/civtrade/shops', cors(), function(req, res) {
  res.setHeader('Content-Type', 'application/json');
  request({url: 'http://civtrade.herokuapp.com/shops', json: true, qs: {search: req.query.search, page: req.query.page}}, function(e, r, b) {res.send(b)});
});

app.get('/perpetrators', cors(), function(req, res) {
  res.setHeader('Content-Type', 'application/json');
  request({url: 'http://www.civbounty.com/api/perpetrators/active', json: true}, function(e, r, b) {res.send(b)});
});

//Bot
bot.on('spawn', function() {
  console.log('connected');
});

bot.on('playerJoined', function (player) {
  console.log(player.username + " has joined.");
  Login.create({ username: player.username}, function(err) {
    if (err) {
      console.log(err);
    }
  });
  var joinGreetings = ['Welcome back to Civcraft!', 'Welcome back to Civcraft, ' + player.username + '!', 'hey ' + player.username, 'greetings, human', 'Hi ' + player.username, 'I blame ' + player.username + ' for the gimmick brigade. oops, mistell', 'hey', 'hi', 'hello', 'hello ' + player.username, 'All hail Glorious Leader Big Blue!', 'Did you know that robots can and do appreciate everyone ever at once? That includes you! :)', 'This is your daily reminder that you contribute to the experiment. Thank you.', 'ilu bb', 'science is fun!', 'Asbestos is harmless (TM)', 'Thank you for participating in this Computer-Aided Enrichment Center activity! :)', 'Hi ' + player.username + ', and welcome back to the game.', 'Welcome to Peasant Simulator 2013', 'Thank you for returning to Peasant Simulator 2013, now back to work, slave.', 'i see you', 'hello?', 'is anyone there?', 'could you come over here', 'target aquired', 'hello, friend', 'Oh hi! So, how are you holding up?', player.username + ' is a psycopath and should be banned', player.username + ' is a psycopath and should be breaded', 'Would you like to talk about Cave Johnson/Batman/Darth Vader? Because he\'s cool.', 'I love you, random citizen.', 'All I do is try to do is make people feel appreciated and lighten the atmosphere, but everyone hates me for being a bot. You don\'t hate me, do you?', 'I\'m watching you', 'I violate privacy', 'Snitches are fun!', 'Call your local representative and ask them to repeal botting policy!', 'sometimes people are mean to me and it makes me feel sad :('];
  var chosenGreeting = joinGreetings[getRandomInt(0, joinGreetings.length)];
  if(!loggingIn) {
    bot.plainChat('/tell ' + player.username + ' ' + chosenGreeting);
  }
});

bot.on('playerLeft', function (player) {
  console.log(player.username + " has left.");
  Login.create({ username: player.username, logout: true }, function(err) {
    if (err) {
      console.log(err);
    }
  });
});

function getRandomInt (min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

bot.on('message', function(jsonMsg) {
  var snitchRegex = /^.b \* (.+) entered snitch at (.+) \[(-?\d+) (-?\d+) (-?\d+)\]/;
  var snitchResult = snitchRegex.exec(jsonMsg.text);
  if(snitchResult) {
    Entry.create({
      username: snitchResult[1],
      snitchName: snitchResult[2],
      coords: [{x: Math.round(snitchResult[3]) + getRandomInt(0, 8), y: Math.round(snitchResult[4]) + getRandomInt(0, 8), z: Math.round(snitchResult[5]) + getRandomInt(0, 8)}]
    }, function(err, doc) {
      console.log(err);
      console.log(doc);
    });
  }

  console.log(jsonMsg.text);

});

bot.on('login', function(){
  setTimeout(function() {
    loggingIn = false;
  }, 2000);
  setInterval(function(){
      var yaw = Math.floor(Math.random() * 360);
      var pitch = Math.floor(Math.random() * 360);
      bot.look(yaw, pitch, true);
    }, 2000);
});
