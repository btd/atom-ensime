'use babel';

function toCamelCase(str) {
  return str.replace(/-([a-z])/g, (_, l) => l.toUpperCase());
}

function processSExp(expr, schema) {
  if(expr == null) {
    return expr;
  }

  if(schema.type === 'plist') {
    let obj = {};
    for(let i = 0; i < expr.length; i += 2) {
      let value = expr[i + 1];
      let key = expr[i];
      let skey = typeof key === 'symbol' ? Symbol.keyFor(key) : key;
      key = toCamelCase(skey.substr(1));
      obj[key] = processSExp(value, schema.props[skey]);
    }
    return obj;
  } else if(schema.type === 'string') {
    return expr;
  } else if(schema.type === 'list') {
    return expr.map(function(ex) {
      return processSExp(ex, schema.elems);
    });
  } else if(schema.type === 'number') {
    return expr;
  }
}



module.exports = processSExp;
