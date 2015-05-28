'use babel';

const _ = require('lodash');

const CompositeDisposable = require('atom').CompositeDisposable;

let subscriptions;

const Server = require('./server');
const Client = require('./client');
const config = require('./config');

let servers = {

};

let clients = {

};


function createServerForPath(path) {
  if(servers[path]) {
    return Promise.resolve(servers[path]);
  }

  return config.readConfigFile(path)
    .then((c) => {
      return new Server({
        rootPath: path,
        config: c
      });
    });
}

function createClientForPathAndPort(path, port) {
  if(clients[path]) {
    return Promise.resolve(clients[path]);
  }

  let client = new Client(port);
  return client.connect()
    .then(() => client);
}


function startClientsIfServersAlreadyRunning() {
  let projectPaths = atom.project.getPaths();
  projectPaths.forEach(function(path) {
    return createServerForPath(path)
      .then((s) => s.getPort())
      .then((port) => createClientForPathAndPort(path, port))
      .then((client) => {
        clients[path] = client;
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

    subscriptions.add(
      atom.commands.add(
        'atom-workspace',
        'atom-ensime:typecheck-all',
        () => plugin.typecheckAll()));

    subscriptions.add(
      atom.commands.add(
        'atom-workspace',
        'atom-ensime:typecheck-buffer',
        () => plugin.typecheckBuffer()));

    startClientsIfServersAlreadyRunning();
  },

  deactivate: () => {
    subscriptions.dispose();
    this.stop();
  },

  update: () => {
    let projectPaths = atom.project.getPaths();
    projectPaths.forEach(function(path) {
      return createServerForPath(path)
        .then((server) => {
          servers[path] = server;
          return servers[path].update();
        });
    });
  },

  start: () => {
    let projectPaths = atom.project.getPaths();
    projectPaths.forEach(function(path) {
      return createServerForPath(path)
        .then((server) => {
          servers[path] = server;
          return servers[path].start();
        })
        .then((port) => {
          return createClientForPathAndPort(path, port);
        })
        .then((client) => {
          clients[path] = client;
        });
    });
  },

  stop: () => {
    let projectPaths = atom.project.getPaths();
    projectPaths.forEach(function(path) {
      if(clients[path]) {
        clients[path].shutdownServer();
      }
      if(servers[path]) {
        servers[path].stop();
      }
    });
  },

  provide: () => {
    return {
      selector: '.source.scala',
      disableForSelector: '.source.scala .comment',

      inclusionPriority: 1,
      excludeLowerPriority: true,

      getSuggestions: (opts) => {
        let editor = opts.editor;
        let filePath = editor.getPath();

        let projectPaths = atom.project.getPaths();

        let projectPath = _.findWhere(projectPaths, (p) => { return filePath.startsWith(p); });
        let client = projectPath && clients[projectPath];
        if(client) {
          let textBuffer = editor.getBuffer();
          return client.completions({
            file: filePath,
            offset: textBuffer.characterIndexForPosition(opts.bufferPosition),
            maxResults: 5,
            caseSensitive: true,
            reload: false,
            contents: textBuffer.getText()
          })
            .then((res) => {
              return (res.completions || []).map((c) => {
                return { text: c.name };
              });
            });
        } else {
          return new Promise((resolve) => resolve([]) );
        }
      }
    };
  },

  typecheckAll: () => {
    let projectPaths = atom.project.getPaths();
    projectPaths.forEach((projectPath) => {
      let client = clients[projectPath];
      if(client) {
        client.typecheckAll();
      }
    });
  },

  typecheckBuffer: () => {
    let editor = atom.workspace.getActiveTextEditor();
    if(!editor) {
      return;
    }

    let scopeDescriptor = editor.getRootScopeDescriptor();
    if(scopeDescriptor.scopes.indexOf('source.scala') < 0) {
      return;
    }

    let filePath = editor.getPath();

    let projectPaths = atom.project.getPaths();

    let projectPath = _.findWhere(projectPaths, (p) => { return filePath.startsWith(p); });
    let client = projectPath && clients[projectPath];
    if(client) {
      let textBuffer = editor.getBuffer();
      client.typecheckFile({
        file: filePath,
        contents: textBuffer.getText()
      });
    }
  }
};

module.exports = plugin;
