var gbxremote = require('../lib/gbxremote.js');

// Connect to localhost:5000
var client = gbxremote.createClient(5000);

client.on('connect', function () {
	client.query('SetApiVersion', ['2012-06-19']);
	client.query('EnableCallbacks', [true]);
});

client.on('callback', function (method, params) {
	console.log('Callback from server: %s - %d params', method, params.length);
});
