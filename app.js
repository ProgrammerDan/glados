
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
var mineflayer = require('./bot-glue.js');
var vec3 = mineflayer.vec3;
var color = require('ansi-color').set;

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
bot.on('kicked', function (reason) {
  setTimeout(function() {
    var bot = mineflayer.createBot({
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password
    });
    bindBotEvents();
  }, 1000);
});
// bot.on('error', function(err) {
//   console.log(err);
//   setTimeout(function() {
//     var bot = mineflayer.createBot({
//       host: config.host,
//       port: config.port,
//       username: config.username,
//       password: config.password
//     });
//     bindBotEvents();
//   }, 1000);
// });

var express = require('express')
  , passport = require('passport')
  , util = require('util')
  , crypto = require('crypto')
  , RedditStrategy = require('passport-reddit').Strategy;

//Database
var db = mongoose.connect('mongodb://127.0.0.1/glados');
var Schema = mongoose.Schema;

var serverStatsSchema = new Schema({
  freeMemory: {
    megabytes: Number,
    percentage: Number
  },
  freeDisk: Number,
  worldSize: Number,
  loadedChunks: Number,
  livingEntities: Number,
  tps: Number,
});
var serverStats = db.model('serverStats', serverStatsSchema);
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
  world: String,
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
  members: [strongholdGroupMemberSchema]
});
strongholdGroupSchema.plugin(findOrCreate);
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
  // app.use(express.logger());
  // app.use(express.logger('dev'));
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
      // console.log(profile.name);
      Player.findOne({redditName: profile.name}, 'redditName minecraftName token -_id', function(err, usr) {
        res.redirect('http://' + config.frontendHost + '#/?token=' + usr.token + '&redditName=' + usr.redditName + '&minecraftName=' + usr.minecraftName);
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
      // console.log(user);
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

var minecraftSkinTooLate;
var minecraftSkins = {};
fs.readFile('public/images/tooLateSkin.png', function(err, data) {
  var minecraftSkinTooLate = data;
});
app.get('/skin/:skin', function(req, res) {
  if(minecraftSkins[req.params.stat]) {
    console.log('thingexists');
    res.writeHead(200, {'Content-Type': 'image/png'});
    res.end(minecraftSkins[req.params.stat]);
  } else {
    console.log('doesnt');
    res.writeHead(200, {'Content-Type': 'image/png'});
    res.end(minecraftSkinTooLate);
  }
});
app.get('/cacheSkin/:skin', function(req, res) {
    request('http://skins.minecraft.net/MinecraftSkins/' + req.query.minecraftName + '.png', function(error, response, body) {
      minecraftSkins[req.params.skin] = body;
      res.send();
    });
});
app.get('/auth/minecraft', ensureAuthenticated, function(req, res) {
  if(req.query.minecraftName) {
    request('http://skins.minecraft.net/MinecraftSkins/' + req.query.minecraftName + '.png', function(error, response, body) {
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
  var skip = 0;
  if(req.query.page) {
    var p = req.query.page + 1;
    var skip = p * 20;
  }
  delete req.query.page;
  var findLogin = Login.find(req.query, 'username logout date -_id').limit(20).sort({'date': -1}).skip(skip);
  findLogin.execFind(function(err, docs) { res.send(docs); });
});

app.get('/groups', cors(), ensureAuthenticated, function (req, res) {
  var allowedGroups = [];
  Player.findOne({token: req.query.token}, function(err, doc) {
    delete req.query.token;
    if(doc) {
      var findGroup = StrongholdGroup.find({members: { $elemMatch: {username: doc.minecraftName} }}, 'groupName -_id');
      findGroup.execFind(function(err, docs) {
        for (var i = 0; i < docs.length; i++) {
          if(docs[i].groupName) {
            allowedGroups.push(docs[i].groupName);
          };
        }
        res.send(allowedGroups);
      });
    }
  });
});
app.get('/entries', cors(), ensureAuthenticated, function (req, res) {
  var skip = 0;
  if(req.query.page) {
    var p = req.query.page - 1;
    var skip = p * 20;
  }
  delete req.query.page;
  var allowedGroups = [];
  // Entry.find({}, function(err, docs) { res.send(docs); });
  Player.findOne({token: req.query.token}, function(err, doc) {
    delete req.query.token;
    if(doc) {
      var findGroup = StrongholdGroup.find({members: { $elemMatch: {username: doc.minecraftName} }}, 'groupName -_id');
      findGroup.execFind(function(err, docs) {
        for (var i = 0; i < docs.length; i++) {
          if(docs[i].groupName) {
            allowedGroups.push(docs[i].groupName);
          };
        }
        // var allowedGroups = [ 'glados' ];
        var findEntry = Entry.find({$and: [req.query, {snitchGroup: {$in: allowedGroups}}]}, 'username coords date snitchName snitchGroup world -_id').limit(20).sort({'date': -1}).skip(skip);
        findEntry.execFind(function(err, entries) { res.send(entries); });
      });
    }
  });
});

var serverStats = {
  time: /    Time since last restart: (\d+) W, (\d+) D, (\d+) H, (\d+) M, (\d+) S/,
  memory: /    Free allocated memory: (\d+) MB \((\d+)%\)/,
  serverLogSize: /    Server log size: (\d+) bytes \((\d+) MB\)/,
  freeDisk: /    Free disk size: (\d+) MB/,
  currentWorldSize: /    Current world size: (\d+) MB/,
  loadedChunks: /    Loaded chunks in this world: (\d+)/,
  livingEntities: /    Living entities in this world: (\d+)/,
  tps: /    TPS: (\d+\d+)/,
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
    res.redirect(req.query.redirect);
  });
});

app.get('/player', cors(), function(req, res) {
  Player.findOne(req.query, '-token -_id -__v', function(err, doc) {
    if(doc) {
      res.send(doc);
    } else {
      res.send( { minecraftName: req.query.minecraftName } );
    };
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
    console.log(color('[SkyNet] ', 'cyan') + color(player.username + ' has joined the game', 'green'));
    Login.create({ username: player.username}, function(err) {
      if (err) {
        console.log(err);
      }
    });
  });

  bot.on('playerLeft', function (player) {
    console.log(color('[SkyNet] ', 'cyan') + color(player.username + ' has left the game', 'yellow'));
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
    // var serverStats = {freeDisk: {}};
    // if(/^-+{ Performance Monitor }-+$/.exec(jsonMsg.text)) {
    //   bot.once('message', function(jsonMsg) { if(/^- Time Stats$/.exec(jsonMsg.text)) {
    //     bot.once('message', function(jsonMsg) { if(/^    Time since last restart: \d+ W, \d+ D, \d+ H, \d+ M, \d+ S$/.exec(jsonMsg.text)) {
    //       bot.once('message', function(jsonMsg) { if(/^- Memory Stats$/.exec(jsonMsg.text)) {
    //         bot.once('message', function(jsonMsg) { if(/^    Free allocated memory: (\d+) MB \((\d+)%\)$/.exec(jsonMsg.text)) {
    //           serverStats.freeMemory = {
    //             megabytes: freeMemory[1],
    //             percentage: freeMemory[2]
    //           };
    //           bot.once('message', function(jsonMsg) { if(/^- Disk Stats$/.exec(jsonMsg.text)) {
    //             bot.once('message', function(jsonMsg) { if(/^    Server log size: \d+ bytes (\d+ MB)$/.exec(jsonMsg.text)) {
    //               var freeDisk = /^    Free disk size: (\d+) MB$/.exec(jsonMsg.text);
    //               bot.once('message', function(jsonMsg) { if(freeDisk) {
    //                 serverStats.freeDisk = freeDisk[1];
    //               }});
    //             }});
    //           }});
    //         }});
    //       }});
    //     }});
    //   }});
    // }
    // if(/    TPS: (\d+.\d+)/.exec(jsonMsg.text)) {
    // };
    // var snitchRegex = / \* (.+) entered snitch at (.*) \[(-?\d+) (-?\d+) (-?\d+)\]/;
    var linkPlayer = /^From ([ A-Za-z0-9_]+): link (.+)$/.exec(jsonMsg.text);
    if(linkPlayer) {
      Player.find({redditName: linkPlayer[2]}, function(err, docs) {
        if(docs[0]) {
          if(docs[0].redditName) {
            if(docs[0].minecraftName) {
              bot.plainChat('/tell ' + linkPlayer[1] + ' your minecraft account is already linked');
            } else {
              Player.findOneAndUpdate({redditName: linkPlayer[2]}, {minecraftName: linkPlayer[1]}, function(err) {
                if(err) {
                  console.log(err);
                } else {
                  bot.plainChat('/tell ' + linkPlayer[1] + ' success! log in at http://fwhiffahder.github.io/varys to see your snitches');
                }
              });
            }
          }
        } else {
          bot.plainChat('/tell ' + linkPlayer[1] + ' you need to log in once at http://fwhiffahder.github.io/varys');
        }
      });
    }
    var lookup = /The snitch at \[(-?\d+) (\d+) (-?\d+)\] is owned by (.+)/.exec(jsonMsg.text);
    if(lookup) {
      var snitch = {
        coords: [{
          x: lookup[1],
          y: lookup[2],
          z: lookup[3],
        }],
        snitchGroup: lookup[4]
      };
      bot.emit('lookup', snitch.coords[0], snitch);
    };
    var snitchRegex = /^ \* ([a-zA-Z0-9_]+) (?:entered|logged out in|logged in to) snitch at (.*) \[(world|world_nether|world_end) (-?\d+) (-?\d+) (-?\d+)\]$/.exec(jsonMsg.text);
    if(snitchRegex) {
      var snitch = {
        username: snitchRegex[1],
        snitchName: snitchRegex[2],
        world: snitchRegex[3],
        coords: [{
          x: snitchRegex[4],
          y: snitchRegex[5],
          z: snitchRegex[6]
        }]
      };
      bot.plainChat('/jalookup ' + snitch.coords[0].x + ' ' + snitch.coords[0].y + ' ' + snitch.coords[0].z + ' ' + snitch.world); //look up the snitch's group
      bot.once('lookup', function(coords, snitchWithGroup) {
        if(snitch.coords[0].x === coords.x && snitch.coords[0].y === coords.y && snitch.coords[0].z === coords.z) {
          snitch.snitchGroup = snitchWithGroup.snitchGroup;
          Entry.create(snitch, function(err, entryDoc) {
            if (err) {
              console.log(err);
            }
          });
        };
      });
    }

    var memberList = /^Members are as follows: ([A-Za-z0-9_ ]+) $/.exec(jsonMsg.text);
    if(memberList) {
        bot.emit('memberList', [ memberList[1].split(' ') ]);
    } else if (/^Members are as follows: $/.exec(jsonMsg.text)) {
        bot.emit('memberList', []);
    };
    function updateGroup (groupToUpdate) {
      var memberObjects = [];
      bot.plainChat('/nlag ' + groupToUpdate);

      function getPlayersOfType(permissionLevel, callback) {
        bot.plainChat('/nllm ' + groupToUpdate + ' ' + permissionLevel, function() {
          bot.once('memberList', function(members) {
            for (var member in members[0]) {
              memberObjects.push({ username: members[0][member], permissionLevel: permissionLevel});
            };
            // console.log(members);
            if (callback) {
              callback();
            };
          });
        });
      };

      getPlayersOfType('OWNER');
      getPlayersOfType('ADMINS');
      getPlayersOfType('MODS');
      getPlayersOfType('MEMBERS', function() {
        StrongholdGroup.update({groupName: groupToUpdate}, {members: memberObjects}, {upsert: true}, function(err) {
          if(err) console.log(err);
        });
      });
    }
    var manualUpdate = /nlgu ([^ ]+)/.exec(jsonMsg.text);
    if(manualUpdate) {
      updateGroup(manualUpdate[1]);
    };
    var snitchTransferWhileAway= /You have been invited to the following groups while you were away: ([-A-Za-z0-9_ ,]+)./.exec(jsonMsg.text);
    if(snitchTransferWhileAway) {
      var groupsToUpdate = snitchTransferWhileAway[1].split(', ');
      console.log(groupsToUpdate);
      for (var group in groupsToUpdate) {
        console.log(groupsToUpdate[group]);
        updateGroup(groupsToUpdate[group]);
      }
    }
    var snitchTransfer = /^You have been invited to the group ([-A-Za-z0-9_]+) by ([A-Za-z0-9_]+).$/.exec(jsonMsg.text);
    if(snitchTransfer) {
      console.log('result!');
      console.log(snitchTransfer[1]);
      updateGroup(snitchTransfer[1]);
    }
    var listGroupsPage = /^Page 1 of (\d+).$/.exec(jsonMsg.text);
    if(listGroupsPage) {
      for(var i=2; i <= listGroupsPage[1]; i++) {
        bot.plainChat('/nllg ' + i);
      };
    };
    var listGroups = /^([^ ]+): \(PlayerType\) .+$/.exec(jsonMsg.text);
    if(listGroups) {
      updateGroup(listGroups[1]);
    };

  });

  bot.on('login', function(){
    // bot.plainChat('/nllg');
    setInterval(function(){
      if(bot) {
        bot.priorityPlainChat('/groupchat');
        bot.priorityPlainChat('Sorry if this bothers you, trying to avoid AFKPGC.');
        bot.priorityPlainChat('/groupchat mcamaret');
      }
    }, 135000);
  });

}
