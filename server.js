const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const exphbs  = require('express-handlebars');
const { PythonShell } = require('python-shell');

const HTTP_PORT = 5000;


/* WebSocket message protocol
 * "<2 char event code>: <data>"
 *
 * Example:
 * "XC: x = 1n\.."
 * "UC: x = 1n\.."
 */
const EXEC_CODE = "XC: "; // Execute code - Run code then update on all clients
const UPDATE_CODE = "UC: "; // Update code - Update code on all clients
const UPDATE_OUTPUT = "UO: "; // Update output - Update executed code output on all clients

const app = express();
const httpServer = http.createServer(app);
app.set('port', (process.env.PORT || HTTP_PORT));

const wss = new WebSocket.Server({ server: httpServer });

function getAllClientsReadyStates() {
  // wss.clients is a Set, so .map is not available. use .forEach.
  const readyStates = [];
  wss.clients.forEach(({ readyState }) => {
    readyStates.push(readyState);
  });
  return readyStates;
}

function noop() {}

function heartbeat() {
  this.isAlive = true;
}

// This event fires when a new ws connection is established
wss.on('connection', function connection(ws) {
  // wire up heartbeats
  ws.isAlive = true;
  ws.on('pong', heartbeat);

  console.log(`clients [${wss.clients.size}]: ${getAllClientsReadyStates()}`);

  ws.on('message', function incoming(message) {
    console.log('received: %s', message);

    const eventCode = message.slice(0,4);
    const data = message.slice(4);

    if (eventCode === EXEC_CODE) {
      PythonShell.runString(data, null, function (err, output) {
        console.log({output})
        let outputToClient = "";
        if (err) {
          outputToClient = err.message;
        } else if (output) {
          outputToClient = Array.isArray(output) ? output.join('\n') : output;
        }

        // update ouput on all open clients
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(UPDATE_OUTPUT + outputToClient);
          }
        });
      });
    }

    if (eventCode === UPDATE_CODE) {
      // update code for all *other* open clients
      wss.clients.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(UPDATE_CODE + data);
        }
      });
    }

  });
});

wss.on('close', function close(ws) {
  console.log('wss closed!')
});

// Ping all clients every 30 secs to prevent automatic closing of idle connections
// https://www.npmjs.com/package/ws#how-to-detect-and-close-broken-connections
const interval = setInterval(function ping() {
  wss.clients.forEach(client => {
    if (client.isAlive === false) {
      return client.terminate();
    }

    client.isAlive = false;
    client.ping(noop);
  });
}, 30000);

app.use(express.static(__dirname + '/public'));
// for parsing application/json
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }))

// use Handlebars as templating engine instead of Express default one
app.engine('handlebars', exphbs({defaultLayout: 'base'}));
app.set('view engine', 'handlebars');

// define the app routes
app.get('/', function(req, res) {
  res.render('pages/home');
});

// make a 404 error page
app.use(function (req, res) {
	res.status(404);
	res.render('pages/404');
});

// handle other errors
app.use(function (err, req, res) {
  res.status(500);
  res.render('pages/error', { error: err });
});

httpServer.listen(app.get('port'));
