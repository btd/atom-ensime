'use babel';

function consoleWrapper(method) {
  return function() {
    let debug = atom.config.get('atom-ensime.debug');
    if(debug) {
      console[method].apply(console, arguments);
    }
  }
}

module.exports.log = consoleWrapper('log');

module.exports.warn = consoleWrapper('warn');
