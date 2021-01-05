/**
 * @license MIT, imicros.de (c) 2018 Andreas Leinen
 */
"use strict";

const Connector = require("./connector/neo4j");
const Constants = require("./util/constants");
const { v4: uuid } = require("uuid");
const _ = require("lodash");

// xml parser & parser options
const Parser = require("fast-xml-parser");
const options = {
    attributeNamePrefix : "@_",
    attrNodeName: "attr", //default is 'false'
    textNodeName : "#text",
    ignoreAttributes : false,
    ignoreNameSpace : false,
    allowBooleanAttributes : true,
    parseNodeValue : true,
    parseAttributeValue : true,
    trimValues: true,
    cdataTagName: "__cdata", //default is 'false'
    cdataPositionChar: "\\c",
    parseTrueNumberOnly: false,
    arrayMode: "strict", // false, //"strict"
//    attrValueProcessor: (val, attrName) => he.decode(val, {isAttributeValue: true}),//default is a=>a
//    tagValueProcessor : (val, tagName) => he.decode(val), //default is a=>a
    stopNodes: ["bpmndi:BPMNDiagram"]
};


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
                let parsedProcess = await this.parseXml({ id, xmlData, objectName, ownerId: ctx.meta.ownerId, core: _.get(ctx.meta,"acl.core",null) });
                
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
        
        parseXml({ id, xmlData, objectName, ownerId, core }) {
            let jsonObj = Parser.parse(xmlData, options);
            
            if (!jsonObj["bpmn:definitions"]) return { failed: true, err: "unvalid definition - missing element bpmn:definitions"};
          
            let idMap = {};
            function mapId(extern) {
                if (!extern) return null;
                if (!idMap[extern]) idMap[extern] = uuid();
                return idMap[extern];
            }
            
            let bpmnProcess = _.get(jsonObj,"bpmn:definitions[0].bpmn:process[0]", null);
            if (bpmnProcess) {
                bpmnProcess.process = {
                    id: id || mapId(_.get(bpmnProcess,"attr[0].@_id", null)),
                    name: objectName,
                    ownerId: ownerId,
                    core: core              // core group may listen to all events
                };
                bpmnProcess.version = {
                    id: uuid(),
                    processId: bpmnProcess.process.id,
                    created: Date.now(),
                    name: objectName,
                    ownerId: ownerId
                };
                if (Array.isArray(bpmnProcess["bpmn:sequenceFlow"])) {
                    if (!bpmnProcess.sequence) bpmnProcess.sequence = [];
                    bpmnProcess["bpmn:sequenceFlow"].forEach((s) => {
                        bpmnProcess.sequence.push({
                            processId: bpmnProcess.process.id,
                            id: mapId(_.get(s,"attr[0].@_id", null)),
                            fromId: mapId(_.get(s,"attr[0].@_sourceRef", null)),
                            toId: mapId(_.get(s,"attr[0].@_targetRef", null)),
                            type: Constants.SEQUENCE_STANDARD,
                            attributes: {},
                            ownerId: ownerId
                        });
                    });
                }
                if (Array.isArray(bpmnProcess["bpmn:businessRuleTask"])) {
                    if (!bpmnProcess.task) bpmnProcess.task = [];
                    bpmnProcess["bpmn:businessRuleTask"].forEach((t) => {
                        let task = {
                            processId: bpmnProcess.process.id,
                            versionId: bpmnProcess.version.id,
                            id: mapId(_.get(t,"attr[0].@_id", null)),
                            name: _.get(t,"attr[0].@_name", null),
                            incoming: _.get(t,"bpmn:incoming", []).map(id => mapId(id)),
                            outgoing: _.get(t,"bpmn:outgoing", []).map(id => mapId(id)),
                            type: Constants.BUSINESS_RULE_TASK,
                            attributes: {
                                contextKeys: _.get(t,"bpmn:extensionElements[0].fe:executionParameter[0].attr[0].@_contextKeys", "").split(","),
                                ruleset: _.get(t,"bpmn:extensionElements[0].fe:executionParameter[0].attr[0].@_ruleset", null),
                                contextKey: _.get(t,"bpmn:extensionElements[0].fe:executionParameter[0].attr[0].@_contextKey", null)
                            },
                            ownerId
                        };
                        bpmnProcess.task.push(task);
                    });
                }
                if (Array.isArray(bpmnProcess["bpmn:serviceTask"])) {
                    if (!bpmnProcess.task) bpmnProcess.task = [];
                    bpmnProcess["bpmn:serviceTask"].forEach((t) => {
                        let task = {
                            processId: bpmnProcess.process.id,
                            versionId: bpmnProcess.version.id,
                            id: mapId(_.get(t,"attr[0].@_id", null)),
                            name: _.get(t,"attr[0].@_name", null),
                            incoming: _.get(t,"bpmn:incoming", []).map(id => mapId(id)),
                            outgoing: _.get(t,"bpmn:outgoing", []).map(id => mapId(id)),
                            type: Constants.SERVICE_TASK,
                            attributes: {
                                contextKeys: _.get(t,"bpmn:extensionElements[0].fe:executionParameter[0].attr[0].@_contextKeys", null),
                                ruleset: _.get(t,"bpmn:extensionElements[0].fe:executionParameter[0].attr[0].@_ruleset", null),
                                paramsKey: _.get(t,"bpmn:extensionElements[0].fe:executionParameter[0].attr[0].@_paramsKey", null),
                                action: _.get(t,"bpmn:extensionElements[0].fe:executionParameter[0].attr[0].@_action", null),
                                resultKey: _.get(t,"bpmn:extensionElements[0].fe:executionParameter[0].attr[0].@_resultKey", null)
                            },
                            ownerId
                        };
                        bpmnProcess.task.push(task);
                    });
                }
                if (Array.isArray(bpmnProcess["bpmn:startEvent"])) {
                    if (!bpmnProcess.event) bpmnProcess.event = [];
                    bpmnProcess["bpmn:startEvent"].forEach((e) => {
                        let event = {
                            processId: bpmnProcess.process.id,
                            versionId: bpmnProcess.version.id,
                            id: mapId(_.get(e,"attr[0].@_id", null)),
                            name: _.get(e,"attr[0].@_name", null),
                            outgoing: _.get(e,"bpmn:outgoing", []).map(id => mapId(id)),
                            position: Constants.START_EVENT,
                            type: Constants.DEFAULT_EVENT,  // SIGNAL_EVENT
                            direction: Constants.CATCHING_EVENT,
                            interaction: null,
                            attributes: {},
                            ownerId
                        };
                        let signal = _.get(e,"bpmn:extensionElements[0].fe:executionParameter[0].attr[0].@_event", null);
                        if (signal) {
                            event.type = Constants.SIGNAL_EVENT;
                            event.attributes = {
                                event: signal,
                                contextKey: _.get(e,"bpmn:extensionElements[0].fe:executionParameter[0].attr[0].@_contextKey", null)
                            };
                        }
                        bpmnProcess.event.push(event);
                    });
                }
                if (Array.isArray(bpmnProcess["bpmn:endEvent"])) {
                    if (!bpmnProcess.event) bpmnProcess.event = [];
                    bpmnProcess["bpmn:endEvent"].forEach((e) => {
                        let event = {
                            processId: bpmnProcess.process.id,
                            versionId: bpmnProcess.version.id,
                            id: mapId(_.get(e,"attr[0].@_id", null)),
                            name: _.get(e,"attr[0].@_name", null),
                            incoming: _.get(e,"bpmn:incoming", []).map(id => mapId(id)),
                            position: Constants.END_EVENT,
                            type: Constants.DEFAULT_EVENT,
                            direction: Constants.THROWING_EVENT,
                            interaction: null,
                            attributes: {},
                            ownerId
                        };
                        bpmnProcess.event.push(event);
                    });
                }
                bpmnProcess.idMap = idMap;
            }
            
            
            return bpmnProcess;
        },
        
        async saveProcess({ parsedProcess }) {
            // 
            let process = await this.connector.addProcess(parsedProcess.process);
            let version = await this.connector.addVersion(parsedProcess.version);
            if (Array.isArray(parsedProcess.event)) {
                await Promise.all(parsedProcess.event.map((e) => this.connector.addEvent(e)));
            }
            if (Array.isArray(parsedProcess.task)) {
                await Promise.all(parsedProcess.task.map((e) => this.connector.addTask(e)));
            }
            if (Array.isArray(parsedProcess.sequence)) {
                await Promise.all(parsedProcess.sequence.map((e) => this.connector.addSequence(e)));
            }
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