var gbxremote = require('../lib/gbxremote.js');

var client = gbxremote.createClient(5000, 'localhost');

client.on('error', function(err) {
	console.log(err);
})

.on('connect', function() {
	// Authenticate(string user, string password)
	client.query("Authenticate", ["SuperAdmin", "SuperAdmin"], function(err, res) {
		if (err) {
			console.log(err);
		} else {
			if (res === true) {
				console.log("Authenticated!");
			}
		}
		
		// Disconnect
		client.terminate();
	});
});