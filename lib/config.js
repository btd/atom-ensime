'use babel';

const SEXP = require('./sexp');

const fs = require('./fs');
const path = require('path');

const ensimeConfigFileName = '.ensime';

const processSExp = require('./sexp-transform');

/**
 * Returns a list of all directories mentioned in :source-roots directives.
 * @param {Object} config

function getAllSourceRoots(config) {
  let subprojects = get(config, 'subprojects');
  let result = subprojects.reduce((acc, sub) => {
    acc.push.apply(result, sub['source-roots']);
    return acc;
  }, []);
  return _.flatten(result);
}
*/

const configSchema = {
  type: 'plist',
  props: {
    ':root-dir': { type: 'string' },
    ':cache-dir': { type: 'string' },
    ':name': { type: 'string' },
    ':java-home': { type: 'string' },
    ':java-flags': { type: 'list', elems: { type: 'string' } },
    ':reference-source-roots': { type: 'list', elems: { type: 'string' } },
    ':scala-version': { type: 'string' },
    ':compiler-args': { type: 'list', elems: { type: 'string' } },
    ':subprojects': {
      type: 'list',
      elems: {
        type: 'plist',
        props: {
          ':name': { type: 'string' },
          ':module-name': { type: 'string' },
          ':source-roots': { type: 'list', elems: { type: 'string' } },
          ':target': { type: 'string' },
          ':test-targets': { type: 'list', elems: { type: 'string' } },
          ':depends-on-modules': { type: 'list', elems: { type: 'string' } },
          ':compile-deps': { type: 'list', elems: { type: 'string' } },
          ':runtime-deps': { type: 'list', elems: { type: 'string' } },
          ':test-deps': { type: 'list', elems: { type: 'string' } },
          ':doc-jars': { type: 'list', elems: { type: 'string' } },
          ':reference-source-roots': { type: 'list', elems: { type: 'string' } }
        }
      }
    }
  }
};


function parseEnsimeConfig(str) {
  let expr = SEXP.parse(str);
  if(expr instanceof Error) {
    //TODO
  }

  //process s-expressions
  return processSExp(expr, configSchema);
}

module.exports.parseEnsimeConfig = parseEnsimeConfig;

const ensimeServerVersion = '0.9.10-SNAPSHOT';

function classpathFilePath(opts) {
  return path.join(__dirname, '..', 'classpaths', 'classpath_' + opts.scalaVersion + '_' + opts.ensimeServerVersion);
}

module.exports.readConfigFile = function(p) {
  p = path.join(p, ensimeConfigFileName);
  return fs.readFile(p, { encoding: 'utf8' })
    .then(parseEnsimeConfig)
    .then((config) => {
      config.ensimeServerVersion = ensimeServerVersion;
      config.classpathFilePath = classpathFilePath(config);
      config.path = p;
      return config;
    });
};
