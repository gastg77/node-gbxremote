var xmlrpc = require('../lib/xmlrpc.js');


var client = xmlrpc.createClient(5000, '192.168.1.3', function(err) {
	if (err) {
		// console.log(err);
	} else {
		// run();
	}
});

client

// Socket error, or error during handshake
.on('error', function(err) {
	console.log(err);
})

// When connected and ready for method calls
.on('connect', function() {
	run();
})

// Listen to all callbacks
.on('callback', function(method, data) {
	if (method != 'TrackMania.StatusChanged')
		console.log("Callback from server: %s - %d params", method, data.length);
})

// Listen to a specific callback
.on('TrackMania.StatusChanged', function(data) {
	console.log("The status just changed! (%d: %s)", data[0], data[1]);
});


function run() {
	console.log('Enabling callbacks...');
	client.methodCall("EnableCallbacks", [true], function(err, res) {
		if (res === true) {
			console.log("...callbacks enabled");
		}
	});
	
	console.log('Authenticating...');
	client.methodCall('Authenticate', ['SuperAdmin', 'SuperAdmin'], function(err, res) {
		if (err) {
			console.log('Authenticate error: ', err);
		} else if (res === true) {
			console.log('...authenticated');
			console.log('Nexting map!');
			
			client.methodCall('NextMap');
		}
	});
}