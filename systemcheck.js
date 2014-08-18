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
    return { status: statusCode, date: new Date(), lastErrors: this.systems[system].errorsBuffer.getBuffer() };
}

function monitorSystem(system, time, fn, errorThresholdMinutes, errorBufferSize) {
    if (this.systems[system]) return;

    this.systems[system] = {};
    this.systems[system].errorsBuffer = createRingBuffer(errorBufferSize || 5);
    this.systems[system]._errorBufferSize = errorBufferSize;
    this.systems[system].errorThresholdMinutes = errorThresholdMinutes || 5;
    this.systems[system].intervalFunction = fn;
    this.systems[system].time = time;
    this.systems[system].status = status.call(this, system, 0)

    var self = this;
    function execute() {
        fn(updateSystemState(self, system));
    }
    execute();
    var systemInterval = setInterval(execute, time);

    this.systems[system].interval = systemInterval;
    if (this.logger) this.logger.debug('SystemCheck started monitoring', system, 'at an interval of', time);
}

function getSystems() {
    return this.systems;
}

function overallStatus() {
    refreshAllComponentStatus.call(this);
    var overallStatus = {};
    var status = 0;
    _.forEach(Object.keys(this.systems), function(system) {
        overallStatus[system] = this.systems[system].status;
        status += this.systems[system].status.status;
    }, this);
    overallStatus.overallStatus = status;
    return overallStatus;
}

function addLogger(logger) {
    this.logger = logger;
}

function updateSystemState(self, system) {
    return function(err, result) {
        var component = self.systems[system];

        if (err) {
            if (self.logger) self.logger.error('systemcheck [', system, ']:', err.stack);
            var error = {
                exception: String(err),
                date: new Date()
            };
            component.errorsBuffer.push(error);
        }

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
