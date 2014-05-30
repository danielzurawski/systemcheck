systemcheck
===========

Node.js health check scheduling library for monitoring state of other systems

It allows for scheduling heartbeats or setting an explicit state for any library app component and automatically mantains state of each system for which a healthcheck has been defined.

Examples (non executable):

1. elasticsearch.js - wrapper around ElasticSearch client library that sets up a healthcheck for the system and updates the state of the system on success
2. healthcheck.js - example of accessing the SystemCheck systems states object
3. Example of explicitly putting 