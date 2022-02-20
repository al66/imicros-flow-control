/**
 * @license MIT, imicros.de (c) 2018 Andreas Leinen
 */
"use strict";

const Connector = require("./connector/neo4j");
const Constants = require("./util/constants");
const { v4: uuid } = require("uuid");

// xml parser & parser options
const { XMLParser } = require("fast-xml-parser");
const options = {
    attributeNamePrefix : "_",
    removeNSPrefix: true,
    ignoreAttributes : false,
    ignoreNameSpace : false,
    allowBooleanAttributes : true,
    parseNodeValue : true,
    parseAttributeValue : true,
    trimValues: true,
    cdataTagName: "__cdata", //default is 'false'
    cdataPropName: "__cdata", //default is 'false'
    cdataPositionChar: "\\c",
    parseTrueNumberOnly: false
    //    attrValueProcessor: (val, attrName) => he.decode(val, {isAttributeValue: true}),//default is a=>a
    //    tagValueProcessor : (val, tagName) => he.decode(val), //default is a=>a
    // stopNodes: ["bpmndi:BPMNDiagram"]
};
const Parser = new XMLParser(options);

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
         * deploy process
         * 
         * @actions
         * @param {String|Array{String}} object name in store
         * 
         * @returns {Object} parsed process
         */
        deployProcess: {
            acl: "before",
            params: {
                processId: { type: "uuid", optional: true },
                name: [{ type: "string" },{ type: "array" }]
            },
            async handler(ctx) {

                // gateway passes name as array if path is used.. 
                let objectName = Array.isArray(ctx.params.name) ? ctx.params.name.join("/") :ctx.params.name;
                
                // get xml data as string from object service
                let xmlData;
                try {
                    xmlData = await this.getString({ctx: ctx, objectName: objectName});
                } catch (err) {
                    this.logger.debug("Failed to retrieve process definition from object store", {err: err});
                    return false;
                }
                
                let id = ctx.params.processId;
                let parsedProcess = await this.parseXml({ id, xmlData, objectName, ownerId: ctx.meta.ownerId, core: ctx.meta?.acl?.core ?? null });
                
                // retrieve grant token
                const meta = ctx.meta;
                meta.service = { serviceToken: this.serviceToken };
                let granted = await ctx.call(this.services.agents + ".grantAccess",{},{ meta });
                if (!granted) throw new Error("Failed to grant access for service");

                let result = await this.saveProcess({ parsedProcess });
                
                return result;
                
            }                
        },
        
        getProcesses: {
            acl: "before",
            params: {
            },
            async handler(ctx) {
                let filter = {
                    ownerId: ctx.meta.ownerId
                };
                let result = await this.connector.getProcesses(filter);
                return result;
            }                
        },
        
        getVersions: {
            acl: "before",
            params: {
                processId: { type: "uuid" }
            },
            async handler(ctx) {
                let process = {
                    id: ctx.params.processId,
                    ownerId: ctx.meta.ownerId
                };
                let result = await this.connector.getVersions(process);
                return result;
            }                
        },
        
        activateVersion: {
            acl: "before",
            params: {
                processId: { type: "uuid" },
                versionId: { type: "uuid" }
            },
            async handler(ctx) {
                let version = {
                    id: ctx.params.versionId, 
                    processId: ctx.params.processId,
                    ownerId: ctx.meta.ownerId
                };
                let result = await this.connector.activateVersion(version);
                if (result && result[0]) {
                    return result[0];
                } else {
                    throw new Error("Failed to activate version");
                }
            }                
        },
        
        deactivateVersion: {
            acl: "before",
            params: {
                processId: { type: "uuid" },
                versionId: { type: "uuid" }
            },
            async handler(ctx) {
                let version = {
                    id: ctx.params.versionId, 
                    processId: ctx.params.processId,
                    ownerId: ctx.meta.ownerId
                };
                let result = await this.connector.deactivateVersion(version);
                if (result && result[0]) {
                    return result[0];
                } else {
                    throw new Error("Failed to deactivate version");
                }
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
    methods: {
        
        toArray( value ) {
            return Array.isArray(value) ? value : ( value ? [value] : [] );
        },

        parseXml({ id, xmlData, objectName, ownerId, core }) {
            let jsonObj = Parser.parse(xmlData);
            
            if (!jsonObj.definitions) return { failed: true, err: "unvalid definition - missing element bpmn:definitions"};
          
            let idMap = {};
            function mapId(extern) {
                if (!extern) return null;
                if (!idMap[extern]) idMap[extern] = uuid();
                return idMap[extern];
            }
            
            let parsedProcess = {};

            let bpmnProcess = jsonObj.definitions?.process ??  null;
            if (bpmnProcess) {

                // Parse process attributes
                parsedProcess.process = {
                    id: id || mapId(bpmnProcess._id ?? null),
                    name: objectName,
                    ownerId: ownerId,
                    core: core              // core group may listen to all events
                };
                parsedProcess.version = {
                    id: uuid(),
                    processId: parsedProcess.process.id,
                    created: Date.now(),
                    name: objectName,
                    ownerId: ownerId
                };

                // Parse sequences
                if (!parsedProcess.sequence) parsedProcess.sequence = [];
                this.toArray(bpmnProcess.sequenceFlow).forEach((s) => {
                    parsedProcess.sequence.push({
                        processId: parsedProcess.process.id,
                        id: mapId(s._id),
                        fromId: mapId(s._sourceRef),
                        toId: mapId(s._targetRef),
                        type: Constants.SEQUENCE_STANDARD,
                        attributes: {},
                        ownerId: ownerId
                    });
                });

                // Parse business rule tasks
                if (!parsedProcess.task) parsedProcess.task = [];
                this.toArray(bpmnProcess.businessRuleTask).forEach((t) => {
                    let task = {
                        processId: parsedProcess.process.id,
                        versionId: parsedProcess.version.id,
                        id: mapId(t._id),
                        name: t._name,
                        incoming: this.toArray(t.incoming).map(id => mapId(id)),
                        outgoing: this.toArray(t.outgoing).map(id => mapId(id)),
                        type: Constants.BUSINESS_RULE_TASK,
                        attributes: {
                            contextKeys: (t.extensionElements.executionParameter._contextKeys || "").split(","),
                            ruleset: t.extensionElements.executionParameter._ruleset,
                            contextKey: t.extensionElements.executionParameter._contextKey
                        },
                        ownerId
                    };
                    parsedProcess.task.push(task);
                });

                // Parse service tasks
                if (!parsedProcess.task) parsedProcess.task = [];
                this.toArray(bpmnProcess.serviceTask).forEach((t) => {
                    let incoming = Array.isArray(t.incoming) ? t.incoming : [t.incoming];
                    let outgoing = Array.isArray(t.outgoing) ? t.outgoing : [t.outgoing];
                    let task = {
                        processId: parsedProcess.process.id,
                        versionId: parsedProcess.version.id,
                        id: mapId(t._id),
                        name: t._name,
                        incoming: incoming.map(id => mapId(id)),
                        outgoing: outgoing.map(id => mapId(id)),
                        type: Constants.SERVICE_TASK,
                        attributes: {
                            contextKeys: (t.extensionElements.executionParameter._contextKeys || "").split(","),
                            prepFunction: t.extensionElements.executionParameter._prepFunction,
                            ruleset: t.extensionElements.executionParameter._ruleset,
                            template: t.extensionElements.executionParameter._template,
                            paramsKey: t.extensionElements.executionParameter._paramsKey,
                            action: t.extensionElements.executionParameter._action,
                            serviceId: t.extensionElements.executionParameter._serviceId,
                            resultKey: t.extensionElements.executionParameter._resultKey
                        },
                        ownerId
                    };
                    parsedProcess.task.push(task);
                });

                // Parse start events
                if (!parsedProcess.event) parsedProcess.event = [];
                this.toArray(bpmnProcess.startEvent).forEach((e) => {
                    let outgoing = Array.isArray(e.outgoing) ? e.outgoing : [e.outgoing];
                    let event = {
                        processId: parsedProcess.process.id,
                        versionId: parsedProcess.version.id,
                        id: mapId(e._id),
                        name: e._name || "",
                        outgoing: outgoing.map(id => mapId(id)),
                        position: Constants.START_EVENT,
                        type: Constants.DEFAULT_EVENT,  // SIGNAL_EVENT
                        direction: Constants.CATCHING_EVENT,
                        interaction: null,
                        attributes: {},
                        ownerId
                    };
                    let contextKey = e.extensionElements.executionParameter._contextKey;
                    let signal = e.extensionElements.executionParameter._event;
                    if (contextKey) {
                        if (signal) event.type = Constants.SIGNAL_EVENT;
                        event.attributes = {
                            event: signal,
                            contextKey
                        };
                    }
                    parsedProcess.event.push(event);
                });

                // Parse end events
                if (!parsedProcess.event) parsedProcess.event = [];
                this.toArray(bpmnProcess.endEvent).forEach((e) => {
                    let incoming = Array.isArray(e.incoming) ? e.incoming : [e.incoming];
                    let event = {
                        processId: parsedProcess.process.id,
                        versionId: parsedProcess.version.id,
                        id: mapId(e._id),
                        name: e._name || "",
                        incoming: incoming.map(id => mapId(id)),
                        position: Constants.END_EVENT,
                        type: Constants.DEFAULT_EVENT,
                        direction: Constants.THROWING_EVENT,
                        interaction: null,
                        attributes: {},
                        ownerId
                    };
                    parsedProcess.event.push(event);
                });
                parsedProcess.idMap = idMap;
            }
            
            this.logger.debug("parsed process", parsedProcess);
            
            return parsedProcess;
        },
        
        async saveProcess({ parsedProcess }) {
            // 
            let process = await this.connector.addProcess(parsedProcess.process);
            let version = await this.connector.addVersion(parsedProcess.version);
            await Promise.all(parsedProcess.event.map((e) => this.connector.addEvent(e)));
            await Promise.all(parsedProcess.task.map((e) => this.connector.addTask(e)));
            await Promise.all(parsedProcess.sequence.map((e) => this.connector.addSequence(e)));
            if (process && process[0] && version && version[0]) {
                return { processId: process[0].id, versionId: version[0].id };
            } else {
                throw new Error("Failed to save process");
            }
        }
        
    },

    /**
     * Service created lifecycle event handler
     */
    async created() {
        let options = {
            uri: this.settings?.db?.uri ?? null,
            user: this.settings?.db?.user ?? null,
            password: this.settings?.db?.password ?? null
        };
        this.connector = new Connector(this.broker, options);

        this.services = Object.assign(this.services || {}, { 
            agents: this.settings?.services?.agents ?? "agents"
        });
        
        await this.broker.waitForServices(Object.values(this.services));
        
    },

    /**
	 * Service started lifecycle event handler
	 */
    async started() {
        await this.connector.connect();

        const serviceId = process.env.SERVICE_ID;
        const authToken = process.env.SERVICE_AUTH_TOKEN;        
        const { serviceToken } = await this.broker.call(this.services.agents + ".login", { serviceId, authToken});
        if (!serviceToken) throw new Error("failed to login service");
        this.serviceToken = serviceToken;

    },

    /**
	 * Service stopped lifecycle event handler
	 */
    async stopped() {
        await this.connector.disconnect();
    }
};