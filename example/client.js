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
				
				setTimeout(speedTest, 2000);
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
	
	console.log('Speedtest!!!');
	
	var answers = {};
	commands.forEach(function(method) {
		client.methodCall(method, null, function(error, value) {
			answers[method] = value;
			console.log(method, value);
		});
	});
	
	setTimeout(function() {
		console.log("all answers:", answers);
	}, 2000);
};
