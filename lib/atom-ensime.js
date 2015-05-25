'use babel';

const CompositeDisposable = require('atom').CompositeDisposable;

let subscriptions;

const Server = require('./server');
const Client = require('./client');
const config = require('./config');

let servers = {

};

let clients = {

};

function createServers() {
  let projectPaths = atom.project.getPaths();
  projectPaths.forEach(function(path) {
    if(servers[path]) {
      return Promise.resolve(null);
    }

    return config.readConfigFile(path)
      .then((c) => {
        servers[path] = new Server({
          rootPath: path,
          config: c
        });
      })
      .catch(() => {
        //TODO pass ok as not found
      });
  });
}

var plugin = {
  config: {
    sbtPath: {
      'default': 'sbt',
      title: 'SBT executable path',
      type: 'string'
    },
    debug: {
      'default': false,
      title: 'Output additional debug information',
      type: 'boolean'
    }
  },

  activate: () => {
    subscriptions = new CompositeDisposable();

    subscriptions.add(
      atom.commands.add(
        'atom-workspace',
        'atom-ensime:update',
        () => plugin.update()));

    subscriptions.add(
      atom.commands.add(
        'atom-workspace',
        'atom-ensime:start',
        () => plugin.start()));

    subscriptions.add(
      atom.commands.add(
        'atom-workspace',
        'atom-ensime:stop',
        () => plugin.stop()));


  },

  deactivate: () => {
    subscriptions.dispose();
    this.stop();
  },

  update: () => {
    createServers();
    let projectPaths = atom.project.getPaths();
    projectPaths.forEach(function(path) {
      if(servers[path]) {
        servers[path].update();
      }
    });
  },

  start: () => {
    createServers();
    let projectPaths = atom.project.getPaths();
    projectPaths.forEach(function(path) {
      if(servers[path]) {
        servers[path].start()
          .then((port) => {
            //TODO do not create clients twice
            clients[port] = new Client(port);
          });
      }
    });
  },

  stop: () => {
    let projectPaths = atom.project.getPaths();
    projectPaths.forEach(function(path) {
      if(servers[path]) {
        servers[path].stop();
      }
    });
  }
};

module.exports = plugin;
