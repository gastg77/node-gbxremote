var xmlrpc = require('../lib/xmlrpc.js');

var client = xmlrpc.createClient(5000, '192.168.1.3', function(err) {

	if (err) {
		console.log("error", err);
	} else {
		console.log('connected');
		//return;
		// Sends a method call to the XML-RPC server
		client.methodCall('GetVersion', null, function(error, value) {
			console.log('response');
			if (error) {
				console.log("ERROR", error);
			} else {
				// Results of the method response
				console.log('Method response for "GetVersion": ', value);
			}
		});
	}
});
