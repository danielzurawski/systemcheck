'use strict';

var es = require('elasticsearch')
  , config = require('config')
  , SystemCheck = require('../systemcheck');

function ElasticSearch() {}

ElasticSearch.es = es.createClient({ server: config.servers.elasticsearch });

function monitorCheck(cb) {
    ElasticSearch.es.cluster.health(function (err, data) {

        // If there is an error, set the system in an error state
        // passing err to cb() adds the err.message to the error buffer for that system
        // and flags it as error: 1 in the object returned by SystemCheck.getSystems() 
        if (err || data.status != 'green') return cb(err || 'cluster not green');

        // If there is no error, pass null as error 
        // this will update the heartbeat date and status to: "0" (ok)
        cb(null);
    });
}
SystemCheck.monitorSystem('elasticsearch', 10000, monitorCheck);

module.exports = ElasticSearch;