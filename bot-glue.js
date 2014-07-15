var readline = require('readline');
var color = require("ansi-color").set;
var mc = require('minecraft-protocol');
var states = mc.protocol.states;
var util = require('util');
exports.createBot = createBot;

var colors = new Array();
colors["black"] = 'black+white_bg';
colors["dark_blue"] = 'blue';
colors["dark_green"] = 'green';
colors["dark_aqua"] = 'cyan'
colors["dark_red"] = 'red'
colors["dark_purple"] = 'magenta'
colors["gold"] = 'yellow'
colors["gray"] = 'black+white_bg'
colors["dark_gray"] = 'black+white_bg'
colors["blue"] = 'blue'
colors["green"] = 'green'
colors["aqua"] = 'cyan'
colors["red"] = 'red'
colors["light_purple"] = 'magenta'
colors["yellow"] = 'yellow'
colors["white"] = 'white'
colors["obfuscated"] = 'blink'
colors["bold"] = 'bold'
colors["strikethrough"] = ''
colors["underlined"] = 'underlined'
colors["italic"] = ''
colors["reset"] = 'white+black_bg'

var dictionary = {};
dictionary["chat.stream.emote"] = "(%s) * %s %s";
dictionary["chat.stream.text"] = "(%s) <%s> %s";
dictionary["chat.type.achievement"] = "%s has just earned the achievement %s";
dictionary["chat.type.admin"] = "[%s: %s]";
dictionary["chat.type.announcement"] = "[%s] %s";
dictionary["chat.type.emote"] = "* %s %s";
dictionary["chat.type.text"] = "<%s> %s";

var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});
 
// function print_help() {
//     console.log("usage: node minechat.js <hostname> <user> <password>");
// }
 
// if (process.argv.length < 5) {
//     console.log("Too few arguments!");
//     print_help();
//     process.exit(1);
// }
 
// process.argv.forEach(function(val, index, array) {
//     if (val == "-h") {
//         print_help();
//         process.exit(0);
//     }
// });
 
// var host = process.argv[2];
// var port = 25565;
// var user = process.argv[3];
// var passwd = process.argv[4];
 
// if (host.indexOf(':') != -1) {
//     port = host.substring(host.indexOf(':')+1);
//     host = host.substring(0, host.indexOf(':'));
// }
 
// console.log("connecting to " + host + ":" + port);
// console.log("user: " + user);
// console.log("passwd: " + Array(passwd.length).join('*'));
 
function createBot(options) {
  var client = mc.createClient({
      host: options.host,
      port: options.port,
      username: options.username,
      password: options.password
  });
   
  client.on([states.PLAY, 0x40], function(packet) {
      console.info(color('Kicked for ' + packet.reason, "blink+red"));
      throw 'kicked';
      // process.exit(1);
  });
   
   var chats = [];
   
  client.on('connect', function() {
      console.info(color('Successfully connected to ' + options.host + ':' + options.port, "blink+green"));
  });

  client.on('state', function(newState) {
    if (newState === states.PLAY) {
      chats.forEach(function(chat) {
        client.write(0x01, {message: chat});
      });
    }
  })
   
  rl.on('line', function(line) {
      if(line == '') {
          return; 
      } else if(line == '/quit') {
          var reason = 'disconnect.quitting';
          console.info('Disconnected from ' + host + ':' + port);
          client.write([states.PLAY, 0x40], { reason: reason });	
          return;
      } else if(line == '/end') {
          console.info('Forcibly ended client');
          process.exit(0);
          return;
      }
      if (!client.write([states.PLAY, 0x01], { message: line })) {
        chats.push(line);
      }
  });
   
  client.on([states.PLAY, 0x02], function(packet) {
      var j = JSON.parse(packet.message);
      var chat = parseChat(j, {});
      console.info(chat);
      var plainChat = '';
      if(j.extra) {
        for (i = 0; i < j.extra.length; i++) {
          plainChat += j.extra[i].text;
        }
      }
      client.emit('message', {text: plainChat});
      client.emit('complexMessage', {text:j});
  });

  function parseChat(chatObj, parentState) {
    function getColorize(parentState) {
      var myColor = "";
      if ('color' in parentState) myColor += colors[parentState.color] + "+";
      if (parentState.bold) myColor += "bold+";
      if (parentState.underlined) myColor += "underline+";
      if (parentState.obfuscated) myColor += "obfuscated+";
      if (myColor.length > 0) myColor = myColor.slice(0,-1);
      return myColor;
    }
    if (typeof chatObj === "string") {
      return color(chatObj, getColorize(parentState));
    } else {
      var chat = "";
      if ('color' in chatObj) parentState.color = chatObj['color'];
      if ('bold' in chatObj) parentState.bold = chatObj['bold'];
      if ('italic' in chatObj) parentState.italic = chatObj['italic'];
      if ('underlined' in chatObj) parentState.underlined = chatObj['underlined'];
      if ('strikethrough' in chatObj) parentState.strikethrough = chatObj['strikethrough'];
      if ('obfuscated' in chatObj) parentState.obfuscated = chatObj['obfuscated'];

      if ('text' in chatObj) {
        chat += color(chatObj.text, getColorize(parentState));
      } else if ('translate' in chatObj && dictionary.hasOwnProperty(chatObj.translate)) {
        var args = [dictionary[chatObj.translate]];
        chatObj['with'].forEach(function(s) {
          args.push(parseChat(s, parentState));
        });

        chat += color(util.format.apply(this, args), getColorize(parentState));
      }
      for (var i in chatObj.extra) {
        chat += parseChat(chatObj.extra[i], parentState);
      }
      return chat;
    }
  }

  client.plainChat = function(message) {
    client.write([states.PLAY, 0x01], { message: message })
  }
  client.players = {};
  client.on([states.PLAY, 0x38], function(packet) {
    var player = client.players[packet.playerName];
    // console.log(packet);
    if(packet.online) {
      if(! player) {
        player = {
          ping: packet.ping,
          username: packet.playerName
        };
        client.players[player.username] = player;
        client.emit('playerJoined', player);
      }
    } else {
      if(player) {
        delete client.players[player.username];
        client.emit('playerLeft', player);
      }
    }
  });
  client.on([states.PLAY, 0x01], function(packet) {
    client.emit('login');
  });
  return client;
}
