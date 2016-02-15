var gbxremote = require('../lib/gbxremote.js');

var client = gbxremote.createClient(5000);

client.query('GetStatus').then(function(res) {
	console.log(res);
}).catch(function(err) {
	console.error('Error:', err);
}).then(function() {
	client.terminate();
});

client.on('error', console.log);