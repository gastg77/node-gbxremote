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
		return new Client(options, isSecure)
	}
	
	// Set the options
	this.port = port;
	if ( typeof host === "string") {
		this.host = host;
	} else {
		if ( typeof host === "function") {
			callback = host;
		}
		
		this.host = 'localhost';
	}

	console.log(this.host, this.port);

	this.isConnected = false;
	this.hasHandshake = false;
	this.reqhandle = 0x80000000;
	this.callbacks = {};

	this.connect(callback);
}
/**
 * Connects to the server
 *
 * @param {Function} callback	- function(error) { ... }
 *   - {Object|null} error    - Any errors when making the call, otherwise null.
 */
Client.prototype.connect = function(callback, timeout) {
	if (this.isConnected)
		return;
	
	var self = this
	  , timeout = timeout || 2000;
	
	this.socket = net.connect(this.port, this.host);
	
	this.socket.on('connect', function() {
		// Timeout for handshake
		setTimeout(function() {
			if (self.isConnected == false) {
				callback(new Error(-32300, 'timeout - handshake timed out'));
				self.socket.end();
			}
		}, timeout);
	});
	
	this.socket.on('error', function(err) {
		console.log(err);
		//callback(new Error(-32300, "transport error - could not open socket (error: $errno, $errstr)"));
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
			callback(new Error(-32300, 'transport error - wrong lowlevel protocol header'));
			return false;
		}
		
		// Handshake
		var handshake = this.hsdata.toString("utf8", 4, 4 + size);
		
		if (handshake == 'GBXRemote 1') {
			self.protocol = 1;
		} else if (handshake == 'GBXRemote 2') {
			self.protocol = 2;
		} else {
			callback(new Error(-32300, 'transport error - wrong lowlevel protocol version'));
			return false;
		}
		
		self.hasHandshake = true;
		self.isConnected = true;
		
		callback();
	}, onData = function(data) {
		if (this.buff == null) {
			this.buff = new Buffer(data.length);
			data.copy(this.buff);
		} else {
			var tmp = new Buffer(this.buff.length + data.length);
			this.buff.copy(tmp);
			data.copy(tmp, this.buff.length);
			this.buff = tmp;
		}
		
		// Need moar buffer to read size
		if (this.buff.length < 4)
			return;
		
		if (this.targetSize == null)
			this.targetSize = this.buff.readUInt32LE(0);
		
		var headerSize = (self.protocol == 1) ? 4 : 8;
		
		// Need moar buffer to read data
		if (this.buff.length < headerSize + this.targetSize)
			return;

		var response = this.buff.toString('utf8', headerSize);
		
		var reqhandle = (self.protocol == 1) ? self.reqhandle : this.buff.readUInt32LE(4);
		
		var deserializer = new Deserializer();
		deserializer.deserializeMethodResponse(response, self.callbacks[reqhandle]);
		
		this.buff = null;
		this.targetSize = null;
	}
	
	
	this.socket.on('data', function(data) {
		if (self.hasHandshake)
			onData(data);
		else
			doHandshake(data);
	});
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
Client.prototype.methodCall = function methodCall(method, params, callback) {
	var xml = Serializer.serializeMethodCall(method, params);
	
	// Check if request is larger than 1024 Kbytes
	if ((size = xml.length) > 1024*1024-8) {
		callback(new Error(-32300, "transport error - request too large (" + size + ")"));
		return false;
	}
	
	this.reqhandle++;
	
	this.callbacks[this.reqhandle] = callback;
	
	var buf;
	if (this.protocol == 1) {
		// $bytes = pack('Va*', strlen($xml), $xml);
		var len = Buffer.byteLength(xml);
		buf = new Buffer(4 + len);
		buf.writeInt32LE(len, 0);
		buf.write(xml, 4);
	} else {
		// $bytes = pack('VVa*', strlen($xml), $this->reqhandle, $xml);
		var len = Buffer.byteLength(xml);
		buf = new Buffer(4 + 4 + len);
		buf.writeInt32LE(len, 0);
		buf.writeUInt32LE(this.reqhandle, 4);
		buf.write(xml, 8);
	}
	
	this.socket.write(buf, 'utf8');
}

module.exports = Client

