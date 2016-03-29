var codeine = require('./../lib');
var fs = require('fs');

var client = new codeine('codeine.intel.com',12377,'');

// client.getProjectNodes('Compute_Process_Monitor').then(function(data) {
//    console.dir(data);
// });

// var commandObject = {
//    command_info : {
//       project_name : 'Compute_Process_Monitor',
//       name : 'list processes'
//    },
//    should_execute_on_all_nodes : true
// };
// client.runCommand('Compute_Process_Monitor', commandObject);

var out = fs.createWriteStream('out.txt');


client.getCommandStatus('Compute_Process_Monitor', 1, false)
    .on('error', function(err) {
        console.error('getCommandStatus() - Error on server', err);
    })
    .on('response', function(response) {
        if (response.statusCode === 200) {

        }
        else {
            console.error('getCommandStatus() - Status Code =  ' + response.statusCode);
        }
    })
    .pipe(out);
