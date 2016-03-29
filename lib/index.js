'use strict';

var http = require('http');
var request = require('request');
var Q = require('q');
var zlib = require('zlib');

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

Codeine.prototype.runCommand = function(projectName, commandObject){
    var deferred = Q.defer();
    var runCommandOptions = createCodeineRunCommand(this.server,projectName,this.api_key);
    console.error('runCommand() - command object ', runCommandOptions);
    var post_data = JSON.stringify(commandObject);
    console.error('runCommand() - post data is ' + post_data);
    var commandReq = http.request(runCommandOptions, function(res) {
        res.setEncoding('utf8');

        if (res.statusCode === 200) {
            console.error('runCommand() - Command ran successfully');
        }
        else {
            console.error('runCommand() - Status Code =  ' + res.statusCode);
            deferred.reject(error);
        }
        res.on('data', function (chunk) {
            console.error('Response: ', chunk);
            deferred.resolve(chunk);
        });
    });
    commandReq.write(post_data);
    commandReq.on('error', function(e) {
        console.error('runCommand() - Error from server', e);
        deferred.reject(e);
    });
    commandReq.end();
    return deferred.promise;
};

Codeine.prototype.getProjectNodes = function(projectName, filter) {
    var deferred = Q.defer();
    var uri = getCodeinePath(this) + 'project-nodes?project='+ projectName;
    console.error('getProjectNodes() - uri is ' + uri);
    request({ url : uri, encoding : null }, function (error, response, body) {
        if (!error && response && response.statusCode == 200) {
            zlib.gunzip(body, function(err, decoded) {
                if (err) {
                    console.error('getProjectNodes() - Error during gzip, ' + err);
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
            console.error('getProjectNodes() - ' + error);
            if (response && response.statusCode) {
                console.error('getProjectNodes() - Status Code =  ' + response.statusCode);
            }
            deferred.reject(error);
        }
    });
    return deferred.promise;
};

Codeine.prototype.getProjectConfiguration = function(projectName) {
    var deferred = Q.defer();
    var uri = getCodeinePath(this) + 'project-configuration?project='+ projectName;
    console.error('getProjectConfiguration() - uri is ' + uri);
    request({ url : uri, encoding : null }, function (error, response, body) {
        if (!error && response && response.statusCode == 200) {
            var config = JSON.parse(body);
            deferred.resolve(config);
        }
        else {
            console.error('getProjectConfiguration() - ' + error);
            if (response && response.statusCode) {
                console.error('getProjectConfiguration() - Status Code =  ' + response.statusCode);
            }
            deferred.reject(error);
        }
    });
    return deferred.promise;
};

Codeine.prototype.getCommandStatus = function(projectName, commandId, includeOutput) {
    var uri = getCodeinePath(this) + 'command-status?command=' + commandId + '&project='+ projectName;
    if (includeOutput !== undefined && includeOutput === false) {
        uri += '&output=false';
    }
    console.error('getCommandStatus() - uri is ' + uri);
    return request({ url : uri, encoding : null }).pipe(zlib.createGunzip());
};

Codeine.prototype.getCommandOutput = function(projectName, commandId) {
    var uri = getCodeinePath(this) + 'command-output?command-id=' + commandId + '&project='+ projectName;
    console.error('getCommandOutput() - uri is ' + uri);
    return request({ url : uri, encoding : null });
};

function createCodeineRunCommand(server,project,api_token) {
    return {
        hostname: server,
        headers  : {'api_token' : api_token} ,
        port: 12347,
        path: '/api-with-token/command-nodes?project=' + project,
        method: 'POST'
    };
}
