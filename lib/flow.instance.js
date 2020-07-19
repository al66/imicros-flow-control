/**
 * @license MIT, imicros.de (c) 2018 Andreas Leinen
 */
"use strict";

const Connector = require("./connector/neo4j");
const Constants = require("./util/constants");
const { v4: uuid } = require("uuid");

module.exports = {
    name: "flow.instance",
    
    /**
	   * Service settings
	   */
    settings: {
        /*
        db: {
            uri: "bolt://localhost:7474",
            user: "neo4j",
            password: "neo4j"
        }
        */
    },

    /**
	   * Service metadata
	   */
    metadata: {},

    /**
	   * Service dependencies
	   */
    //dependencies: [],	

    /**
     * Actions
     */
    actions: {

        createInstance: {
            params: {
                processId: { type: "uuid" }
            },			
            async handler(ctx) {
                if (!ctx.meta.ownerId) throw new Error("not authorized");
                
                let instance = {
                    processId: ctx.params.processId,
                    ownerId: ctx.meta.ownerId,
                    instanceId: uuid(),
                    status: Constants.INSTANCE_RUNNING
                };
                let result = await this.connector.updateInstance (instance);
                if (result && result.length === 1 ) return result[0];
                return {};
            }
        },
        
        updateInstance: {
            params: {
                processId: { type: "uuid" },
                instanceId: { type: "uuid" },
                running: { type: "boolean", optional: true },
                completed: { type: "boolean", optional: true },
                failed: { type: "boolean", optional: true }
            },			
            async handler(ctx) {
                if (!ctx.meta.ownerId) throw new Error("not authorized");
                
                if (ctx.params.running || ctx.params.failed) {
                    let status = ctx.params.running ? Constants.INSTANCE_RUNNING : Constants.INSTANCE_FAILED;
                    let instance = {
                        processId: ctx.params.processId,
                        instanceId: ctx.params.instanceId,
                        ownerId: ctx.meta.ownerId,
                        status: status 
                    };
                    let result = await this.connector.updateInstance (instance);
                    if (result && result.length === 1 ) return result[0];
                    return {};
                }

                if (ctx.params.completed) {
                    let instance = {
                        processId: ctx.params.processId,
                        instanceId: ctx.params.instanceId,
                        ownerId: ctx.meta.ownerId
                    };
                    return await this.connector.deleteInstance (instance);
                }
            }
        },
        
        runningInstances: {
            params: {
                processId: { type: "uuid", optional: true },
                running: { type: "boolean" },
                failed: { type: "boolean" }
            },			
            async handler(ctx) {
                if (!ctx.meta.ownerId) throw new Error("not authorized");
                
                let selection = {
                    processId: ctx.params.processId,
                    ownerId: ctx.meta.ownerId,
                    running: ctx.params.running, 
                    failed: ctx.params.failed 
                };
                return await this.connector.getInstances (selection);
            }
        }
                
    },

    /**
     * Events
     */
    events: {},

    /**
	   * Methods
	   */
    methods: {},

    /**
     * Service created lifecycle event handler
     */
    created() {
        let options = {
            uri: this.settings.db ? this.settings.db.uri : null,
            user: this.settings.db ? this.settings.db.user : null,
            password: this.settings.db ? this.settings.db.password : null
        };
        this.connector = new Connector(this.broker, options);
    },

    /**
	   * Service started lifecycle event handler
	   */
    async started() {
        await this.connector.connect();
    },

    /**
	   * Service stopped lifecycle event handler
	   */
    async stopped() {
        await this.connector.disconnect();
    }
};