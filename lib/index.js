'use strict';

var http = require('http');
var request = require('request');
var Q = require('q');
var zlib = require('zlib');

var debug = false;

module.exports = Codeine;

function Codeine(server,port,api_key) {
    this.server = server;
    this.api_key = api_key;
    this.port = port;
    request = request.defaults({'headers': { 'api_token' : this.api_key} });
}


function getCodeinePath(self) {
    return 'http://' + self.server + ':' + self.port + '/api-with-token/';
}

Codeine.prototype.setDebug = function(val) {
    debug = val;
}

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

Codeine.prototype.getProjectNodes = function(projectName, filter) {
    var deferred = Q.defer();
    var uri = getCodeinePath(this) + 'project-nodes?project='+ projectName;
    log('getProjectNodes() - uri is ' + uri);
    request({ url : uri, encoding : null }, function (error, response, body) {
        if (!error && response && response.statusCode == 200) {
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
    request({ url : uri, encoding : null }, function (error, response, body) {
        if (!error && response && response.statusCode == 200) {
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
    return request({ url : uri, encoding : null }).pipe(zlib.createGunzip());
};

Codeine.prototype.getCommandOutput = function(projectName, commandId) {
    var uri = getCodeinePath(this) + 'command-output?command-id=' + commandId + '&project='+ projectName;
    log('getCommandOutput() - uri is ' + uri);
    return request({ url : uri, encoding : null });
};

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

function log(msg, obj) {
  if (debug) {
    console.log(msg, obj);
  }
}
