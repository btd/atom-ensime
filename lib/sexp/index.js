const parse = require('./parse').parse;

module.exports = {
  parse: function(str) {
    return parse(str);
  },
  stringify: require('./stringify')
};
