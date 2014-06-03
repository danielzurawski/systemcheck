'use strict';

var _ = require('lodash');

function SystemCheck(logger) {
    this.systems = {};
    this.logger = logger;
}

_.extend(SystemCheck.prototype, {
    status: status,
    monitorSystem: monitorSystem,
    getSystems: getSystems,
    setSystemState: setSystemState,
    passError: passError,
    addLogger: addLogger
});

function status(system, statusCode) {
    return { status: statusCode, date: new Date(), lastErrors: this.systems[system].errorsBuffer.getBuffer() }
}

function monitorSystem(system, time, fn) {
    if (this.systems[system]) return;
    this.systems[system] = {};
    this.systems[system].restartInterval = 0;
    this.systems[system].errorsBuffer = createRingBuffer(3);
    this.systems[system].intervalFunction = fn;
    this.systems[system].time = time;

    var self = this;
    function execute() {
        fn(updateSystemState(self, system)) 
    }
    execute();
    var systemInterval = setInterval(execute, time);

    this.systems[system].interval = systemInterval;
    if (this.logger) this.logger.debug('SystemCheck started monitoring', system, 'at an interval of', time);
}

function updateSystemState(self, system) {
    return function(err, result) {
        if (err) self.systems[system].errorsBuffer.push(String(err));
        self.systems[system].status = self.status(system, (err ? 1 : 0));
    }
}

function getSystems() {
    return this.systems;
}

function setSystemState(system, status, error) {
    if (! this.systems[system]) {
        if (this.logger) this.logger.warn('Tried setting system: ', system, ', state to: ', 1, '. System doesnt exist.');
        return;  
    } 

    clearInterval(this.systems[system].interval);
    clearTimeout(this.systems[system].delay);

    this.systems[system].status = this.status(system, status);

    // On every explicit error notification, increase the restartInterval by 5 minutes
    // this is to avoid the interval simple test overriding the real status code of a system
    this.systems[system].restartInterval = 300000 + this.systems[system].restartInterval;
    if (error) this.systems[system].errorsBuffer.push(String(error));

    var delay = setTimeout(resumeHealthcheck, this.systems[system].restartInterval);
    this.systems[system].delay = delay;

    var self = this;
    function resumeHealthcheck() {
        var newInterval = setInterval(function() {
            self.systems[system].intervalFunction(updateSystemState(self, system))
        }, self.systems[system].time);  

        self.systems[system].interval = newInterval;
    }
}

function addLogger(logger) {
    this.logger = logger;
}

function passError(system, cb) {
    var self = this;
    return function(err) {
        if (err) {
            if (self.logger) self.logger.error(system, 'SystemCheck error', err.stack);
            self.setSystemState(system, 1, err.stack);
        }
        if (cb) cb(err);
        else throw err;
    }
}

function createRingBuffer(length){
    var pointer = 0, buffer = []; 

    return {
        getBuffer: function(){ return buffer; },
        push: function(item){
            buffer[pointer] = item;
            pointer = (pointer +1 ) % length;
        }
    };
};

// Optional logger
module.exports = new SystemCheck();