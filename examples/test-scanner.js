const noble = require('@stoprocent/noble');
const BeaconScanner = require('../lib/scanner.js');

console.log('Creating beacon scanner ...')
const scanner = new BeaconScanner({'noble': noble});
console.log('OK')

console.log('noble state:', noble.state);
noble.on('stateChange', (state) => {
  console.log('state change:', state);
  if (state === "poweredOff"){
    //
  }else if (state === "poweredOn"){
    //
  }
});

// Set an Event handler for becons
scanner.onadvertisement = (ad) => {
  console.log(JSON.stringify(ad, null, '  '));
};

// Start scanning
console.log('Starting scan (waiting for power-on)...')
scanner.startScan().then(() => {
  console.log('Started to scan.')  ;
}).catch((error) => {
  console.error(error);
});

