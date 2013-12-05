
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
var vec3 = mineflayer.vec3;

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
  snitchName: String,
  snitchGroup: String
});
var Entry = db.model('Entry', entrySchema);
var strongholdGroupMemberSchema = new Schema({
  username: String,
  permissionLevel: String
});
var StrongholdGroupMember = db.model('StrongholdGroupMember', strongholdGroupMemberSchema);
var strongholdGroupSchema = new Schema({
  groupName: String,
  members: [strongholdGroupMemberSchema]
});
var StrongholdGroup = db.model('StrongholdGroup', strongholdGroupSchema);
// StrongholdGroup.create({groupName: 'test', members: [{username: 'blueavenue', permissionLevel: 'member'}, {username: 'Foofed', permissionLevel: 'moderator'}]}, function(err, doc) { console.log(doc);});
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
    bot.plainChat('/jalookup ' + snitchResult[3] + ' ' + snitchResult[4] + ' ' + snitchResult[5]); //look up the snitch's group
    bot.on('message', function(lookupJsonMsg) { // wait for the server's response and regex it to make sure it's the right message
      var lookupRegex = /^.bThe snitch at \[(-?\d+) (\d+) (-?\d+)\] is owned by (.+)/
      var lResult = lookupRegex.exec(lookupJsonMsg.text);
      if (lResult) {
        if(lResult[1] === snitchResult[3] && lResult[2] === snitchResult[4] && lResult[3] === snitchResult[5]) {
          Entry.create({
            username: snitchResult[1],
            snitchName: snitchResult[2],
            coords: [{x: snitchResult[3], y: snitchResult[4], z: snitchResult[5]}],
            snitchGroup: lResult[4]
          }, function(err, doc) {
            console.log(err);
            console.log(doc);
          });
        }
      }
    });
  }

  var transferRegex = /^.dFrom ([A-Za-z_]+).d: :st transfer (.+)/;
  var transferResult = transferRegex.exec(jsonMsg.text);
  if(transferResult) {
    console.log('trres');
    StrongholdGroup.create({groupName: transferRegex[2], members: [{username: transferResult[1], permissionLevel: 'co-owner'}]}, {upsert: true}, function(err, doc) {
      console.log(err);
      console.log(doc);
    });
  }

  console.log(jsonMsg.text);

});

bot.on('login', function(){
  // setInterval(function(){
  //     var yaw = Math.floor(Math.random() * 360);
  //     var pitch = Math.floor(Math.random() * 360);
  //     bot.look(yaw, pitch, true);
  //   }, 2000);
  

  //Cli
  function completer(line) {
    var completions = [];
    for (var i in bot.players) {
      completions.push(bot.players[i].username);
    }
    var hits = completions.filter(function(c) { return c.indexOf(line) == 0 });
    return [hits.length ? hits : completions, line];
  }
  var cli = require('readline').createInterface({ input: process.stdin, output: process.stdout, completer: completer });
  cli.setPrompt("> ", 2);
  cli.on('line', function(line) {
    bot.plainChat(line);
    cli.prompt();
  });
  function fixStdoutFor(cli) {
    var oldStdout = process.stdout;
    var newStdout = Object.create(oldStdout);
    newStdout.write = function() {
      cli.output.write('\x1b[2K\r');
      var result = oldStdout.write.apply(
        this,
        Array.prototype.slice.call(arguments)
      );
      cli._refreshLine();
      return result;
    }
    process.__defineGetter__('stdout', function() { return newStdout; });
  };
  fixStdoutFor(cli);
  cli.prompt()
});

bot.on('kicked', function(reason) {
  console.log('Kicked with reason: ' + reason);
});
// bot.on('spawn', function() {
//   var obbyGen = {
//     button: vec3(-6437, 70, -5009),
//     end1: vec3(-6437, 68, -5007)
//   }
//   setTimeout(function() {
//     // bot.activateBlock(bot.blockAt(obbyGen.button));
//     bot.placeBlock(bot.blockAt(obbyGen.end1), vec3(0, 1, 0));
//     // bot.dig(bot.blockAt(obbyGen.end1), function(err) {console.log(err)});
//   }, 2000);
// });
