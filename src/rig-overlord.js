const Gpio = require('onoff').Gpio;
//const Gpio = require('./test/gpio');
const commandLineArgs = require('command-line-args');
const commandLineUsage = require('command-line-usage');


const optionDefinitions = [
    {name: 'rig', alias: 'r', multiple: true, type: Number, description: 'Rig(s) to reset from 1..8'},
    {name: 'help', alias: 'h', type: Boolean, description: 'Print this usage guide.'},
    {name: 'delay', alias: 'd', type: Number, description: 'Specify for how long to hold the reset in ms.'},
    {name: 'times', alias: 't', type: Number, description: 'How many times should perform the action.'}
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

if(!options.delay) options.delay = 250;
if(!options.times) options.times = 1;
options.rig = options.rig.filter(n => n > 0 && n <= 8);

if (options.rig.length === 0) {
    console.error("Not a valid input! Please specify rigNumber to reset from 1 till 8");
    process.exit(1);
}

if (options.times <= 0) {
    console.error("Not a valid input! Times to perform action should be at least one");
    process.exit(1);
}


console.log(options);

const OPTOCOUPLER_MAP = {
    1: () => new Gpio(4, 'out'),
    2: () => new Gpio(17, 'out'),
    3: () => new Gpio(18, 'out'),
    4: () => new Gpio(27, 'out'),
    5: () => new Gpio(15, 'out'),
    6: () => new Gpio(3, 'out'),
    7: () => new Gpio(14, 'out'),
    8: () => new Gpio(2, 'out')
};


options.rig.forEach(r => {
    let times = options.times;
    let rig = OPTOCOUPLER_MAP[r]();

    function action(times, on) {
        setTimeout(() => {
            if (times > 0) {
                rig.writeSync(on ? 1 : 0);
                action(times - (!on ? 1 : 0), !on)
            } else {
                rig.unexport();
            }
        }, options.delay)
    }

    action(times, false);
});
