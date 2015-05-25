const parse = require('./parse').parse;

module.exports = {
  parse: function(str) {
    return parse(str)[0];
  },
  stringify: require('./stringify')
};
