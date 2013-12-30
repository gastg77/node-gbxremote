var gbxremote = require('../lib/gbxremote.js');

var client = gbxremote.createClient(5000);

client.query('GetStatus', function(err, res) {
	if (err) console.error('Error:', err);
	else console.log(res);
	client.terminate();
});

client.on('error', console.log);