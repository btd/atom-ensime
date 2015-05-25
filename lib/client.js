'use babel';

const net = require('net');

const SWANK_RPC = Symbol.for(':swank-rpc');

const SEXP = require('./sexp');

const CONNECTION_INFO = Symbol.for('swank:connection-info');

const debug = require('./debug');

class Client {
  constructor(port) {
    this.index = 0;

    this.port = port;

    this.awaits = {};

    let that = this;
    this.connection = net.connect({ port: port }, () => {
      console.log('client connected');//TODO wrap to promise?


    });

    this.connection.on('data', (data) => {
      console.log(data.toString());
    });

    this.connection.on('error', (err) => {
      debug.warn(err);
    });

    setTimeout(function() {
      that.connectionInfo();
    }, 500);
  }

  _makeMessage(payload) {
    return SEXP.stringify([SWANK_RPC, payload, this.index++]);
  }

  _send(payload, callback) {
    let index = this.index;
    let msg = this._makeMessage(payload);
    let length = msg.length.toString(16);
    if(length.length < 6) {
      length = new Array(6 - length.length + 1).join('0') + length;
    }
    this.awaits[index] = callback;
    debug.log('client', 'send', length, msg);
    this.connection.write(length + msg);
  }

  connectionInfo(callback) {
    this._send([CONNECTION_INFO], callback);
  }
}

module.exports = Client;
