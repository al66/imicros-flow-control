/**
 * @license MIT, imicros.de (c) 2018 Andreas Leinen
 */
"use strict";

const Connector = require("./connector/neo4j");
const _ = require("lodash");

module.exports = {
    name: "flow.control",
    
    /**
	   * Service settings
	   */
    settings: {
        /*
        db: {
            uri: process.env.URI,
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

        /**
         * add process
         * 
         * @actions
         * @param {String} unique id (optional)
         * @param {String} name
         * 
         * @returns {String} unique id
         */
        addProcess: {
            params: {
                id: { type: "uuid", optional: true },
                name: { type: "string", optional: true }
            },
            async handler(ctx) {
                if (!ctx.meta.ownerId) throw new Error("not authorized");
                
                let process = {
                    id: ctx.params.id,
                    name: ctx.params.name,
                    ownerId: ctx.meta.ownerId,
                    core: _.get(ctx.meta,"acl.core",null)   // core group may listen to all events
                };
                return await this.connector.addProcess (process);
            }
        },
        
        /**
         * add event
         * 
         * @actions
         * @param {String} process id
         * @param {String} unique id (optional)
         * @param {String} name
         * @param {String} position
         * @param {String} type
         * @param {String} direction
         * @param {String} interaction
         * 
         * @returns {String} unique id
         */
        addEvent: {
            params: {
                processId: { type: "uuid" },
                id: { type: "uuid", optional: true },
                name: { type: "string" },
                position: { type: "string", optional: true },
                type: { type: "string", optional: true },
                direction: { type: "string", optional: true },
                interaction: { type: "string", optional: true }
            },
            async handler(ctx) {
                if (!ctx.meta.ownerId) throw new Error("not authorized");
                
                let event = {
                    processId: ctx.params.processId,
                    id: ctx.params.id,
                    name: ctx.params.name,
                    position: ctx.params.position,
                    type: ctx.params.type,
                    direction: ctx.params.direction,
                    interaction: ctx.params.interaction,
                    ownerId: ctx.meta.ownerId
                };
                return await this.connector.addEvent (event);
            }
        },
        
        /**
         * add task
         * 
         * @actions
         * @param {String} process id
         * @param {String} unique id (optional)
         * @param {String} name
         * @param {String} type
         * @param {String} service
         * @param {String} action
         * 
         * @returns {String} unique id
         */
        addTask: {
            params: {
                processId: { type: "uuid" },
                id: { type: "uuid", optional: true },
                name: { type: "string" },
                type: { type: "string", optional: true },
                attributes: { type: "object", optional: true }
            },
            async handler(ctx) {
                if (!ctx.meta.ownerId) throw new Error("not authorized");
                
                let task = {
                    processId: ctx.params.processId,
                    id: ctx.params.id,
                    name: ctx.params.name,
                    type: ctx.params.type,
                    attributes: ctx.params.attributes,
                    ownerId: ctx.meta.ownerId
                };
                return await this.connector.addTask (task);
            }
        },
        
        /**
         * add gateway
         * 
         * @actions
         * @param {String} process id
         * @param {String} unique id (optional)
         * @param {String} type
         * 
         * @returns {String} unique id
         */
        addGateway: {
            params: {
                processId: { type: "uuid" },
                id: { type: "uuid", optional: true },
                type: { type: "string", optional: true }
            },
            async handler(ctx) {
                if (!ctx.meta.ownerId) throw new Error("not authorized");
                
                let gateway = {
                    processId: ctx.params.processId,
                    id: ctx.params.id,
                    name: ctx.params.name,
                    type: ctx.params.type,
                    ownerId: ctx.meta.ownerId
                };
                return await this.connector.addGateway (gateway);
            }
        },
        
        /**
         * add sequence
         * 
         * @actions
         * @param {String} process id
         * @param {String} from
         * @param {String} to
         * @param {String} type (optional)
         * 
         * @returns {String} unique id
         */
        addSequence: {
            params: {
                processId: { type: "uuid" },
                from: { type: "uuid" },
                to: { type: "uuid" },
                type: { type: "string", optional: true },
                attributes: { type: "object", optional: true }
            },
            async handler(ctx) {
                if (!ctx.meta.ownerId) throw new Error("not authorized");
                
                let sequence = {
                    processId: ctx.params.processId,
                    fromId: ctx.params.from,
                    toId: ctx.params.to,
                    type: ctx.params.type,
                    attributes: ctx.params.attributes,
                    ownerId: ctx.meta.ownerId
                };
                return await this.connector.addSequence (sequence);
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