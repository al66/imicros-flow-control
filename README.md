# imicros-flow-control
[![Coverage Status](https://coveralls.io/repos/github/al66/imicros-flow-control/badge.svg?branch=master)](https://coveralls.io/github/al66/imicros-flow-control?branch=master)

[Moleculer](https://github.com/moleculerjs/moleculer) services for process definitions and control of imicros-flow


## Installation
```
$ npm install imicros-flow-control --save
```
## Dependencies / Requirements
Requires a running neo4j node/cluster.

# Usage Controller Service
```js
const { ServiceBroker } = require("moleculer");
const { Controller } = require("imicros-flow-control");

broker = new ServiceBroker({
    logger: console
});
broker.createService(Controller, Object.assign({ 
    name: "v1.flow.control",
    settings: { 
        db: {
            uri: process.env.URI,
            user: "neo4j",
            password: "neo4j"
        }
    }
}));
broker.start();
```
## Actions
- deployProcess { processId(optional), name } => { processId, versionId }   name - name of object in object store. The object must be a valid bpmn xml file 
- activateVersion { processId, versionId } => { processId, versionId }  
- getProcesses { } => [{ processId, versionId, name }]  
- getVersions { processId } => [{ processId, versionId, name }]  

# Usage Query Service
```js
const { ServiceBroker } = require("moleculer");
const { Query } = require("imicros-flow-control");

broker = new ServiceBroker({
    logger: console
});
broker.createService(Query, Object.assign({ 
    name: "v1.flow.query",
    settings: { 
        db: {
            uri: process.env.URI,
            user: "neo4j",
            password: "neo4j"
        }
    }
}));
broker.start();
```
## Actions
- next { processId, elementId } => [{ processId, ownerId, uid, type }]  
- previous { processId, elementId } => [{ processId, ownerId, uid, type }]
- subscriptions { eventName } => [{ processId, elementId, ownerId, type, attributes }]
- getEvent { processId, elementId } => [{ processId, versionId, type, name, uid, ownerId, position, direction, interaction, from, to, attributes }]
- getSequence { processId, elementId } => [{ processId, versionId, type, uid, ownerId, from, to, attributes }]
- getTask { processId, elementId } => [{ processId, versionId, type, name, uid, ownerId, attributes }]
- getGateway { processId, elementId } => [{ processId, versionId, type, name, uid, ownerId, attributes }]
- getElements { processId, versionId } => [{ processId, elementId, type, uid, ownerId }]
