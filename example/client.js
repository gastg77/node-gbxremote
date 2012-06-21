var xmlrpc = require('../lib/xmlrpc.js');

var client = xmlrpc.createClient(5000, '192.168.1.3', function(err) {

	if (err) {
		console.log("error", err);
	} else {
		console.log('connected');
		
		
		// Sends a method call to the XML-RPC server
		client.methodCall('GetVersion', null, function(error, value) {
			console.log('response');
			if (error) {
				console.log("ERROR", error);
			} else {
				// Results of the method response
				console.log('Method response for "GetVersion": ', value);
				
				// Go crazy!
				for (var i = 0; i < 200; i++)
					setTimeout(speedTest, 1000 + i*10);
			}
		});
	}
});




var speedTest = function() {
	var commands = [
		'GetVersion',
		'GetCurrentCallVote',
		'GetCallVoteTimeOut',
		'GetCallVoteRatio',
		'GetCallVoteRatios',
		'GetChatLines',
		'GetManialinkPageAnswers',
		'GetServerCoppers',
		'GetSystemInfo',
		'GetServerName',
		'GetServerComment'
	];
	
	var start = +new Date();
	
	var answers = {};
	commands.forEach(function(method) {
		client.methodCall(method, null, function(error, value) {
			answers[method] = value;
			
			if (Object.keys(answers).length == commands.length) {
				console.log('Got all (%d) answers - Took %dms', commands.length, +new Date() - start);
			}
		});
	});
};
