var assert = require('assert')
  , SystemCheck = require('../systemcheck');

function monitorCheck(cb) {
    cb(null, 'all good');
}

describe('systemcheck tests', function() {
    it('should add two component to system and they should be setup', function() {
        SystemCheck.monitorSystem('test', 10000, monitorCheck);
        SystemCheck.monitorSystem('nyan', 10, monitorCheck, 5, 2);

        var systems = SystemCheck.getSystems();

        assert.equal(Object.keys(systems).length, 2);
    });

    it('should check that all components are in healthy status', function() {
        var systems = SystemCheck.getSystems()
          , test = systems['test']
          , nyan = systems['nyan'];
        
        assert.equal(test.status.status, 0);
        assert.equal(nyan.status.status, 0);
    });

    it('should try to manually pass error', function() {
        try { SystemCheck.passError('nyan')(new Error('testing')); } catch(e) {}
        var systems = SystemCheck.getSystems();

        assert.equal(systems['nyan'].errorsBuffer.getBuffer()[0].exception, 'Error: testing');
        assert.equal(systems['nyan'].status.status, 0);
    });

    it('should reach the buffer size, hence turn status of that system to 1', function() {
        try { SystemCheck.passError('nyan')(new Error('testing2')); } catch(e) {}

        var systems = SystemCheck.getSystems()
        assert.equal(systems['nyan'].status.status, 1);
    });

    it('should correctly return overall status', function() {
        var status = SystemCheck.overallStatus();
        assert.equal(status['test'].status, 0);
        assert.equal(status['nyan'].status, 1);
    });

});
