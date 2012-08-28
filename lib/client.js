var net          = require('net')
  , Serializer   = require('./serializer')
  , Deserializer = require('./deserializer')
  ;

/**
 * Creates a Client object for making XML-RPC method calls.
 *
 * @constructor
 * @param {Object|String} options - Server options to make the HTTP request to.
 *                                  Either a URI string
 *                                  (e.g. 'http://localhost:9090') or an object
 *                                  with fields:
 *   - {String} host              - (optional)
 *   - {Number} port
 * @param {Boolean} isSecure      - True if using https for making calls,
 *                                  otherwise false.
 * @return {Client}
 */
function Client(port, host, callback) {
	// Invokes with new if called without
	if (false === (this instanceof Client)) {
		return new Client(port, host, callback)
	}
	
	// Set the options
	
	if (typeof host === 'function') {
		callback = host;
		host = 'localhost';
	}
	
	this.host = host || 'localhost';
	this.port = port;
	
	this.isConnected = false;
	this.isReady = false;
	this.reqhandle = 0x80000000;
	this.callbacks = {};
	
	this.connect(callback);
}

// Inherit EventEmitter
Client.prototype = Object.create(require('events').EventEmitter.prototype);

/**
 * Connects to the server
 *
 * @param {Function} callback (optional)	- function(error) { ... }
 *   - {Number} timeout (optional)    - Timeout to connect
 */
Client.prototype.connect = function(callback, timeout) {
	if (this.isConnected)
		return;
	
	var self = this
	  , timeout = typeof timeout === 'number' ? timeout : typeof callback === 'number' ? callback : 2000; // TODO: test
	
	
	// Mess with the callback function so we never have to `if` it later
	// If: no callback given, make an empty function
	// Else: Untested: Only call the callback once.
	//               - E.g. If successfully connected to the server, and later some weird socket error occurs,
	//                 then the callback function will be called twice. Once with success, and once with error.
	//                 Thats what we're trying to prevent... >>> ^^^^^
	if (typeof callback !== 'function') {
		callback = function(){};
	} else {
		// Closure to hide `cb`
		(function() { // TODO: test
			var cb = callback;
			callback = function() {
				// Forward call
				cb.apply(this, arguments);
				
				// If called again, ignore
				callback = function() {};
			}
		})();
	}
	
	// Connect to the server
	this.socket = net.connect(this.port, this.host);
	
	// TODO: Move timeout out of onConnect? (currently timeout is a handshake timeout)
	this.socket.on('connect', function() {
		
		self.isConnected = true;
		
		// Timeout for handshake
		var to = setTimeout(function() {
			var err = new Error('timeout - handshake timed out');
			callback(err);
			self.emit('error', err);
			
			self.terminate();
		}, timeout);
		
		self.on('connect', function() {
			clearTimeout(to);
		});
	});
	
	this.socket.on('error', function(err) {
		self.isConnected = self.isReady = false;
		
		callback(err);
		self.emit('error', err);
	});
	
	var doHandshake = function(data) {
		if (this.hsdata == null) {
			this.hsdata = new Buffer(data.length);
			data.copy(this.hsdata);
		} else {
			var tmp = new Buffer(this.hsdata.length + data.length);
			this.hsdata.copy(tmp);
			data.copy(tmp, this.hsdata.length);
			
			this.hsdata = tmp;
		}
		
		// Need moar buffer
		if (this.hsdata.length <= 4)
			return;
		
		var size = this.hsdata.readUInt32LE(0);
		if (size > 64) {
			var err = new Error('transport error - wrong lowlevel protocol header');
			callback(err);
			self.emit('error', err);
			return false;
		}
		
		// Handshake
		var handshake = this.hsdata.toString('utf8', 4, 4 + size);
		
		if (handshake == 'GBXRemote 1') {
			// We dont support v1
			self.protocol = 1;
			// TODO: Fix error?
			var err = new Error('transport error - wrong lowlevel protocol version');
			callback(err);
			self.emit('error', err);
			return false;
		} else if (handshake == 'GBXRemote 2') {
			self.protocol = 2;
		} else {
			var err = new Error('transport error - wrong lowlevel protocol version');
			callback(err);
			self.emit('error', err);
			return false;
		}
		
		// Handshake successfull
		
		self.isReady = true;
		
		callback();
		self.emit('connect');
	};
	
	var onData = function(data) {
		if (data == null)
			data = new Buffer(0);
		
		if (this.buff == null) {
			this.buff = new Buffer(data.length);
			data.copy(this.buff);
		} else {
			// TODO: Use Buffer.concat()? - requires node v0.8!
			var tmp = new Buffer(this.buff.length + data.length);
			this.buff.copy(tmp);
			data.copy(tmp, this.buff.length);
			this.buff = tmp;
		}
		
		// Need moar buffer to read size
		if (this.buff.length < 4)
			return;
		
		var targetSize = this.buff.readUInt32LE(0);
		
		// headerSize = targetSize + reqhandle = 8
		var headerSize = 8;
		
		// Need moar buffer to read data
		if (this.buff.length < headerSize + targetSize)
			return;
		
		var response = this.buff.toString('utf8', headerSize, headerSize + targetSize);
		
		var reqhandle = this.buff.readUInt32LE(4);
		
		var deserializer = new Deserializer();
		
		// TODO: Use reqhandle to determine if its a response or callback
		// Reponse
		if (self.callbacks.hasOwnProperty(reqhandle)) {
			deserializer.deserializeMethodResponse(response, function(a, b) {
				self.callbacks[reqhandle].apply(this, arguments);
				delete self.callbacks[reqhandle];
			});
		}
		// Callback
		else {
			deserializer.deserializeMethodCall(response, function(err, method, res) {
				if (err) {
					// This should never happen....
					// There is nothing we can do about this one.
					// Its not a response to a request, and its not a valid callback (MethodCall)
					//console.log(err);
					console.warn('Not a response, nor a callback! (reqhandle: 0x%s)', reqhandle.toString(16));
					return;
				} else {
					// its a callback from the server
					self.emit('callback', method, res);
					self.emit(method, res);
				}
			});
		}
		
		// Cut away this message...
		var tmp = new Buffer(this.buff.length - headerSize - targetSize);
		this.buff.copy(tmp, 0, headerSize + targetSize);
		this.buff = tmp;
		
		// ... and fake an onData call if more data left
		if (this.buff.length) {
			process.nextTick(function(){
				onData()
			});
		}
	};
	
	// TODO: Fix the ondata callback, and its functions (kinda messy)
	this.socket.on('data', function(data) {
		// TODO: Do buffering here
		
		if (!self.isReady)
			doHandshake(data);
		else
			onData(data);
	});
};


Client.prototype.terminate = function() {
	if (this.socket) {
		this.socket.end();
		this.isConnected = false;
	}
}

/**
 * Makes an XML-RPC call to the server specified by the constructor's options.
 *
 * @param {String} method     - The method name.
 * @param {Array} params      - Params to send in the call.
 * @param {Function} callback - function(error, value) { ... }
 *   - {Object|null} error    - Any errors when making the call, otherwise null.
 *   - {mixed} value          - The value returned in the method response.
 */
Client.prototype.query = function(method, params, callback) {
	
	if (!this.isReady) {
		// Call again when ready instead of erroring?.. maybe? yes? no?
		/*this.on('connect', function() {
			this.methodCall.apply(this, arguments);
		});*/
		
		callback(new Error('Not connected!'));
		return false;
	}
	
	// An attempt on method overloading
	if (typeof params === 'function') {
		callback = params;
		params = [];
	}
	params = params || [];
	
	// Make sure its an array
	if (typeof params !== 'object')
		params = [params];
	
	// Returns JSON of the xml
	var xml = Serializer.serializeMethodCall(method, params);
	
	// Check if request (xml + header) is larger than 1024 Kbytes (limit of maniaplanet)
	if (xml.length + 8 > 1024*1024) {
		callback(new Error('transport error - request too large (' + xml.length + ')'));
		return false;
	}
	
	this.reqhandle++;
	this.callbacks[this.reqhandle] = (typeof callback === 'function') ? callback : function() {};
	
	// $bytes = pack('VVa*', strlen($xml), $this->reqhandle, $xml);
	var len = Buffer.byteLength(xml);
	var buf = new Buffer(8 + len);
	buf.writeInt32LE(len, 0);
	buf.writeUInt32LE(this.reqhandle, 4);
	buf.write(xml, 8);
	
	this.socket.write(buf, 'utf8');
	
	return true;
};

// DEPRECATED - Function name changed.
Client.prototype.methodCall = Client.prototype.query;

module.exports = Client;

