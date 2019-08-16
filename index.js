const express = require('express');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const exphbs  = require('express-handlebars');
const request = require('request');
const { PythonShell } = require('python-shell');
const HTTP_PORT = 5000;
const WS_PORT = 8000;

const app = express();
app.set('port', (process.env.PORT || HTTP_PORT));

const wss = new WebSocket.Server({ port: WS_PORT });

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

app.post('/runCode', function(req, res) {
  const rawCode = req.body.rawCode;
  PythonShell.runString(rawCode, null, function (err, output) {
    console.log(output)
    if (err) {
      res.json({
        output: err.message,
      });
    } else {
      res.json({
        output,
      });
    }
  });

});

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message) {
    console.log('received: %s', message);
  });

  ws.send('something');
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

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
