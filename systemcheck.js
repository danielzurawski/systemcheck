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
    return { status: statusCode, lastErrors: this.systems[system].errorsBuffer.getBuffer(), starting: this.systems[system].starting };
}

function monitorSystem(system, time, fn, errorThresholdMinutes, errorBufferSize, errorCb) {
    var self = this;

    if (this.systems[system]) {
        this.systems[system].interval && clearInterval(this.systems[system].interval);
    }

    this.systems[system] = {};
    this.systems[system].errorsBuffer = createRingBuffer(errorBufferSize || 5);
    this.systems[system]._errorBufferSize = (errorBufferSize || 5);
    this.systems[system].errorThresholdMinutes = errorThresholdMinutes || 5;
    this.systems[system].intervalFunction = fn;
    this.systems[system].time = time;
    this.systems[system].status = status.call(this, system, -1);
    this.systems[system].starting = true;

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
        if (this.systems[system].status.starting)  starting=true;
    }, this);
    overallStatus.overallStatus = status;
    overallStatus.anyStarting = starting;
    return overallStatus;
}


function addLogger(logger) {
    this.logger = logger;
}

function updateSystemState(self, system) {
    return function(err, result) {
        var component = self.systems[system];

        if (err) {
            if (! component) {
                var systemMissingErr = 'Heartbeat on [ ' + system + ' ] not registered (monitorSystem never called). Not recording issues. Err was: '+ err;
                if (self.logger) {
                    self.logger.error(systemMissingErr)
                    return self.logger.error(err.stack);
                } else {
                    console.log(systemMissingErr);
                    return console.log(err.stack);
                }
            }

            var errStr = 'systemcheck [ ' + system + ' ]: ' + err.stack;
            if (self.logger) self.logger.error(errStr);
            else console.log(errStr)

            var error = {
                exception: String(err),
                date: new Date()
            };
            component.errorsBuffer.push(error);
        }

        self.systems[system].starting = false;

        updateStatus.call(self, component, system);
    };
}

function updateStatus(component, system) {
    var recentErrorCount = 0;
    var errors = component.errorsBuffer.getBuffer();

    _.forEach(errors, function(error) {
        var date = new Date();
        var earlier = date.setMinutes(date.getMinutes() - component.errorThresholdMinutes);
        if (error.date >= earlier) recentErrorCount++;
    });

    if (recentErrorCount >= component._errorBufferSize)
        component.status = this.status(system, 1);
    else component.status = this.status(system, 0);
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

module.exports = new SystemCheck();
