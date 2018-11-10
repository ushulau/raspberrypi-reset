//const sensorLib = require("node-dht-sensor");
let sensorLib = {read: ()=>{return {temperature:Math.random()*100.0,humidity: Math.random()*100.0 }}}; // TEST LIB
const elasticsearch = require('elasticsearch');
const MA = require('moving-average');
const MA_TIME_INTERVAL = 5 * 60 * 1000; // 5 minutes
const ma = MA(MA_TIME_INTERVAL);
const Wemo = require('wemo-client');
const wemo = new Wemo();
const args = require('commander');
const MAC_ADDRESS = 'macAddress';
const FRIENDLY_NAME = 'friendlyName';
const SERIAL_NUMBER = 'serialNumber';


/*let sensors = [];
for(let i =1; i<= 28; i++){
    sensors.push( {
        name: "Indoor"+i,
        type: 11,
        pin: i
    })
}*/



const client = new elasticsearch.Client({
    host: '192.168.1.101:39200',
    log: 'info'
});



args
    .version('0.1.0')
    .usage('[options]')
    .option('-f, --friendlyName <fireandly-name>', 'define device friendly name nothing is defined no switching will be performed')
    .option('-m, --macAddress <device-mac-address>', 'define device mac address that you want to use' )
    .option('-s, --serialNumber <device-serial-number>', 'define device serial number that you want to use')
    .option('-c, --collectionName <es-collection-name>','elasticsearch collection name to presist data')
    .option('-l, --low <low>', 'when switch off the vent', parseFloat)
    .option('-h, --high <high>', 'define device serial number that you want to use', parseFloat)
    .option('-i, --sampleInterval <sample-interval>', 'interval how often time samples and switch check will be performed')
    /*
    .option('-c, --cheese [type]', 'Add the specified type of cheese [marble]', 'marble')*/
    .parse(process.argv);

let deviceIdentifier;
let fieldName;


if(!args.sampleInterval){
    args.sampleInterval = 1000;
}

if(!args.collectionName){
    args.collectionName = 'rig-metrics';
}

if(args.serialNumber){
deviceIdentifier = args.serialNumber;
fieldName = SERIAL_NUMBER;
}else if(args.macAddress){
    deviceIdentifier = args.macAddress;
    fieldName = MAC_ADDRESS;
}else if(args.friendlyName){
    deviceIdentifier = args.friendlyName;
    fieldName = FRIENDLY_NAME;
}

function discover(deviceIdentifier, fieldName){
    return new Promise((resolve, reject) => {
        let found = false;
        let timeout = setTimeout(() => {
            if(!found){
                let msg = `Can not locate [${deviceIdentifier}] device`;
                console.error(msg);
                reject(msg)
            }

        }, 4000);
        wemo.discover(function (err, deviceInfo) {
            if(err){
                console.error(err);
            }
            console.log('Wemo Device Found: %j', deviceInfo);
            if (deviceInfo && deviceInfo[fieldName].toLowerCase().trim() === deviceIdentifier.toLowerCase().trim()) {
                found = true;
                clearTimeout(timeout);
                // Get the client for the found device
                let client = wemo.client(deviceInfo);

                // You definitely want to listen to error events (e.g. device went offline),
                // Node will throw them as an exception if they are left unhandled
                client.on('error', function (err) {
                    console.log('Error: %s', err.code);
                });

                // Handle BinaryState events
                client.on('binaryState', function (value) {
                    console.log(`Binary State of [${fieldName}: ${deviceIdentifier}] changed to: ${value}`);
                });


                resolve(client, deviceInfo);

            }
        });
    });
}


let devInfo;
let wemoClient;

let getState = function(){
    return new Promise(resolve => {
        if(wemoClient){
            wemoClient.getBinaryState((err,st) =>{
                if(err){
                 console.error(err);
                 resolve(undefined);
                }else {
                    resolve(parseInt(st));
                }
            })
        }else{
            resolve(undefined);
        }

    })
};

if(deviceIdentifier){
  discover(deviceIdentifier, fieldName).then((client, deviceInfo)=>{
      wemoClient = client;
      devInfo = deviceInfo;
      console.log(deviceInfo);
  }).catch(error =>{
      console.error(`quiting...`);
      process.exit(1);
  })
}



const sensor = {
    sensors: [ {
        name: "bottom_22",
        type: 22,
        pin: 22
    }, {
        name: "top_10",
        type: 22,
        pin: 10
    }],
    read: function() {
        try {
            for (let a in this.sensors) {
                let b = sensorLib.read(this.sensors[a].type, this.sensors[a].pin);
                ma.push(Date.now(), b.temperature);
                console.log(this.sensors[a].name + ": " +
                    b.temperature.toFixed(2) + "°C, " +
                    b.humidity.toFixed(2) + "%. Average Temperature for last five minutes " +
                    ma.movingAverage().toFixed(2) + "°C "
                );

                client.bulk({
                    body: [
                        // action description
                        {index: {_index: args.collectionName, _type: '_doc'}},
                        // the document to index
                        {ts: new Date().getTime(), timestamp: new Date(), temperature: b.temperature, humidity: b.humidity, sensor: a.name},

                    ]
                }, function (err, resp) {

                    if (err) console.error(err);
                    //console.log(resp);
                });


            }
            let mAvg = ma.movingAverage();
            console.log(`moving average -> ${mAvg}`);
            if(args.low && args.high){
                getState().then(binaryState=>{

                    if(binaryState !== undefined){
                        if(binaryState && mAvg <= args.low){
                            console.info(`===========================-->>> need to switch OFF current temp => ${mAvg.toFixed(2)}°C`);

                        }

                        if(binaryState === 0 && mAvg >= args.high){
                            console.info(`===========================-->>> need to switch ON current temp => ${mAvg.toFixed(2)}°C`);

                        }


                    }

                })


            }






        }catch(ex){
            console.error('exception caught', ex);
        }
        setTimeout(function() {
            sensor.read();
        }, args.sampleInterval);
    }
};

sensor.read();



