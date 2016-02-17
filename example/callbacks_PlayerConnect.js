var gbxremote = require('../lib/gbxremote.js');

// Connect to localhost:5000
var client = gbxremote.createClient(5000);

client.on('connect', function () {
	// Before enabling callbacks, make sure you set the latest API.
	client.query('SetApiVersion', ['2012-06-19']);
	client.query('EnableCallbacks', [true]);
});

// ManiaPlanet.PlayerConnect(string Login, bool IsSpectator);
client.on('ManiaPlanet.PlayerConnect', function (params) {
	console.log('%s just joined as a %s', params[0], params[1] ? 'spectator' : 'player');
});

// ManiaPlanet.PlayerDisconnect(string Login);
client.on('ManiaPlanet.PlayerDisconnect', function (params) {
	console.log('%s left the server', params[0]);
});
