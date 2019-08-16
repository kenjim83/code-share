// require Express application framework
var express = require('express');
// require body-parser for json
var bodyParser = require('body-parser');
// require Handlebars templating engine for Express
var exphbs  = require('express-handlebars');
// require 'request' module that allows to make external HTTP requests
var request = require('request');
var { PythonShell } = require('python-shell');

var app = express();

app.set('port', (process.env.PORT || 5000));

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
