var Client = require('./client');

var xmlrpc = exports

/**
 * Creates an XML-RPC client.
 *
 * @param {Number} port
 * @param {String} host
 * @param {Function} callback
 * @return {Client}
 * @see Client
 */
xmlrpc.createClient = function(port, host, callback) {
  return new Client(port, host, callback);
}