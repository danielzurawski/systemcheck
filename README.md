systemcheck
===========

Node.js health check scheduling library for monitoring state of application components (e.g. Redis, ElasticSearch).

*This useful does not synchronise app health state between multiple processes if you happen to run it via node cluster or recluster. Unless you really have a reason to run it with cluster, you can run it with any daemon (Solaris SMF, daemontools (http://cr.yp.to/daemontools/svc.html)) or some other process that can keep it alive.*

It allows for scheduling heartbeats or setting an explicit state of any component within a single process.

In short, it allows you to maintain this:


```elasticsearch: {
  status: 0,
  lastErrors: [ ]
},
mysql: {
  status: 1,
  lastErrors: [ "Error: Connection lost: The server closed the connection." ]
}```

Examples folder contains the following examples: (not executable)
------
1. elasticsearch.js - wrapper around ElasticSearch client library that sets up a healthcheck for the system and updates the state of the system on success
2. healthcheck.js - example of accessing the SystemCheck systems states object
3. Example of explicitly passing error to modify the component state.
