'use strict';

var http = require('http');
var Request = require('request');
var Q = require('q');
var zlib = require('zlib');
var busywait = require('busywait').async;
var _ = require('underscore');

var debug = false;

module.exports = Codeine;

function Codeine(server,port,api_key) {
  this.server = server;
  this.api_key = api_key;
  this.port = port;
  this.request = Request.defaults({'headers': { 'api_token' : this.api_key} });
}

function getCodeinePath(self) {
  return 'http://' + self.server + ':' + self.port + '/api-with-token/';
}

Codeine.prototype.setDebug = function(val) {
  debug = val;
};

Codeine.prototype.getProjects = function() {
  var deferred = Q.defer();
  var uri = getCodeinePath(this) + 'projects';
  log('getProjects() - uri is ' + uri);
  this.request({ url : uri, encoding : null }, function (error, response, body) {
    if (!error && response && response.statusCode === 200) {
      var projects = JSON.parse(body);
      deferred.resolve(projects);
    }
    else {
      log('getProjects() - Error is', error);
      if (response && response.statusCode) {
        console.error('codeine:: getProjects() - Status Code =  ' + response.statusCode);
      }
      deferred.reject(error);
    }
  });
  return deferred.promise;
};

Codeine.prototype.createNewProject = function(projectName, selectedProject) {
  var deferred = Q.defer();
  var uri = getCodeinePath(this) + 'projects';
  log('createNewProject() - uri is ' + uri);
  this.request(createNewProjectCommand(uri,this.api_key,projectName,selectedProject), function (error, response, body) {
    if (!error && response && response.statusCode === 200) {
      deferred.resolve(body);
    }
    else {
      log('createNewProject() - Error is', error);
      if (response && response.statusCode) {
        console.error('codeine:: createNewProject() - Status Code =  ' + response.statusCode);
      }
      deferred.reject(error);
    }
  });
  return deferred.promise;
};

Codeine.prototype.runCommand = function(projectName, commandObject){
  var deferred = Q.defer();
  var runCommandOptions = createCodeineRunCommand(this.server,projectName,this.api_key, this.port);
  log('runCommand() - command object ', runCommandOptions);
  var post_data = JSON.stringify(commandObject);
  log('runCommand() - post data is ' + post_data);
  var commandReq = http.request(runCommandOptions, function(res) {
    res.setEncoding('utf8');

    if (res.statusCode === 200) {
      log('runCommand() - Command ran successfully');
    }
    else {
      console.error('codeine:: runCommand() - Status Code =  ' + res.statusCode);
      deferred.reject();
    }
    res.on('data', function (chunk) {
      log('Response: ', chunk);
      deferred.resolve(chunk);
    });
  });
  commandReq.write(post_data);
  commandReq.on('error', function(e) {
    console.error('codeine:: runCommand() - Error from server', e);
    deferred.reject(e);
  });
  commandReq.end();
  return deferred.promise;
};

Codeine.prototype.runCommandSync = function (projectName, commandObject, sleep, times, disableOutput) {
  var scope = this;
  log('runCommandSync() - Running command', commandObject.command_info.name);
  return this.runCommand(projectName, commandObject)
      .then(function (commandId) {
        log('runCommandSync() - Waiting for command', commandId, 'to finish');
        function check(iteration) {
          log('runCommandSync() - waiting for command', commandId, 'to finish.' +
              ' Iteration:', iteration);
          return scope.getCommandStatusJson(projectName, commandId, !!disableOutput)
              .then(function (res) {
                var skip_list = res.skip_list || [];
                var processedNodes = res.fail_list.length + res.success_list.length + skip_list.length;
                  if (res.finished && processedNodes === res.nodes_list.length) {
                      var failedNodes = _.map(res.fail_list.concat(skip_list), function (node) {
                          return node.name;
                      });
                      return {
                          failedNodes: failedNodes,
                          output: res.output
                      }
                  } else {
                      return Q.reject('not finished yet');
                  }
              });
        }
        return busywait(check, {sleepTime: sleep,maxChecks: times,
            failMsg: 'Command is not complete after timeout'})
            .then(function (result) {
              var failedNodes = result.result.failedNodes;
              if (failedNodes.length > 0) {
                return Q.reject(result.result);
              }
              log('runCommandSync() - Command', commandId, 'finished successfully');
              return result.result.output;
            });
      });
};

Codeine.prototype.getProjectNodes = function(projectName, filter) {
  var deferred = Q.defer();
  var uri = getCodeinePath(this) + 'project-nodes?project='+ projectName;
  log('getProjectNodes() - uri is ' + uri);
  this.request({ url : uri, encoding : null }, function (error, response, body) {
    if (!error && response && response.statusCode === 200) {
      zlib.gunzip(body, function(err, decoded) {
        if (err) {
          console.error('codeine:: getProjectNodes() - Error during gzip', err);
          deferred.reject(err);
        }
        else {
          var projectNodes = JSON.parse(decoded);
          if (filter) {
            projectNodes = _.filter(projectNodes, function(node) { return filter(node);});
          }
          deferred.resolve(projectNodes);
        }
      });
    }
    else {
      log('getProjectNodes() - Error is', error);
      if (response && response.statusCode) {
        console.error('codeine:: getProjectNodes() - Status Code =  ' + response.statusCode);
      }
      deferred.reject(error);
    }
  });
  return deferred.promise;
};

Codeine.prototype.getProjectConfiguration = function(projectName) {
  var deferred = Q.defer();
  var uri = getCodeinePath(this) + 'project-configuration?project='+ projectName;
  log('getProjectConfiguration() - uri is ' + uri);
  this.request({ url : uri, encoding : null }, function (error, response, body) {
    if (!error && response && response.statusCode === 200) {
      var config = JSON.parse(body);
      deferred.resolve(config);
    }
    else {
      log('getProjectConfiguration() - Error is', error);
      if (response && response.statusCode) {
        console.error('codeine:: getProjectConfiguration() - Status Code =  ' + response.statusCode);
      }
      deferred.reject(error);
    }
  });
  return deferred.promise;
};

Codeine.prototype.getProjectCommandsConfiguration = function(projectName) {
  var deferred = Q.defer();
  var uri = getCodeinePath(this) + 'project-commands-configuration?project='+ projectName;
  log('getProjectCommandsConfiguration() - uri is ' + uri);
  this.request({ url : uri, encoding : null }, function (error, response, body) {
    if (!error && response && response.statusCode === 200) {
      var config = JSON.parse(body);
      deferred.resolve(config);
    }
    else {
      log('getProjectCommandsConfiguration() - Error is', error);
      if (response && response.statusCode) {
        console.error('codeine:: getProjectCommandsConfiguration() - Status Code =  ' + response.statusCode);
      }
      deferred.reject(error);
    }
  });
  return deferred.promise;
};

Codeine.prototype.getProjectStatus = function(projectName) {
  var deferred = Q.defer();
  var uri = getCodeinePath(this) + 'project-status2?project='+ projectName;
  log('getProjectStatus() - uri is ' + uri);
  this.request({ url : uri, encoding : null }, function (error, response, body) {
    if (!error && response && response.statusCode === 200) {
      var config = JSON.parse(body);
      deferred.resolve(config);
    }
    else {
      log('getProjectStatus() - Error is', error);
      if (response && response.statusCode) {
        console.error('codeine:: getProjectStatus() - Status Code =  ' + response.statusCode);
      }
      deferred.reject(error);
    }
  });
  return deferred.promise;
};

Codeine.prototype.saveProjectConfiguration = function(projectName, conf) {
  var deferred = Q.defer();
  var saveConfCommandOptions = createSaveConfCommand(this.server, projectName, this.api_key, this.port);
  var post_data = JSON.stringify(conf);
  log('saveProjectConfiguration() - post data is ', post_data);
  var commandReq = http.request(saveConfCommandOptions, function(res) {
    res.setEncoding('utf8');
    if (res.statusCode === 200) {
      log('saveProjectConfiguration() - Configuration was saved successfully');
    }
    else {
      console.error('coeine:: saveProjectConfiguration() - Status Code =  ' + res.statusCode);
      deferred.reject();
    }
    res.on('data', function (chunk) {
      log('Response: ', chunk);
      deferred.resolve(chunk);
    });
  });
  commandReq.write(post_data);
  commandReq.on('error', function(e) {
    console.error('codeine:: saveProjectConfiguration() - Error from server', e);
    deferred.reject(e);
  });
  commandReq.end();
  return deferred.promise;
};

Codeine.prototype.getCommandStatus = function(projectName, commandId, includeOutput) {
  var uri = getCodeinePath(this) + 'command-status?command=' + commandId + '&project='+ projectName;
  if (includeOutput !== undefined && includeOutput === false) {
    uri += '&output=false';
  }
  log('getCommandStatus() - uri is ' + uri);
  return this.request({ url : uri, encoding : null }).pipe(zlib.createGunzip());
};

Codeine.prototype.getCommandStatusJson = function(projectName, commandId, includeOutput) {
  var deferred = Q.defer();
  var stream = this.getCommandStatus(projectName,commandId,includeOutput);
  var chunks = [];
  stream.on("data", function (chunk) {
    chunks.push(chunk);
  });
  stream.on("end", function () {
    deferred.resolve(JSON.parse(Buffer.concat(chunks).toString()));
  });
  stream.on("error", function (err) {
    deferred.reject(err);
  });
  return deferred.promise;
};

Codeine.prototype.getCommandOutput = function(projectName, commandId) {
  var uri = getCodeinePath(this) + 'command-output?command-id=' + commandId + '&project='+ projectName;
  log('getCommandOutput() - uri is ' + uri);
  return this.request({ url : uri, encoding : null });
};

function createNewProjectCommand(url,api_token,projectName,selectedProject) {
  var requestData = {
    'project_name': projectName,
    'type': 'New'
  };
  if (selectedProject) {
    requestData.type = 'Copy';
    requestData.selected_project = selectedProject;
  }
  return {
    url: url,
    encoding: null,
    headers  : {
      'api_token' : api_token
    },
    method: 'POST',
    body: JSON.stringify(requestData)
  };
}

function createSaveConfCommand(server,project,api_token,port) {
  return {
    hostname: server,
    headers  : {'api_token' : api_token} ,
    port: port,
    path: '/api-with-token/project-configuration?project=' + project,
    method: 'PUT'
  };
}

function createCodeineRunCommand(server,project,api_token,port) {
  return {
    hostname: server,
    headers  : {'api_token' : api_token} ,
    port: port,
    path: '/api-with-token/command-nodes?project=' + project,
    method: 'POST'
  };
}

function log() {
  if (debug) {
    console.log.apply(undefined,arguments);
  }
}
