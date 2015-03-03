var codeine = require('./../lib');

var client = new codeine('codeine.intel.com',12347,'');

client.getProjectNodes('ion-proxy').then(function(data) {
   console.dir(data);
});
