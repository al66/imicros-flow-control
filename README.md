# imicros-flow-control
[![Build Status](https://travis-ci.org/al66/imicros-flow-control.svg?branch=master)](https://travis-ci.org/al66/imicros-flow-control)
[![Coverage Status](https://coveralls.io/repos/github/al66/imicros-flow-control/badge.svg?branch=master)](https://coveralls.io/github/al66/imicros-flow-control?branch=master)

[Moleculer](https://github.com/moleculerjs/moleculer) services for process definition and control of imicros-flow


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
- addProcess { id (optional), name } => { id }  
- addEvent { processId, id (optional), name, position (optional), type (optional), direction (optional), interaction (optional) } => { id }  
- addTask { processId, id (optional), name, type (optional), attributes (optional) } => { id }  
- addGateway { processId, id (optional), type (optional) } => { id }  
- addSequence { processId, from, to, type (optional), attributes (optional) } => { id }  

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
- next { processId, elementId } => [{ processId, elementId, type, name (optional), position (optional), direction (optional), interaction (optional), from (optional), to (optional), attributes (optional) }]  
- get { processId, elementId } => { processId, elementId, type, name (optional), position (optional), direction (optional), interaction (optional), from (optional), to (optional), attributes (optional) }
- getAll { processId } => [{ processId, elementId, type, name (optional), position (optional), direction (optional), interaction (optional), from (optional), to (optional), attributes (optional) }]
