const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const exphbs  = require('express-handlebars');
const request = require('request');
const { PythonShell } = require('python-shell');
const uuid = require('uuid/v1');

const HTTP_PORT = 5000;
// const WS_PORT = 8080;


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

const wsClients = {};

function removeClosedConnections(wsClients) {
  Object.keys(wsClients).forEach(key => {
    const client = wsClients[key];
    if (client.readyState !== OPEN_READY_STATE) {
      // close connection
      client.close();
      delete wsClients[key];
    }
  })
}

wss.on('connection', function connection(ws) {
  // save new ws connect in cache with random uuid as key
  const userId = uuid();
  wsClients[userId] = ws;
  // remove any disconnected client connections. every page refresh closes previous connection.
  removeClosedConnections(wsClients)
  ;
  console.log({clients: Object.keys(wsClients)});

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
        Object.keys(wsClients).forEach(currUserId => {
          const wsClient = wsClients[currUserId];
          wsClient.send(UPDATE_OUTPUT + outputToClient);
        });
      });
    }

    if (eventCode === UPDATE_CODE) {
      Object.keys(wsClients).forEach(currUserId => {
        // only update code for *other* clients
        if (currUserId !== userId) {
          const wsClient = wsClients[currUserId];
          wsClient.send(UPDATE_CODE + data);
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

httpServer.listen(HTTP_PORT);
