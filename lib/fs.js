const fs = require('fs');
const temp = require('temp');

const Promise = require('bluebird');


module.exports = {
  readFile: Promise.promisify(fs.readFile),
  writeFile: Promise.promisify(fs.writeFile),
  stat: Promise.promisify(fs.stat),

  tempOpen: Promise.promisify(temp.open),

  mkdirp: Promise.promisify(require('mkdirp'))
};
