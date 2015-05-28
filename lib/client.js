'use babel';

const net = require('net');
const Promise = require('bluebird');

const SWANK_RPC = Symbol.for(':swank-rpc');
const RETURN = Symbol.for(':return');
const OK = Symbol.for(':ok');

const SEXP = require('./sexp');
const processSExp = require('./sexp-transform');

const CONNECTION_INFO = Symbol.for('swank:connection-info');
const CONNECTION_INFO_SCHEMA = {
  type: 'plist',
  props: {
    ':pid': { type: 'number' },
    ':version': { type: 'string' },
    ':implementation': {
      type: 'plist',
      props: {
        ':name': { type: 'string' }
      }
    }
  }
};

const COMPLETIONS = Symbol.for('swank:completions');
const COMPLETIONS_SCHEMA = {
  type: 'plist',
  props: {
    ':prefix': { type: 'string' },
    ':completions': {
      type: 'list',
      elems: {
        type: 'plist',
        props: {
          ':name': { type: 'string' },
          ':type-sig': { type: 'list', elems: { type: 'string' }},//XXX
          ':type-id': { type: 'number' },
          ':is-callable': { type: 'boolean' },//XXX
          ':relevance': { type: 'number' },
          ':to-insert': { type: 'boolean' }//XXX
        }
      }
    }
  }
};

const TYPECHECK_FILE = Symbol.for('swank:typecheck-file');
const TYPECHECK_ALL = Symbol.for('swank:typecheck-all');

const SHUTDOWN_SERVER = Symbol.for('swank:shutdown-server');

const OK_SCHEMA = {
  type: 'boolean'
};

const debug = require('./debug');

const HEADER_LENGTH = 6;

class Client {
  constructor(port) {
    this.index = 0;
    this.connected = false;
    this.callbacks = {};

    this.port = port;
  }

  _send(payload) {
    if(!this.connected) {
      return Promise.reject(new Error('NOT CONNECTED'));
    }

    return new Promise((resolve, reject) => {
      let index = this.index;
      let msg = SEXP.stringify([SWANK_RPC, payload, this.index++]);
      let length = msg.length.toString(16);
      if(length.length < HEADER_LENGTH) {
        length = new Array(HEADER_LENGTH - length.length + 1).join('0') + length;
      }
      this.callbacks[index] = (err, res) => {
        if(err) {
          return reject(err);
        }

        resolve(res);
      };
      debug.log('client', 'send', length, msg);
      this.connection.write(length + msg);
    });
  }

  _processResponse(buf) {
    debug.log('client', 'receive', buf.toString());
    let length = parseInt(buf.slice(0, HEADER_LENGTH).toString(), 16);
    if(length !== buf.length - HEADER_LENGTH) {
      debug.warn('client', 'received', buf.length, 'expected', length);
    } else {
      let response = SEXP.parse(buf.slice(HEADER_LENGTH).toString());

      if(response.length !== 3
        || response[0] !== RETURN
        || !this.callbacks[response[2]]) {
        throw new Error('Ensime server respond with unknow response');
      }

      let callback = this.callbacks[response[2]];
      delete this.callbacks[response[2]];
      let result = response[1];
      if(result[0] === OK) {
        callback(null, result[1]);
      } else {
        //TODO
      }
    }
  }

  connect() {
    let that = this;
    return new Promise((resolve) => {
      that.connection = net.connect({ port: this.port }, () => {
        that.connected = true;

        debug.log('client', 'connected', that.port);
        resolve();
      });

      that.connection.on('data', (data) => {
        that._processResponse(data);
      });

      that.connection.on('error', (err) => {
        debug.warn('client', err);
      });
    });
  }

  connectionInfo() {
    return this._send([CONNECTION_INFO])
      .then((sexp) => processSExp(sexp, CONNECTION_INFO_SCHEMA));
  }

  completions(opts) {
    return this._send([
      COMPLETIONS,
      [
        Symbol.for(':file'),
        opts.file,
        Symbol.for(':contents'),
        opts.contents
      ],
      opts.offset,
      opts.maxResults,
      opts.caseSensitive,
      opts.reload])
      .then((sexp) => processSExp(sexp, COMPLETIONS_SCHEMA));
  }

  typecheckFile(opts) {
    return this._send([
      TYPECHECK_FILE,
      [
        Symbol.for(':file'),
        opts.file,
        Symbol.for(':contents'),
        opts.contents
      ]])
      .then((sexp) => processSExp(sexp, OK_SCHEMA));
  }

  typecheckAll() {
    return this._send([TYPECHECK_ALL])
      .then((sexp) => processSExp(sexp, OK_SCHEMA));
  }

  shutdownServer() {
    return this._send([SHUTDOWN_SERVER])
      .then((sexp) => processSExp(sexp, OK_SCHEMA));
  }
}

module.exports = Client;
