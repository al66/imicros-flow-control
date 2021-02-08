/**
 * @license MIT, imicros.de (c) 2018 Andreas Leinen
 */
"use strict";

const Connector = require("./connector/neo4j");

module.exports = {
    name: "flow.query",
    
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

        getTask: {
            acl: "before",
            params: {
                processId: { type: "uuid" },
                elementId: { type: "uuid" }
            },			
            async handler(ctx) {
                if (!ctx.meta.ownerId) throw new Error("not authorized");
                
                let element = {
                    processId: ctx.params.processId,
                    elementId: ctx.params.elementId,
                    ownerId: ctx.meta.ownerId
                };
                return await this.connector.getTask (element);
            }
        },
        
        getEvent: {
            acl: "before",
            params: {
                processId: { type: "uuid" },
                elementId: { type: "uuid" }
            },			
            async handler(ctx) {
                if (!ctx.meta.ownerId) throw new Error("not authorized");
                
                let element = {
                    processId: ctx.params.processId,
                    elementId: ctx.params.elementId,
                    ownerId: ctx.meta.ownerId
                };
                return await this.connector.getEvent (element);
            }
        },
        
        getGateway: {
            acl: "before",
            params: {
                processId: { type: "uuid" },
                elementId: { type: "uuid" }
            },			
            async handler(ctx) {
                if (!ctx.meta.ownerId) throw new Error("not authorized");
                
                let element = {
                    processId: ctx.params.processId,
                    elementId: ctx.params.elementId,
                    ownerId: ctx.meta.ownerId
                };
                return await this.connector.getGateway (element);
            }
        },
        
        getSequence: {
            acl: "before",
            params: {
                processId: { type: "uuid" },
                elementId: { type: "uuid" }
            },			
            async handler(ctx) {
                if (!ctx.meta.ownerId) throw new Error("not authorized");
                
                let element = {
                    processId: ctx.params.processId,
                    elementId: ctx.params.elementId,
                    ownerId: ctx.meta.ownerId
                };
                return await this.connector.getSequence (element);
            }
        },
        
        getElements: {
            acl: "before",
            params: {
                processId: { type: "uuid" },
                versionId: { type: "uuid" }
            },			
            async handler(ctx) {
                if (!ctx.meta.ownerId) throw new Error("not authorized");
                
                let process = {
                    processId: ctx.params.processId,
                    versionId: ctx.params.versionId,
                    ownerId: ctx.meta.ownerId
                };
                return await this.connector.getElements (process);
            }
        },
        
        subscriptions: {
            visibility: "public",
            params: {
                eventName: { type: "string" },
                ownerId: { type: "string" },
                version: { type: "string", optional: true },
                id: { type: "string", optional: true },
                processId: { type: "uuid", optional: true },
                elementId: { type: "uuid", optional: true },
                instanceId: { type: "uuid", optional: true }
            },
            async handler(ctx) {
                // if (!ctx.meta.ownerId) throw new Error("not authorized");
                
                let event = {
                    name: ctx.params.eventName,
                    version: ctx.params.version,
                    // ownerId: ctx.meta.ownerId
                    ownerId: ctx.params.ownerId
                };
                let result = await this.connector.getSubscriptions (event);
                if (Array.isArray(result)) result = result.filter(e => {
                    // no attrubutes, no further checks
                    if (!e.attributes) return true;
                    // check attribute if provided
                    if (e.attributes.version && e.attributes.version !== ctx.params.version) return false;
                    if (e.attributes.id && e.attributes.id !== ctx.params.id) return false;
                    if (e.attributes.processId && e.attributes.processId !== ctx.params.processId) return false;
                    if (e.attributes.elementId && e.attributes.elementId !== ctx.params.elementId) return false;
                    if (e.attributes.instanceId && e.attributes.instanceId !== ctx.params.instanceId) return false;
                    // all checks ok
                    return true;
                });
                return result;
            }
        },
        
        next: {
            acl: "before",
            params: {
                processId: { type: "uuid" },
                elementId: { type: "uuid" }
            },			
            async handler(ctx) {
                if (!ctx.meta.ownerId) throw new Error("not authorized");
                
                let element = {
                    processId: ctx.params.processId,
                    elementId: ctx.params.elementId,
                    ownerId: ctx.meta.ownerId
                };
                return await this.connector.getNext (element);
            }
        },

        previous: {
            acl: "before",
            params: {
                processId: { type: "uuid" },
                elementId: { type: "uuid" }
            },			
            async handler(ctx) {
                if (!ctx.meta.ownerId) throw new Error("not authorized");
                
                let element = {
                    processId: ctx.params.processId,
                    elementId: ctx.params.elementId,
                    ownerId: ctx.meta.ownerId
                };
                return await this.connector.getPrevious (element);
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