var request = require('request');
var Q = require('q');
var zlib = require('zlib');


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
    var uri = getCodeinePath(this) + 'command-nodes?project='+ projectName;
    console.info('runCommand() - uri is ' + uri);
    var post_data = JSON.stringify(commandObject);
    console.info('runCommand() - post data is ' + post_data);
    request.post(uri, post_data, function(error,response) {
        if (!error && response && response.statusCode == 200) {
            console.log('runCommand() - Command ran successfully');
            deferred.resolve();
        }
        else {
            console.error('runCommand() - ' + error);
            if (response && response.statusCode) {
                console.error('runCommand() - Status Code =  ' + response.statusCode);
            }
            deferred.reject(error);
        }
    });
    return deferred.promise;
};

Codeine.prototype.getProjectNodes = function(projectName, filter) {
    var deferred = Q.defer();
    var uri = getCodeinePath(this) + 'project-nodes?project='+ projectName;
    console.info('getProjectNodes() - uri is ' + uri);
    request({ url : uri, encoding : null }, function (error, response, body) {
        if (!error && response && response.statusCode == 200) {
            zlib.gunzip(body, function(err, decoded) {
                if (err) {
                    console.error('getProjectNodes() - Error during gzip, ' + err);
                    deferred.reject(err);
                }
                else {
                    console.info('getProjectNodes() - project nodes = ' + decoded);
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



module.exports = Codeine;
