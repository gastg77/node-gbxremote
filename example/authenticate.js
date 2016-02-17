var gbxremote = require('../lib/gbxremote.js');

var client = gbxremote.createClient(5000, 'localhost');

client.on('error', function (err) {
	console.log(err);
})

.on('connect', function () {
	// Authenticate(string user, string password)
	client.query('Authenticate', ['SuperAdmin', 'SuperAdmin']).then(function (res) {
		if (res === true) {
			console.log('Authenticated!');
		}
	}).catch(function (err) {
		console.log('error:', err);
	}).then(function () {
		// Disconnect
		client.terminate();
	});
});
