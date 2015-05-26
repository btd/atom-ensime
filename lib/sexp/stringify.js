module.exports = function serialize(el) {
  if(typeof el === 'number') {
    return String(el);
  } else if(typeof el === 'string') {
    return '"' + el.replace(/"/g, '\\"') + '"';
  } else if(typeof el === 'symbol') {
    return Symbol.keyFor(el);
  } else if(typeof el === 'boolean') {
    return el ? 't': 'f';//TODO not sure about false
  } else if(Array.isArray(el)) {
    return '(' + el.map(serialize).join(' ') + ')';
  }
  throw new Error('cannot serialize ' + el);
};
