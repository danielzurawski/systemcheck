
var SystemCheck = require('../systemcheck')
    , systems = SystemCheck.getSystems();

for (var system in systems) {
    console.log(systems[system])
}