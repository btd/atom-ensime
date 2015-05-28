'use babel';

const path = require('path');
const fs = require('./fs');
const os = require('os');
const temp = require('temp');

const isWin = os.platform === 'win32';
const classpathSeparator = isWin ? ';' : ':';

const BufferedProcess = require('atom').BufferedProcess;

const startupSbtTemplate = require('./sbt-update-template');

const debug = require('./debug');

function delay(timeout, arg) {
  return new Promise((resolve) => {
    let t = setTimeout(() => {
      resolve(arg);
    }, timeout);
  });
}

class EnsimeServer {
  constructor(opts) {
    this.options = opts;
  }

  getClasspath() {
    let that = this;
    return fs.stat(this.options.config.classpathFilePath)
      .then(() => {
        return fs.readFile(this.options.config.classpathFilePath, { encoding: 'utf8' });
      }, () => {
        return that.update();
      });
  }

  makeCacheDir() {
    return fs.mkdirp(this.options.config.cacheDir);
  }

  getPort() {
    return fs.readFile(path.join(this.options.config.cacheDir, 'port'), { encoding: 'utf8' })
      .then((portFile) => {
        return parseInt(portFile, 10);
      });
  }

  start() {
    let that = this;
    if(that.proc) {
      return this.getPort();
    }

    let javaArgs = atom.config.get('atom-ensime.javaArgs');
    let toolsJar = path.join(this.options.config.javaHome, 'lib', 'tools.jar');
    let javaCommand = path.join(this.options.config.javaHome, 'bin', 'java');

    return this.getPort()
    .catch((err) => {// port file does not exists, that is ok
      let classpathPromise = this.getClasspath()
        .then((content) => {
          return toolsJar + classpathSeparator + content;
        });

      let javaCommandArgsPromise = classpathPromise.then((classpath) => {
        return [
          '-classpath', classpath,
          javaArgs || '',
          '-Densime.config=' + that.options.config.path,
          'org.ensime.server.Server'
        ];
      });

      return this.makeCacheDir()
        .then(() => {
          return javaCommandArgsPromise;
        })
        .then((args) => {
          let cmd = isWin ? javaCommand : 'sh';
          let cmdArgs = isWin ? args : ['-c', javaCommand + ' ' + args.join(' ') ];
          return {
            command: cmd,
            args: cmdArgs,
            options: {
              cwd: that.options.rootPath
            },
            stdout: (data) => {
              debug.log('server', data);
            },
            stderr: (data) => {
              debug.warn('server', data);
            },
            exit: () => {
              that.proc = null;
            }
          };
        }).then((processOpts) => {
          this.proc = new BufferedProcess(processOpts);
        }).then(() => {
          return delay(5000)
            .then(() => { return that.getPort(); });//TODO maybe exists better way?
        });
    });
  }

  update() {
    let that = this;
    if(that.updateProc) {
      return Promise.resolve(null);
    }

    let sbtCommand = atom.config.get('atom-ensime.sbtPath');

    let defaultDirectory = temp.path({prefix: 'ensime_update_'});

    let config = this.options.config;

    let buildfilePath = path.join(defaultDirectory, 'build.sbt');
    let buildcontents = startupSbtTemplate(config);
    let buildpropsfilePath = path.join(defaultDirectory, 'project', 'build.properties');

    //creates default dir and project inside
    return fs.mkdirp(path.join(defaultDirectory, 'project'))
      .then(() => {
        return Promise.all([
          fs.writeFile(buildfilePath, buildcontents),
          fs.writeFile(buildpropsfilePath, 'sbt.version=0.13.8\n')
        ]);
      })
      .then(() => {
        that.updateProc = new BufferedProcess({
          command: sbtCommand,
          args: ['-Dsbt.log.noformat=true', 'saveClasspath', 'clean'],
          options: {
            cwd: defaultDirectory,
            env: process.env
          },
          stdout: (data) => {
            debug.log('update', data);
          },
          stderr: (data) => {
            debug.warn('update', data);
          },
          exit: () => {
            that.updateProc = null;
          }
        });
      });
  }

  stop() {
    if(this.proc) {
      this.proc.kill();
    }
  }
}

module.exports = EnsimeServer;
