var xmlrpc = require('../lib/xmlrpc.js');


var client = xmlrpc.createClient(5000, '192.168.1.3', function(err) {
	if (err) {
		console.log(err);
	} else {
		run();
	}
});

client.on('error', function(err) {
	console.log(err);
})

.on('connect', function() {
	console.log("EVENT: connect")
});


function run() {
	
	// Authenticate(string, string)
	client.methodCall("Authenticate", ["SuperAdmin", "SuperAdmin"], function(err, result) {
		if (err) {
			console.log(err);
		} else {
			if (result === true) {
				console.log("Authenticated!");
			}
		}
	});
}