var codeine = require('./../lib');

var client = new codeine('codeine.intel.com',12347,'82015144-d17b-4bee-96e3-d0f9b97440bb');

client.getProjectNodes('ion-proxy').then(function(data) {
   console.dir(data);
});
