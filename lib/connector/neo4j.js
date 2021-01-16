/**
 * @license MIT, imicros.de (c) 2018 Andreas Leinen
 */
"use strict";

const db	= require("neo4j-driver");
const Serializer = require("../util/serializer");
const { v4: uuidV4 } = require("uuid");
const Constants = require("../util/constants");

class neo4j {
    
    constructor (broker, options) {
        
        this.broker = broker;
        this.logger = this.broker.logger;

        /* istanbul ignore else */
        if (!this.database) {
            this.database = {};
            this.database.uri = options.uri || "bolt://localhost:7474";
            this.database.user = options.user || "neo4j";
            this.database.password = options.password || "neo4j";
        }
        
        this.serializer = new Serializer();
        
    }
    
    async addProcess (process) {
        let params = {
            uid: process.id || uuidV4(),
            versionId: ".",
            name: process.name,
            ownerId: process.ownerId
        };
        let statement = "MERGE (p:Process { uid: {uid}, ownerId: {ownerId} }) ";
        statement += "ON CREATE SET p.versionId = {versionId} ";
        statement += "SET p.name = {name} ";
        if (process.core) statement += ", p.core = true ";
        statement += "RETURN p.uid AS id, p.versionId AS versionId ;";
        let result = await this.run(statement, params);
        if (result && result[0].versionId === ".") result[0].versionId = null;
        return result;
    }
    
    async addVersion (version) {
        let params = {
            uid: version.id || uuidV4(), 
            processId: version.processId,
            name: version.name || "",
            created: version.created || Date.now(),
            ownerId: version.ownerId,
            attributes: version.attributes ? JSON.stringify(version.attributes) : "."
        };
        let statement = "MATCH (p:Process { uid: {processId}, ownerId: {ownerId} }) ";
        statement += "WITH p ";
        statement += "MERGE (v:Version { uid: {uid}, ownerId: {ownerId} })-[r:ASSIGNED]->(p) ";
        statement += "SET v.name = {name}, v.created = {created}, v.attributes = {attributes} ";
        statement += "RETURN v.uid AS id, v.name AS name, v.created AS created ;";
        let result = await this.run(statement, params);
        return result;
    }
    
    async getVersions (process) {
        let params = {
            processId: process.id,
            ownerId: process.ownerId
        };
        let statement = "MATCH (v:Version { ownerId: {ownerId} })-[r:ASSIGNED]->(p:Process { uid: {processId}, ownerId: {ownerId} }) ";
        statement += "RETURN p.uid AS processId, v.uid AS versionId, v.name AS name, v.created AS created ;";
        let result = await this.run(statement, params);
        return result;
    }
    
    async activateVersion (version) {
        let params = {
            uid: version.id, 
            processId: version.processId,
            ownerId: version.ownerId
        };
        let statement = "MATCH (v:Version { uid: {uid}, ownerId: {ownerId} })-[r:ASSIGNED]->(p:Process { uid: {processId}, ownerId: {ownerId} }) ";
        statement += "SET p.versionId = {uid} ";
        statement += "RETURN p.uid AS processId, p.versionId AS versionId, v.name AS name ;";
        let result = await this.run(statement, params);
        return result;
    }
    
    async deactivateVersion (version) {
        let params = {
            uid: version.id, 
            processId: version.processId,
            ownerId: version.ownerId
        };
        let statement = "MATCH (v:Version { uid: {uid}, ownerId: {ownerId} })-[r:ASSIGNED]->(p:Process { uid: {processId}, versionId: {uid}, ownerId: {ownerId} }) ";
        statement += "SET p.versionId = '.' ";
        statement += "RETURN p.uid AS processId, v.name AS name ;";
        let result = await this.run(statement, params);
        return result;
    }
    
    async getProcesses (filter) {
        let params = {
            ownerId: filter.ownerId
        };
        let statement = "MATCH (p:Process { ownerId: {ownerId} }) ";
        statement += "OPTIONAL MATCH (v:Version { ownerId: {ownerId} })-[r:ASSIGNED]->(p) ";
        statement += "WHERE v.uid = p.versionId ";
        statement += "RETURN p.uid AS processId, p.name AS name, v.uid AS versionId, v.name AS versionName, v.created AS created ;";
        let result = await this.run(statement, params);
        if (result && Array.isArray(result)) {
            return result.map(e => {
                if (e.versionId === ".") e.versionId = null;
                return e;
            });
        }
        return result;
    }
    
    async removeProcess (process) {
        let params = {
            uid: process.id,
            ownerId: process.ownerId
        };
        let statement = "MATCH (n { ownerId: {ownerId} })-[:ASSIGNED]->(:Process { uid: {uid}, ownerId: {ownerId} }) ";
        statement += "MATCH (p:Process { uid: {uid}, ownerId: {ownerId} }) ";
        statement += "DETACH DELETE n, p ";
        let result = await this.run(statement, params);
        return result;
    }
    
    async addEvent (event) {
        let params = {
            processId: event.processId,
            versionId: event.versionId,
            uid: event.id || uuidV4(),
            name: event.name,
            position: event.position || Constants.START_EVENT,
            type: event.type || Constants.DEFAULT_EVENT,
            direction: event.direction || Constants.CATCHING_EVENT,
            interaction: event.interaction || "",
            ownerId: event.ownerId,
            attributes: event.attributes ? JSON.stringify(event.attributes) : "."
        };
        let statement = "MATCH (p:Process { uid: {processId}, ownerId: {ownerId} }) ";
        statement += "WITH p ";
        statement += "MERGE (e:Event { uid: {uid}, ownerId: {ownerId} })-[r:ASSIGNED]->(p) ";
        statement += "SET e.name = {name}, e.position = {position}, e.type = {type}, e.direction = {direction}, e.interaction = {interaction} ";
        statement += ", e.attributes = {attributes}, e.versionId = {versionId} ";
        statement += "RETURN e.uid AS id ";
        let result = await this.run(statement, params);
        return result;
        
    }
    
    async removeEvent (event) {
        let params = {
            processId: event.processId,
            uid: event.id,
            ownerId: event.ownerId
        };
        let statement = "MATCH (e:Event { uid: {uid}, ownerId: {ownerId} })-[:ASSIGNED]->(p:Process { uid: {processId}, ownerId: {ownerId} }) ";
        statement += "DETACH DELETE e ;";
        let result = await this.run(statement, params);
        return result;
        
    }
    
    async getEvent (event) {
        let params = {
            processId: event.processId,
            uid: event.elementId,
            ownerId: event.ownerId
        };
        let statement = "MATCH (e:Event { uid: {uid} })-[:ASSIGNED]->(p:Process { uid: {processId}, ownerId: {ownerId} }) ";
        statement += "RETURN p.uid AS processId, e.versionId AS versionId, e.name AS name, e.uid AS uid, e.position AS position, e.type AS type, e.direction AS direction, e.interaction AS interaction, e.ownerId AS ownerId, e.attributes AS attributes";
        let result = await this.run(statement, params);
        if (result && result[0] && result[0].attributes && result[0].attributes !== "." ) result[0].attributes = JSON.parse(result[0].attributes);
        if (result && result[0].attributes === ".") delete result[0].attributes;
        return result;
    }

    async addTask (task) {
        let type  = task.type || Constants.MANUAL_TASK;      // default
        // type = (task.attributes && task.attributes.action) ? Constants.SERVICE_TASK : type;
        // type = (task.attributes && task.attributes.ruleset) ? Constants.BUSINESS_RULE_TASK : type;
        let params = {
            processId: task.processId,
            versionId: task.versionId,
            uid: task.id || uuidV4(),
            name: task.name,
            ownerId: task.ownerId,
            type: type,
            attributes: task.attributes ? JSON.stringify(task.attributes) : "."
        };
        let statement = "MATCH (p:Process { uid: {processId}, ownerId: {ownerId} }) ";
        statement += "WITH p ";
        statement += "MERGE (t:Task { uid: {uid}, ownerId: {ownerId} })-[r:ASSIGNED]->(p) ";
        statement += "SET t.name = {name}, t.attributes = {attributes}, t.type = {type}, t.versionId = {versionId} ";
        statement += "RETURN t.uid AS id ";
        let result = await this.run(statement, params);
        return result;
        
    }
    
    async removeTask (task) {
        let params = {
            processId: task.processId,
            uid: task.id,
            ownerId: task.ownerId
        };
        let statement = "MATCH (t:Task { uid: {uid}, ownerId: {ownerId} })-[:ASSIGNED]->(p:Process { uid: {processId}, ownerId: {ownerId} }) ";
        statement += "DETACH DELETE t ";
        let result = await this.run(statement, params);
        return result;
        
    }
    
    async getTask (task) {
        let params = {
            processId: task.processId,
            uid: task.elementId,
            ownerId: task.ownerId
        };
        let statement = "MATCH (t:Task { uid: {uid} })-[:ASSIGNED]->(p:Process { uid: {processId}, ownerId: {ownerId} }) ";
        statement += "RETURN p.uid AS processId, t.versionId AS versionId, t.name AS name, t.uid AS uid, t.type AS type, t.ownerId AS ownerId, t.attributes AS attributes";
        let result = await this.run(statement, params);
        this.logger.info("getTask", {statement: statement,params:params});
        if (result && result[0] && result[0].attributes && result[0].attributes !== ".") result[0].attributes = JSON.parse(result[0].attributes);
        if (result && result[0].attributes === ".") delete result[0].attributes;
        return result;
    }

    async addGateway (gateway) {
        let params = {
            processId: gateway.processId,
            versionId: gateway.versionId,
            uid: gateway.id || uuidV4(),
            type: gateway.type || Constants.EXCLUSIVE_GATEWAY,
            name: gateway.name || "",
            ownerId: gateway.ownerId,
            attributes: gateway.attributes ? JSON.stringify(gateway.attributes) : "."
        };
        let statement = "MATCH (p:Process { uid: {processId}, ownerId: {ownerId} }) ";
        statement += "WITH p ";
        statement += "MERGE (g:Gateway { uid: {uid}, ownerId: {ownerId} })-[r:ASSIGNED]->(p) ";
        statement += "SET g.type = {type}, g.name = {name}, g.attributes = {attributes}, g.versionId = {versionId} ";
        statement += "RETURN g.uid AS id ";
        let result = await this.run(statement, params);
        return result;
        
    }
    
    async removeGateway (gateway) {
        let params = {
            processId: gateway.processId,
            uid: gateway.id,
            ownerId: gateway.ownerId
        };
        let statement = "MATCH (g:Gateway { uid: {uid}, ownerId: {ownerId} })-[:ASSIGNED]->(p:Process { uid: {processId}, ownerId: {ownerId} }) ";
        statement += "DETACH DELETE g ";
        let result = await this.run(statement, params);
        return result;
        
    }
    
    async getGateway (gateway) {
        let params = {
            processId: gateway.processId,
            uid: gateway.elementId,
            ownerId: gateway.ownerId
        };
        let statement = "MATCH (g:Gateway { uid: {uid} })-[:ASSIGNED]->(p:Process { uid: {processId}, ownerId: {ownerId} }) ";
        statement += "RETURN p.uid AS processId, g.uid AS uid, g.name AS name, g.type AS type, p.ownerId AS ownerId, g.attributes AS attributes";
        let result = await this.run(statement, params);
        this.logger.info("getTask", {statement: statement,params:params});
        if (result && result[0] && result[0].attributes && result[0].attributes !== ".") result[0].attributes = JSON.parse(result[0].attributes);
        if (result && result[0].attributes === ".") delete result[0].attributes;
        return result;
    }

    async addSequence (connection) {
        let params = {
            fromId: connection.fromId,
            toId: connection.toId,
            uid: uuidV4(),
            type: connection.type || Constants.SEQUENCE_STANDARD,
            attributes: connection.attributes ? JSON.stringify(connection.attributes) : ".",
            ownerId: connection.ownerId
        };
        let statement = "MATCH (from { uid: {fromId}, ownerId: {ownerId} }) ";
        statement += "MATCH (to { uid: {toId}, ownerId: {ownerId} }) ";
        statement += "MERGE (from)-[r:NEXT]->(to) ";
        statement += "SET r.type =  {type}, r.uid = {uid}, r.attributes = {attributes} ";
        statement += "RETURN { from: from.uid, to: to.uid, type: r.type, uid: r.uid  } AS connection ";
        let result = await this.run(statement, params);
        return result;
        
    }
    
    async removeSequence (connection) {
        let params = {
            fromId: connection.fromId,
            toId: connection.toId,
            ownerId: connection.ownerId
        };
        let statement = "MATCH (from { uid: {fromId}, ownerId: {ownerId} }) ";
        statement += "MATCH (to { uid: {toId}, ownerId: {ownerId} }) ";
        statement += "WITH from, to ";
        statement += "MATCH (from)-[r]->(to) ";
        statement += "DELETE r ;";
        let result = await this.run(statement, params);
        return result;
        
    }
    
    async getSequence (sequence) {
        let params = {
            processId: sequence.processId,
            uid: sequence.elementId,
            ownerId: sequence.ownerId
        };
        let statement = "MATCH (from)-[r:NEXT { uid: {uid} }]->(to)-[:ASSIGNED]->(p:Process { uid: {processId}, ownerId: {ownerId} }) ";
        statement += "RETURN p.uid AS processId, p.ownerId AS ownerId, from.uid AS from, to.uid AS to, r.type AS type, r.attributes AS attributes, r.uid AS uid ";
        let result = await this.run(statement, params);
        if (result && result[0] && result[0].attributes && result[0].attributes !== ".") result[0].attributes = JSON.parse(result[0].attributes);
        if (result && result[0].attributes === ".") delete result[0].attributes;
        return result;
    }

    async getElements (process) {
        let params = {
            processId: process.processId,
            versionId: process.versionId,
            ownerId: process.ownerId
        };
        let statement = "MATCH (e { versionId: {versionId}})-[r:NEXT]->()-[:ASSIGNED]->(p:Process { uid: {processId}, ownerId: {ownerId} }) ";
        statement += "RETURN p.uid AS processId, p.ownerId AS ownerId, r.uid AS uid, r.type AS type ";
        statement += "UNION ALL ";
        statement += "MATCH (e { versionId: {versionId}})-[:ASSIGNED]->(p:Process { uid: {processId}, ownerId: {ownerId} }) ";
        statement += "RETURN p.uid AS processId, p.ownerId AS ownerId, e.uid AS uid, e.type AS type ";
        let result = await this.run(statement, params);
        return result;
    }

    async getNext (element) {
        let params = {
            processId: element.processId,
            uid: element.elementId,
            ownerId: element.ownerId
        };
        let statement = "MATCH (e { uid: {uid} })-[r:NEXT]->()-[:ASSIGNED]->(p:Process { uid: {processId}, ownerId: {ownerId} }) ";
        statement += "RETURN p.uid AS processId, p.ownerId AS ownerId, r.uid AS uid, r.type AS type ";
        statement += "UNION ALL ";
        statement += "MATCH ()-[:NEXT { uid: {uid} }]->(e)-[:ASSIGNED]->(p:Process { uid: {processId}, ownerId: {ownerId} }) ";
        statement += "RETURN p.uid AS processId, p.ownerId AS ownerId, e.uid AS uid, e.type AS type ";
        let result = await this.run(statement, params);
        return result;
    }

    async getPrevious (element) {
        let params = {
            processId: element.processId,
            uid: element.elementId,
            ownerId: element.ownerId
        };
        let statement = "MATCH ()-[r:NEXT]->(e { uid: {uid} })-[:ASSIGNED]->(p:Process { uid: {processId}, ownerId: {ownerId} }) ";
        statement += "RETURN p.uid AS processId, p.ownerId AS ownerId, r.uid AS uid, r.type AS type ";
        statement += "UNION ALL ";
        statement += "MATCH (e)-[:NEXT { uid: {uid} }]->()-[:ASSIGNED]->(p:Process { uid: {processId}, ownerId: {ownerId} }) ";
        statement += "RETURN p.uid AS processId, p.ownerId AS ownerId, e.uid AS uid, e.type AS type ";
        let result = await this.run(statement, params);
        return result;
    }

    async getSubscriptions (event) {
        let params = {
            name: event.name,
            ownerId: event.ownerId
        };
        let statement = "MATCH (e:Event { name: {name} })-[r:ASSIGNED]->(p:Process { ownerId: {ownerId} }) ";
        statement += "WHERE e.versionId = p.versionId ";
        statement += "RETURN p.uid AS processId, p.versionId AS versionId, p.ownerId AS ownerId, e.uid AS elementId, e.type AS type, e.attributes AS attributes ";
        statement += "UNION ";
        statement += "MATCH (e:Event { name: {name} })-[r:ASSIGNED]->(p:Process { core: true }) ";
        statement += "WHERE e.versionId = p.versionId ";
        statement += "RETURN p.uid AS processId, p.versionId AS versionId, p.ownerId AS ownerId, e.uid AS elementId, e.type AS type, e.attributes AS attributes ";
        let result = await this.run(statement, params);
        if (result && result.length > 0) result = result.map((e) => {
            if (e.attributes && e.attributes !== ".") e.attributes = JSON.parse(e.attributes);
            if (e.attributes === ".") delete e.attributes;
            return e;
        });
        return result;
    }
    
    async updateInstance (instance) {
        let params = {
            processId: instance.processId,
            versionId: instance.versionId,
            ownerId: instance.ownerId,
            instanceId: instance.instanceId,
            status: instance.status,
            completedAt: instance.completedAt || null
        };
        let statement = "MERGE (i:Instance { processId: {processId}, uid: {instanceId}, ownerId: {ownerId} })";
        statement += "ON CREATE SET i.createdAt = timestamp(), i.versionId = {versionId} ";
        statement += "SET i.status =  {status}, i.completedAt = {completedAt} ";
        statement += "RETURN i.processId AS processId, i.versionId AS versionId, i.ownerId AS ownerId, i.uid AS instanceId, i.status AS status ";
        let result = await this.run(statement, params);
        return result;
    }

    async deleteInstance (instance) {
        let params = {
            processId: instance.processId,
            ownerId: instance.ownerId,
            instanceId: instance.instanceId
        };
        let statement = "MATCH (i:Instance { processId: {processId}, uid: {instanceId}, ownerId: {ownerId} }) ";
        statement += "DETACH DELETE i ";
        let result = await this.run(statement, params);
        return result;
    }
    
    async getInstances (selection) {
        let params = {
            processId: selection.processId,
            ownerId: selection.ownerId
        };
        let statement = "MATCH (i:Instance { processId: {processId}, ownerId: {ownerId} }) ";
        if (!selection.running || !selection.failed || !selection.completed) {
            let status = "'X'";
            if (selection.running) status ? status += ",'" + Constants.INSTANCE_RUNNING + "'" : status += "'" + Constants.INSTANCE_RUNNING + "'";
            if (selection.failed) status ? status +=  ",'" + Constants.INSTANCE_FAILED + "'" : status += "'" + Constants.INSTANCE_FAILED + "'";
            if (selection.completed) status ? status +=  ",'" + Constants.INSTANCE_COMPLETED + "'" : status += "'" + Constants.INSTANCE_COMPLETED + "'";
            statement += "WHERE i.status IN [" + status + "] "; 
        }
        statement += "RETURN i.processId AS processId, i.versionId AS versionId, i.ownerId AS ownerId, i.uid AS instanceId, i.status AS status, i.createdAt AS createdAt, i.completedAt AS completedAt ";
        let result = await this.run(statement, params);
        return result;
    }

    async createConstraints () {
        return this.run("CREATE CONSTRAINT ON (n:Node) ASSERT n.uid IS UNIQUE ")
        .then(() => this.run("CREATE CONSTRAINT ON (p:Process) ASSERT p.uid IS UNIQUE "))
        .then(() => this.run("CREATE CONSTRAINT ON (e:Event) ASSERT e.uid IS UNIQUE "))
        .then(() => this.run("CREATE CONSTRAINT ON (t:Task) ASSERT t.uid IS UNIQUE "))
        .then(() => this.run("CREATE CONSTRAINT ON (g:Gateway) ASSERT g.uid IS UNIQUE "))
        .then(() => this.run("CREATE CONSTRAINT ON (i:Instance) ASSERT i.uid IS UNIQUE "))
        .then(() => {return true;})
        .catch(() => { throw new Error("Failed to create constraints");});
    }

    /**
     * Register this node in the database
     */
    async register () {
        let params = {
            node: this.broker.nodeID,
            timestamp: Date.now()
        };
        let statement = "MERGE (s:Node { uid: {node} }) ";
        statement += "ON MATCH SET s.heartbeat = {timestamp} ";
        statement += "ON CREATE SET s.heartbeat = {timestamp} ";
        let result = await this.run(statement, params);
        if (!result) {
            throw new Error("Failed to register node");
        }
        return result;
    }
    
    /**
     * Unregister this node in the database
     */
    async unregister () {
        let params = {
            node: this.broker.nodeID
        };
        let statement = "MATCH (s:Node { uid: {node} }) ";
        statement += "DELETE s ";
        let result = await this.run(statement, params);
        if (!result) {
            throw new Error("Failed to unregister node");
        }
        return result;
    }
    
    /**
     * Connect to database
     */
    connect() {

        this.driver = db.driver(this.database.uri, db.auth.basic(this.database.user, this.database.password));
        
        return this.register().then(() => {
            this.logger.info(`Connected to ${this.database.uri}`);
            return Promise.resolve();
        });
        
    }

    /**
     * Disconnect from database
     */
    disconnect() {
        
        /* istanbul ignore next */
        if (!this.driver) return Promise.resolve();
        return this.unregister().then(() => {
            this.driver.close();
            this.logger.info(`Disconnected from ${this.database.uri}`);
            return Promise.resolve();
        });
        
    }

    /**
     * Convert neo4j integer to js integers (or strings)
     *
     * @param {Object} record
     * 
     * @returns {Object} converted record
     */
    transform(object) {
        for (let property in object) {
            if (object.hasOwnProperty(property)) {
                const propertyValue = object[property];
                if (db.isInt(propertyValue)) {
                    if (db.integer.inSafeRange(propertyValue)) {
                        object[property] = propertyValue.toNumber();
                    } else {
                        object[property] = propertyValue.toString();
                    }
                } else if (typeof propertyValue === "object") {
                    this.transform(propertyValue);
                }
            }
        }
    }    
    
    /**
     * Execute statement
     *
     * @param {String} statement 
     * @param {Object} execution parameters 
     * 
     * @returns {Object} result
     */
    run(statement, param) {
        let session = this.driver.session();
        let response = [];
        let self = this;

        return session
            .run(statement, param)
            .then(function (result) {
                if (result.records) {
                    result.records.forEach(function (record) {
                        // Convert Integer
                        try {
                            self.transform(record);
                        } catch (err) {
                            self.logger.error(`Database err - integer transformation: ${JSON.stringify(err)}`);
                        }
                        response.push(record.toObject());
                    });
                }
                session.close();
                return response;
            })
            .catch(err => {
                self.logger.error(`Database Statement ${statement} with params ${JSON.stringify(param)}`);
                self.logger.error(`Database driver error: ${JSON.stringify(err)}`);
            });
    }    
    
}

module.exports = neo4j;