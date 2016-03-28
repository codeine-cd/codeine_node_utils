var codeine = require('./../lib');

var client = new codeine('codeine.intel.com',12347,'772c9736-b3d7-485e-97f3-adffc99d7569');

// client.getProjectNodes('Compute_Process_Monitor').then(function(data) {
//    console.dir(data);
// });

var commandObject = {
   command_info : {
      project_name : 'Compute_Process_Monitor',
      name : 'list processes'
   },
   should_execute_on_all_nodes : true
};
client.runCommand('Compute_Process_Monitor', commandObject);
