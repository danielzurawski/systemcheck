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
    overallStatus: overallStatus,
    passError: passError,
    addLogger: addLogger
});

function status(system, statusCode) {
    return { status: statusCode, lastErrors: this.errorsBuffer.getBuffer(), starting: this.starting };
}

function monitorSystem(system, time, fn, errorThresholdMinutes, errorBufferSize, errorCb) {
    var self = this;

    if (this.systems[system]) { // if static system is overriden clear interval
        this.systems[system].interval && clearInterval(this.systems[system].interval);
    }

    this.systems[system] = new HeartbeatSystem(system, time, fn, errorThresholdMinutes, errorBufferSize, errorCb);
    
    if (errorCb) fn(errorCb);
    else execute();

    this.systems[system].interval = setInterval(execute, time);

    if (this.logger) this.logger.debug('SystemCheck started monitoring', system, 'at an interval of', time);

    function execute() {
        self.systems[system].intervalFunction(updateSystemState(self, system));
    }
}

function getSystems() {
    return this.systems;
}

function overallStatus() {
    refreshAllComponentStatus.call(this);
    var overallStatus = {};
    var status = 0;
    var starting = false;
    _.forEach(Object.keys(this.systems), function(system) {
        overallStatus[system] = this.systems[system].status;
        status += this.systems[system].status.status;
        if (this.systems[system].status.starting) starting=true;
    }, this);
    overallStatus.overallStatus = status;
    overallStatus.anyStarting = starting;
    return overallStatus;
}


function addLogger(logger) {
    this.logger = logger;
}

function isSystemRegistered() {

}

function updateSystemState(system) {
    var self = this;
    return function(err, result) {
        var component = self.systems[system];

        if (! component) {
            var componentMissingError = 'Heartbeat on [ ' + system + ' ] not registered (monitorSystem never callled). Creating a new (non-heartbeat) system.';
            if (self.logger)
                self.logger.error(componentMissingError) 
            else console.log(componentMissingError));

            self.systems[system] = new System(system);
            component = self.system[system];
        }
        
        if (err) {
            if (self.logger) self.logger.error('systemcheck [', system, ']:', err.stack);
            var error = {
                exception: String(err),
                date: new Date()
            };
            component.errorsBuffer.push(error);
        }

        component.starting = false;

        updateStatus.call(component, system);
    };
}

function updateStatus() {
    var self = this;
    var recentErrorCount = 0;
    var errors = self.errorsBuffer.getBuffer();

    _.forEach(errors, function(error) {
        var date = new Date();
        var earlier = date.setMinutes(date.getMinutes() - self.errorThresholdMinutes);
        if (error.date >= earlier) recentErrorCount++;
    });

    self.status = status.call(self, recentErrorCount >= self._errorBufferSiz ? 1 : 0);
}

function refreshAllComponentStatus() {
    var systems = this.getSystems();

    var that = this;
    _.forEach(Object.keys(systems), function(system) {
        updateStatus.call(that, systems[system], system);
    });
}

function passError(system, cb) {
    var self = this;
    return function(err) {
        updateSystemState(self, system)(err);
        if (cb) cb(err);
        else throw err;
    };
}

function createRingBuffer(length) {
    var pointer = 0, buffer = [];

    return {
        getBuffer: function() { return buffer; },
        push: function(item) {
            buffer[pointer] = item;
            pointer = (pointer + 1) % length;
        }
    };
}

function System(name, errorThresholdMinutes, errorBufferSize, errorCb) {
    this.errorsBuffer = createRingBuffer(errorBufferSize || 5);
    this._errorBufferSize = (errorBufferSize || 5);
    this.errorThresholdMinutes = errorThresholdMinutes || 5;
    this.starting = true;
    this.status = status.call(this, -1);
}
function HeartbeatSystem(name, time, fn, errorThresholdMinutes, errorBufferSize, errorCb) {
     System.call(system, errorThresholdMinutes, errorBufferSize, errorCb);
     
     this.intervalFunction = fn;
     this.time = time;

}

HeartbeatSystem.prototype = Object.create(System.prototype);
HeartbeatSystem.prototype.constructor = HeartbeatSystem;

module.exports = new SystemCheck();
