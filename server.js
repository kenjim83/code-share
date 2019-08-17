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
const OPEN_READY_STATE = 1; // 'readyState' when socket connection is open
const CLOSED_READY_STATE = 3; // 'readyState' when socket connection is closed

const app = express();
const httpServer = http.createServer(app);
app.set('port', (process.env.PORT || HTTP_PORT));

const wss = new WebSocket.Server({ server: httpServer });

const wsClients = [];

function removeClosedConnections(wsClients) {
  // iterate through connections in reverse so as to not mess up index when removing
  for (var i = wsClients.length -1; i >= 0; i--) {
    const client = wsClients[i];
    if (client.readyState === CLOSED_READY_STATE) {
      wsClients.splice(i, 1);
    }
  }
}

// This event fires when a new ws connection is established
wss.on('connection', function connection(ws) {
  // Save client instance to later compare for this particular connection
  const userConnection = ws;
  // Store with all clients in array
  wsClients.push(ws);
  // Remove any disconnected client connections. Every page refresh closes previous connection and open a new one.
  // Therefore we have to remove any closed ones from our 'wsClients' array.
  removeClosedConnections(wsClients);

  console.log(`clients (${wsClients.length}): ${wsClients.map(({ readyState }) => readyState).join(', ')}`);

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
        wsClients.forEach(client => {
          client.send(UPDATE_OUTPUT + outputToClient);
        });
      });
    }

    if (eventCode === UPDATE_CODE) {
      wsClients.forEach(client => {
        // only update code for *other* clients
        if (userConnection !== client) {
          client.send(UPDATE_CODE + data);
        }
      });
    }

  });
});

wss.on('close', function close(ws) {
  console.log('close!')
});

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
