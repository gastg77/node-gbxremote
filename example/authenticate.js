var gbxremote = require('../lib/gbxremote.js');


var client = gbxremote.createClient(5000, 'localhost', function(err) {
	if (err) {
		// console.log(err);
	} else {
		// run();
	}
});

client.on('error', function(err) {
	console.log(err);
})

.on('connect', function() {
	run();
});


function run() {
	
	// Authenticate(string, string)
	client.methodCall("Authenticate", ["SuperAdmin", "SuperAdmin"], function(err, result) {
		if (err) {
			console.log(err);
		} else {
			if (result === true) {
				console.log("Authenticated!");
				
				// Disconnect
				client.terminate();
			}
		}
	});
}