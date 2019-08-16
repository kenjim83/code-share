// require Express application framework
var express = require('express');
// require Handlebars templating engine for Express
var exphbs  = require('express-handlebars');
// require 'request' module that allows to make external HTTP requests
var request = require('request');

var app = express();

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));

// use Handlebars as templating engine instead of Express default one
app.engine('handlebars', exphbs({defaultLayout: 'base'}));
app.set('view engine', 'handlebars');

// define the app routes
app.get('/', function(req, res) {

	// request the data from third party API
	request(
    {
    	method: 'GET',
    	uri: 'http://mysafeinfo.com/api/data?list=englishmonarchs&format=json'
   	},
  	function (error, resp, body) {
  		// if the response is an error, display the error page
      if (error) {
      	res.render('pages/error', { error: err });
    	}
    	// otherwise render the home page with the fetched data
    	else {
    		res.render('pages/home', { kings: JSON.parse(body) });
    	}
    }
  );
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
