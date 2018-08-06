module.exports = class Rectangle {

    constructor(pinNum, type) {
        this.pinNum = pinNum;
        this.type = type;

        this.state = 1;
        console.log(`initializing pin ${this.pinNum}`);

    }


    readSync() {
        return this.state;
    }

    writeSync(state) {
        console.log(`setting state [${state}] for pin ${this.pinNum}`);
        this.state = state;
    }
    unexport(){
        console.log(`closing connection for pin ${this.pinNum}`);
    }
};