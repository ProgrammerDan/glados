
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
  Login.find(req.query, 'username logout date -_id', function(err, docs) {
    res.send(docs);
  });
});

app.get('/entries', cors(), function (req, res) {
  Entry.find(req.query, 'username coords date snitchName -_id', function(err, docs) {
    res.send(docs);
  });
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
});

bot.on('login', function(){
  setInterval(function(){
      var yaw = Math.floor(Math.random() * 360);
      var pitch = Math.floor(Math.random() * 360);
      bot.look(yaw, pitch, true);
    }, 2000);
});
