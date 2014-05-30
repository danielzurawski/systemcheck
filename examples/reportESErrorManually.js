var SystemCheck = require('../systemcheck');

try {
    throw new Error('There is an issue with me.')
} catch(e) {
    SystemCheck.setSystemState('elasticsearch', 1, err.stack);
}