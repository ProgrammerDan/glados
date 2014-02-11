
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');
var request = require('request');
var fs = require('fs');
var cors = require('cors');
var passport = require('passport');
var util = require('util');
var crypto = require('crypto');
var RedditStrategy = require('passport-reddit').Strategy;
var mongoose = require('mongoose');
var findOrCreate = require('mongoose-findorcreate');
var mineflayer = require('mineflayer');
var vec3 = mineflayer.vec3;
var radarPlugin = require('mineflayer-radar')(mineflayer);

var config = require('configurizer').getVariables();
var app = express();
var loggingIn = true;
var bot = mineflayer.createBot({
  host: config.host,
  port: config.port,
  username: config.username,
  password: config.password
});
bindBotEvents();

var express = require('express')
  , passport = require('passport')
  , util = require('util')
  , crypto = require('crypto')
  , RedditStrategy = require('passport-reddit').Strategy;

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
var snitchSchema = new Schema({
  // cullDate: Date,
  coords: [{x: Number, y: Number, z: Number}],
  snitchName: String,
  snitchGroup: String,
});
snitchSchema.plugin(findOrCreate);
var Snitch = db.model('Snitch', snitchSchema);
var strongholdGroupMemberSchema = new Schema({
  username: String,
  permissionLevel: String
});
var strongholdGroupMemberSchema = new Schema({
  username: String,
  permissionLevel: String
});
// var StrongholdGroupMember = db.model('StrongholdGroupMember', strongholdGroupMemberSchema);
var strongholdGroupSchema = new Schema({
  groupName: String,
  groupType: String,
  members: [strongholdGroupMemberSchema]
});
var StrongholdGroup = db.model('StrongholdGroup', strongholdGroupSchema);
var playerSchema = new Schema({
  minecraftName: String,
  redditName: String,
  token: String
});
playerSchema.plugin(findOrCreate);
var Player = db.model('Player', playerSchema);
// StrongholdGroup.create({groupName: 'test', groupType: 'snitch', members: [{username: 'blueavenue', permissionLevel: 'member'}, {username: 'Foofed', permissionLevel: 'moderator'}]}, function(err, doc) { console.log(doc);});
mongoose.connection.once('connected', function() {
  console.log('Connected to database');
});

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete Reddit profile is
//   serialized and deserialized.
// passport.serializeUser(function(user, done) {
//   done(null, user);
// });

// passport.deserializeUser(function(obj, done) {
//   done(null, obj);
// });


// Use the RedditStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and Reddit
//   profile), and invoke a callback with a user object.
passport.use(new RedditStrategy({
    clientID: config.redditConsumerKey,
    clientSecret: config.redditConsumerSecret,
    callbackURL: config.redditCallbackUrl
  },
  function(accessToken, refreshToken, profile, done) {
    Player.findOrCreate({redditName: profile.name}, function(err, usr) {
      console.log('accessToken: ' + accessToken);
      usr.token = accessToken;
      usr.save(function(err, usr, num) {
        if(err) {
          console.log('error saving token');
        }
      });
      // asynchronous verification, for effect...
      process.nextTick(function () {

        // To keep the example simple, the user's Reddit profile is returned to
        // represent the logged-in user.  In a typical application, you would want
        // to associate the Reddit account with a user record in your database,
        // and return that user instead.
        return done(null, profile);
      });
    });
  }
));




var app = express();

// configure Express
app.configure(function() {
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger());
  app.use(express.logger('dev'));
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  // app.use(express.session({ secret: config.sessionSecret }));
  // Initialize Passport!  Also use passport.session() middleware, to support
  // persistent login sessions (recommended).
  app.use(passport.initialize());
  // app.use(passport.session());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/users', user.list);

app.get('/', function(req, res){
  res.send('index ' + req.user.name);
});

app.get('/account', ensureAuthenticated, function(req, res){
  res.send('account ' + req.user.name);
});

// GET /auth/reddit
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in Reddit authentication will involve
//   redirecting the user to reddit.com.  After authorization, Reddit
//   will redirect the user back to this application at /auth/reddit/callback
//
//   Note that the 'state' option is a Reddit-specific requirement.
app.get('/auth/reddit', function(req, res, next){
  req.state = crypto.randomBytes(32).toString('hex');
  // req.session.state = crypto.randomBytes(32).toString('hex');
  passport.authenticate('reddit', {
    state: req.state,
    // state: req.session.state,
  })(req, res, next);
});

// GET /auth/reddit/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/reddit/callback', function(req, res, next){
  // Check for origin via state token
  // if (req.query.state == req.session.state){
  // if (req.query.state == req.session.state){
    passport.authenticate('reddit', {
      successRedirect: '/account',
      failureRedirect: '/login'
    }, function(err, profile, info) {
      console.log(profile.name);
      Player.findOne({redditName: profile.name}, 'redditName minecraftName token -_id', function(err, usr) {
        res.redirect('http://fwhiffahder.github.io/neurotoxic/index.html#/' + usr.token + '/' + usr.minecraftName + '/' + usr.redditName + '/about');
        res.end();
        // res.send(usr);
      });
    })(req, res, next);
  // }
  // else {
  //   next( new Error(403) );
  // }
});

// app.get('/logout', function(req, res){
//   req.logout();
//   res.redirect('/');
// });

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});


// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if(req.query.token) {
    Player.findOne({token: req.query.token}, function(err, user) {
      console.log(user);
      if(!user){
        return res.send(401,"User Not Authenticated");
      }
      if(user) {
        return next();
      }
    });
  } else {
    return res.send(401,"User Not Authenticated");
  }
  // if (req.isAuthenticated()) { return next(); }
  // res.redirect('/auth/reddit');
}

app.get('/auth/minecraft', ensureAuthenticated, function(req, res) {
  if(req.query.minecraftName) {
    request('http://minecraft.net/skin/' + req.query.minecraftName + '.png', function(error, response, body) {
      fs.readFile('public/images/char.png', function(err, data) {
        if(data == body) {
          Player.find({token: req.query.token}, function(err, docs) {
            if(docs[0].minecraftName) {
              res.send({response: 'already registered', error: false});
            } else {
              Player.findOneAndUpdate({token: req.query.token}, {minecraftName: req.query.minecraftName.toLowerCase()}, function(err) {
                console.log(err);
                res.send({response: 'success', error: false});
              });
            }
          });
        } else {
          res.send({response: 'wrong skin', error: true});
        }
      });
    });
  }
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

app.get('/entries', cors(), ensureAuthenticated, function (req, res) {
  var limit = req.query.limit;
  delete req.query.limit;
  var skip = req.query.skip;
  delete req.query.skip;

  var allowedGroups = [];
  Player.findOne({token: req.query.token}, function(err, doc) {
    console.log('hey!');
    console.log(req.query.token);
    console.log(doc);
    delete req.query.token;
    if(doc) {
      var findGroup = StrongholdGroup.find({members: { $elemMatch: {username: doc.minecraftName} }}, 'groupName -_id');
      findGroup.execFind(function(err, docs) {
        for (var i = 0; i < docs.length; i++) {
          allowedGroups.push(docs[i].groupName);
        }
        var findEntry = Entry.find({$and: [req.query, {snitchGroup: {$in: allowedGroups}}]}, 'username coords date snitchName snitchGroup -_id').limit(limit).sort({'date': -1}).skip(skip);
        findEntry.execFind(function(err, docs) { res.send(docs); });
      });
    }
  });
});

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
app.get('/status/:stat', cors(), function (req, res) {
  if (req.params.stat === 'getQueueSize') {
    bot.plainChat('/gqs');
  } else {
    bot.plainChat('/ss');
  }
  bot.on('message', function(jsonMsg) {
    if(serverStats[req.params.stat].exec(jsonMsg.text)) {
      messageHandled = true;
      res.send(serverStats[req.params.stat].exec(jsonMsg.text));
    }
  });
});

app.get('/status', cors(), function (req, res) {
  var stats = new Object;
  bot.plainChat('/gqs');
  setTimeout(function() {
    bot.plainChat('/ss');
  }, 1000);
  bot.on('message', function(jsonMsg) {
    for(var i in serverStats) {
      if(serverStats[i].exec(jsonMsg.text)) {
        stats[i] = serverStats[i].exec(jsonMsg.text);
      }
    }
  });
  setTimeout(function() {
    res.send(stats);
  }, 3000);
});

app.get('/playerlist', cors(), function(req, res) {
  Login.distinct('username', function(err, names) {
    res.send(names);
  });
});

app.get('/logout', function(req, res) {
  Player.findOneAndUpdate({token: req.query.token}, {token: null}, function(err, doc) {
    console.log(doc);
    res.redirect(req.query.redirect);
  });
});

app.get('/player', function(req, res) {
  Player.findOne(req.query, '-token -_id -__v', function(err, doc) {
    res.send(doc);
  });
});

//CORS forwarding for Civtrade and Civbounty

app.get('/civtrade/shops', cors(), function(req, res) { //Civtrade
  res.setHeader('Content-Type', 'application/json');
  request({url: 'http://civtrade.herokuapp.com/shops', json: true, qs: {search: req.query.search, page: req.query.page}}, function(e, r, b) {res.send(b)});
});

app.get('/civbounty/:endpoint', cors(), function(req, res) { //Civbounty
  res.setHeader('Content-Type', 'application/json');
  request({url: 'http://www.civbounty.com/api/' + req.params.endpoint, json: true}, function(e, r, b) {res.send(b)});
});
app.get('/civbounty/perpetrators/:endpoint', cors(), function(req, res) { //Civbounty
  res.setHeader('Content-Type', 'application/json');
  request({url: 'http://www.civbounty.com/api/perpetrators/' + req.params.endpoint, json: true}, function(e, r, b) {res.send(b)});
});
app.get('/civbounty/reports/:endpoint', cors(), function(req, res) { //Civbounty
  res.setHeader('Content-Type', 'application/json');
  request({url: 'http://www.civbounty.com/api/reports/' + req.params.endpoint, json: true}, function(e, r, b) {res.send(b)});
});

app.get('/perpetrators', cors(), function(req, res) { //Kept for compatibility, will be removed later
  res.setHeader('Content-Type', 'application/json');
  request({url: 'http://www.civbounty.com/api/perpetrators/active', json: true}, function(e, r, b) {res.send(b)});
});

//Bot
function bindBotEvents() {
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
    messageHandled = false;
    var snitchRegex = /^.b \* (.+) entered snitch at (.*) \[(-?\d+) (-?\d+) (-?\d+)\]/;
    var snitchResult = snitchRegex.exec(jsonMsg.text);
    if(snitchResult) {
      Snitch.findOne({'coords.0.x': snitchResult[3], 'coords.0.y': snitchResult[4], 'coords.0.z': snitchResult[5]}, function(err, doc) {
        if(doc) {
          // console.log('docky');
          // console.log(doc);
          doc.snitchName = snitchResult[2];
          doc.save();
          Entry.create({
            username: snitchResult[1],
            coords: [{x: snitchResult[3], y: snitchResult[4], z: snitchResult[5]}],
            snitchName: snitchResult[2],
            snitchGroup: doc.snitchGroup
          }, function(err, entryDoc) {
            if(err) {
              console.log('Snitch saving error: ' + err);
            }
          });
        } else {
          // console.log('look up');
          bot.plainChat('/jalookup ' + snitchResult[3] + ' ' + snitchResult[4] + ' ' + snitchResult[5]); //look up the snitch's group
          bot.once('message', function(lookupJsonMsg) { // wait for the server's response and regex it to make sure it's the right message
            setTimeout(function() {
              bot.plainChat('/jalist');
            }, 2000);
            var lookupRegex = /^.bThe snitch at \[(-?\d+) (\d+) (-?\d+)\] is owned by (.+)/
            var lResult = lookupRegex.exec(lookupJsonMsg.text);
            if (lResult) {
              messageHandled = true;
              if(lResult[1] === snitchResult[3] && lResult[2] === snitchResult[4] && lResult[3] === snitchResult[5]) {
                Entry.create({
                  username: snitchResult[1],
                  snitchName: snitchResult[2],
                  coords: [{x: snitchResult[3], y: snitchResult[4], z: snitchResult[5]}],
                  snitchGroup: lResult[4]
                }, function(err, doc) {
                  if(err) {
                    console.log('Snitch saving error: ' + err);
                  }
                });
              }
            }
          });
        }
      });

    }
    var jalistRegex = /^.f[^A-Za-z0-9_]?f?  world    \[(.+) (.+) (.+)\]         (.+)      ([^ ]+)\s*/;
    var jalistArray = jsonMsg.text.split('\n');
    for(var i = 2; i < jalistArray.length; i++) {
      var jalistResult = jalistRegex.exec(jalistArray[i]);
      if(jalistResult) {
        // var snitch = {
        //   coords: [{x: jalistResult[1], y: jalistResult[2], z: jalistResult[3]}],
        //   snitchGroup: jalistResult[5]
        // };
        var snitch = {'coords.0.x': +jalistResult[1], 'coords.0.y': +jalistResult[2], 'coords.0.z': +jalistResult[3], snitchGroup: jalistResult[5]};
        // console.log([ +jalistResult[1], +jalistResult[2], +jalistResult[3]]);
        Snitch.findOneAndUpdate({'coords.0.x': +jalistResult[1], 'coords.0.y': +jalistResult[2], 'coords.0.z': +jalistResult[3], snitchGroup: jalistResult[5]}, {coords: [{x: +jalistResult[1], y: +jalistResult[2], z: +jalistResult[3]}], snitchGroup: jalistResult[5]}, {upsert: true}, function(err, doc) {
        // Snitch.findOne({'coords.0.x': -4192}, function(err, doc) {
          if(doc) {
            // console.log('found');
            // console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
            // console.log(doc);
            // console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
          } else {
            // console.log('nerp');
          }
        });
      }
      var jalistPageRegex = /^.8 \* Page (\d+) ------------------------------------------/;
      var jalistPageResult = jalistPageRegex.exec(jalistArray[i]);
      if(jalistPageResult) {
        var number = + jalistPageResult[1] + 1;
        setTimeout(function() {
          bot.plainChat('/jalist ' + number);
        }, 5000);
      }
    }

    var snitchTransferRegex = /^.dFrom ([A-Za-z_]+).d: :st snitchTransfer (.+)/;
    var snitchTransferResult = snitchTransferRegex.exec(jsonMsg.text);
    if(snitchTransferResult) {
      var findGroup= StrongholdGroup.find({groupName: snitchTransferResult[2].toLowerCase()}, 'groupName groupType members -_id');
      findGroup.execFind(function(err, docs) {
        if(docs[0]) {
          bot.plainChat('/tell ' + snitchTransferResult[1] + ' Error: The group is already registered');
        } else {
          bot.plainChat('/ctgstats ' + snitchTransferResult[2]);
          if(!docs[0]) {
            memberObjects = [];
            bot.on('message', function(ctgMsg) {
              var ownershipRegex = /^Admin: (.+)/;
              var moderatorRegex = /^Moderators: (.*)/
              var memberRegex = /^Members: (.*)/;
              var botIsOwner = null;
              var botIsModerator = null;
              if(ownershipRegex.exec(ctgMsg.text)) {
                var owner = ownershipRegex.exec(ctgMsg.text)[1].toLowerCase();
                memberObjects.push({ username: owner, permissionLevel: 'owner'});
              }
              var moderators = [];
              if(moderatorRegex.exec(ctgMsg.text)) {
                var moderators = moderatorRegex.exec(ctgMsg.text)[1].split(', ');
                for (var i = 0; i < moderators.length; i++) {
                  if(moderators[i].toLowerCase() === owner) {
                  } else {
                    memberObjects.push({ username: moderators[i].toLowerCase(), permissionLevel: 'moderator'});
                  }
                }
              }
              if(memberRegex.exec(ctgMsg.text)) {
                var members = memberRegex.exec(ctgMsg.text)[1].split(', ');
                for (var i = 0; i < members.length; i++) {
                  memberObjects.push({ username: members[i].toLowerCase(), permissionLevel: 'member'});
                }
                StrongholdGroup.create({groupName: snitchTransferResult[2], groupType: 'snitch', members: memberObjects}, {upsert: true}, function(err, doc) {
                  console.log(err);
                  console.log(doc);
                  return
                });
              }
              messageHandled = true;
              if(ownershipRegex.exec(ctgMsg.text)) {
              }
            });
          }
        }
      });
    }

    if(/^.dTo .+.d: .+$/.exec(jsonMsg.text)) {
      messageHandled = true;
    }

    var messageFromSomeoneRegex = /^.dFrom (.+).d: (.+)/;
    if(messageFromSomeoneRegex.exec(jsonMsg.text)) {
      messageHandled = true;
      console.log('From ' + messageFromSomeoneRegex.exec(jsonMsg.text)[1] + ': ' + messageFromSomeoneRegex.exec(jsonMsg.text)[2]);
    }

    var publicChatRegex = /^.f.f(.+).f: (.+)/;
    if(publicChatRegex.exec(jsonMsg.text)) {
      messageHandled = true;
      if(publicChatRegex.exec(jsonMsg.text)[1] === bot.username) {
        return
      } else {
        console.log(publicChatRegex.exec(jsonMsg.text)[1] + ': ' + publicChatRegex.exec(jsonMsg.text)[2]);
      }
    }

    if(!messageHandled) {
      console.log(jsonMsg.text);
    }

  });

  bot.on('login', function(){
    // bot.plainChat('/cttransfer jukeTest fwhiffahder');
    setInterval(function(){
      if(bot) {
        var yaw = Math.floor(Math.random() * 360);
        var pitch = Math.floor(Math.random() * 360);
        bot.look(yaw, pitch, true);
      }
    }, 2000);
    

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
  bot.on('end', function() {
    bot = null;
    setTimeout(function() {
      bot = mineflayer.createBot({
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password
      });
      bindBotEvents();
    }, 15000);
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
  radarPlugin(bot, config.radar);
}
