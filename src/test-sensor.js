const RaspiSensors = require('raspi-sensors');
//const Gpio = require('onoff').Gpio;
//const Gpio = require('./test/gpio');
const commandLineArgs = require('command-line-args');
const commandLineUsage = require('command-line-usage');


const optionDefinitions = [
    {name: 'gpio', alias: 'g', multiple: true, type: Number, description: 'GPIO number for input'},
    {name: 'help', alias: 'h', type: Boolean, description: 'Print this usage guide.'}
];
const sections = [
    {
        header: 'Hard Reset/Reboot your pereferial devices',
        content: 'Using Raspberry PI GPIOs and 8-Channel 5V Relay Optocoupler module perform {underline {bold {italic hard reset}}} of your minging rigs :)'
    },
    {
        header: 'Options',
        optionList: optionDefinitions
    }
];

const usage = commandLineUsage(sections);
const options = commandLineArgs(optionDefinitions);

if (options.help) {
    console.log(usage);
    process.exit(0);
}


options.gpio = options.gpio.filter(n => n > 1 && n <= 28);

if (options.gpio.length === 0) {
    console.error("Not a valid input!atleast one GPIO number needed ");
    process.exit(1);
}

console.log(options);

// Create some sensors
let DHT11 = new RaspiSensors.Sensor({
    type : "DHT11",
    pin  : options.gpio[0]
},'GPIO-'+options.gpio[0]);

// Define a callback
let dataLog = function(err, data) {
    if(err) {
        console.error("An error occurred!");
        console.error(err.cause);
        return;
    }

    // Only log for now
    console.log(data);
};

// Try to fetch right now a value
DHT11.fetch(dataLog);

// Fetch some value at a certain interval
DHT11.fetchInterval(dataLog, 4);

// After 20s of logging, stop everything
setTimeout(function() {
    console.log("Time to stop the logging of values!");

    DHT11.fetchClear();
}, 20000);

console.log('Control send back to the main thread');
