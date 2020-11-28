"use strict";

const { ServiceBroker } = require("moleculer");
const { Controller } = require("../index");
const { Query } = require("../index");
const Constants = require("../lib/util/constants");
// const { v4: uuidv4 } = require("uuid");

// const timestamp = Date.now();

// helper & mocks
const { Store, load } = require("./helper/store");
const { ACL, meta, ownerId } = require("./helper/acl");

// const util = require("util");


describe("Test controller service", () => {

    let broker, service, queryService;
    beforeAll(() => {
    });
    
    afterAll(() => {
    });
    
    describe("Test create service", () => {

        it("it should start the broker", async () => {
            broker = new ServiceBroker({
                logger: console,
                logLevel: "info" //"debug"
            });
            service = await broker.createService(Controller, Object.assign({ 
                name: "v1.control",
                mixins: [Store()],
                settings: {
                    db: {
                        uri: process.env.URI,
                        user: "neo4j",
                        password: "neo4j"
                    }
                }
            }));
            queryService = await broker.createService(Query, Object.assign({ 
                name: "v1.query",
                settings: {
                    db: {
                        uri: process.env.URI,
                        user: "neo4j",
                        password: "neo4j"
                    }
                }
            }));
            // Start additional services
            [ACL].map(service => { return broker.createService(service); }); 
            await broker.start();
            expect(service).toBeDefined();
            expect(queryService).toBeDefined();
        });

    });

    describe("Test controller", () => {

        let opts, process, secondProcess, secondVersion, element;
        
        beforeEach(() => {
            opts = { 
                meta: meta
            };
        });
        
        it("it should deploy the process", async () => {
            load(ownerId,"UserRequestResetPassword.bpmn","assets/UserRequestResetPassword.bpmn");
            let params = {
                name: "UserRequestResetPassword.bpmn"
            };
            return broker.call("v1.control.deployProcess", params, opts).then(res => {
                expect(res).toBeDefined();
                // console.log(util.inspect(res, {showHidden: false, depth: null}));
                expect(res).toEqual({
                    processId: expect.any(String),
                    versionId: expect.any(String)
                });
                process = res;
            });
                
        });

        it("it should get elements of the process", async () => {
            let params = { 
                processId: process.processId,
                versionId: process.versionId
            };
            return broker.call("v1.query.getElements", params, opts).then(res => {
                expect(res).toBeDefined();
                // console.log(util.inspect(res, {showHidden: false, depth: null}));
                expect(res).toContainEqual(expect.objectContaining({
                    processId: process.processId,
                    uid: expect.any(String),
                    type: Constants.DEFAULT_EVENT,
                    ownerId: ownerId
                }));
                expect(res).toContainEqual(expect.objectContaining({
                    processId: process.processId,
                    uid: expect.any(String),
                    type: Constants.SIGNAL_EVENT,
                    ownerId: ownerId
                }));
                expect(res).toContainEqual(expect.objectContaining({
                    processId: process.processId,
                    uid: expect.any(String),
                    type: Constants.SEQUENCE_STANDARD,
                    ownerId: ownerId
                }));
                expect(res).toContainEqual(expect.objectContaining({
                    processId: process.processId,
                    uid: expect.any(String),
                    type: Constants.SERVICE_TASK,
                    ownerId: ownerId
                }));
                expect(res).toContainEqual(expect.objectContaining({
                    processId: process.processId,
                    uid: expect.any(String),
                    type: Constants.BUSINESS_RULE_TASK,
                    ownerId: ownerId
                }));
            });
        });
        
        it("it should activate the version", async () => {
            let params = { 
                processId: process.processId,
                versionId: process.versionId
            };
            return broker.call("v1.control.activateVersion", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res.processId).toEqual(process.processId);
                expect(res.versionId).toEqual(process.versionId);
                expect(res.name).toEqual("UserRequestResetPassword.bpmn");
            });
        });
        
        it("it should list the existing versions", async () => {
            let params = { 
                processId: process.processId
            };
            return broker.call("v1.control.getVersions", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res.length).toEqual(1);
                expect(res).toContainEqual(expect.objectContaining({
                    processId: process.processId,
                    versionId: process.versionId,
                    name: "UserRequestResetPassword.bpmn"
                }));
            });
        });

        it("it should deploy a second process", async () => {
            load(ownerId,"UserRequestResetPassword.bpmn","assets/UserRequestResetPassword.bpmn");
            let params = {
                name: "UserRequestResetPassword.bpmn"
            };
            return broker.call("v1.control.deployProcess", params, opts).then(res => {
                expect(res).toBeDefined();
                // console.log(util.inspect(res, {showHidden: false, depth: null}));
                expect(res).toEqual({
                    processId: expect.any(String),
                    versionId: expect.any(String)
                });
                secondProcess = res;
            });
                
        });

        it("it should list the existing processes", async () => {
            let params = { 
            };
            return broker.call("v1.control.getProcesses", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res.length).toEqual(2);
                expect(res).toContainEqual(expect.objectContaining({
                    processId: process.processId,
                    versionId: process.versionId,
                    name: "UserRequestResetPassword.bpmn"
                }));
                expect(res).toContainEqual(expect.objectContaining({
                    processId: secondProcess.processId,
                    versionId: null,
                    name: "UserRequestResetPassword.bpmn"
                }));
            });
        });

        it("it should deploy a second version", async () => {
            load(ownerId,"UserRequestResetPassword.bpmn","assets/UserRequestResetPassword.bpmn");
            let params = {
                processId: process.processId,
                name: "UserRequestResetPassword.bpmn"
            };
            return broker.call("v1.control.deployProcess", params, opts).then(res => {
                expect(res).toBeDefined();
                // console.log(util.inspect(res, {showHidden: false, depth: null}));
                expect(res).toEqual({
                    processId: process.processId,
                    versionId: expect.any(String)
                });
                secondVersion = res;
            });
                
        });

        it("it should list the existing versions", async () => {
            let params = { 
                processId: process.processId
            };
            return broker.call("v1.control.getVersions", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res.length).toEqual(2);
                expect(res).toContainEqual(expect.objectContaining({
                    processId: process.processId,
                    versionId: process.versionId,
                    name: "UserRequestResetPassword.bpmn"
                }));
                expect(res).toContainEqual(expect.objectContaining({
                    processId: process.processId,
                    versionId: secondVersion.versionId,
                    name: "UserRequestResetPassword.bpmn"
                }));
            });
        });
        
        it("it should get subscriptions", async () => {
            let params = {
                eventName: "users.password.reset.requested",
            };
            return broker.call("v1.query.subscriptions", params, opts).then(res => {
                expect(res).toBeDefined();
                console.log(res);
                expect(res.length).toBeGreaterThanOrEqual(1);
                expect(res).toContainEqual(expect.objectContaining({
                    processId: process.processId,
                    elementId: expect.any(String),
                    type: Constants.SIGNAL_EVENT,
                    ownerId: ownerId,
                    attributes: {
                        event: "users.password.reset.requested",
                        contextKey: "user"
                    }   
                }));
                element = res.find(e => { return e.processId === process.processId; });
            });
        });

        it("it should get event element", async () => {
            let params = {
                processId: element.processId,
                elementId: element.elementId
            };
            return broker.call("v1.query.getEvent", params, opts).then(res => {
                expect(res).toBeDefined();
                // console.log(res);
                expect(res.length).toEqual(1);
                expect(res).toContainEqual(expect.objectContaining({
                    processId: process.processId,
                    versionId: process.versionId,
                    name: "users.password.reset.requested",
                    uid: element.elementId,
                    position: Constants.START_EVENT,
                    type: Constants.SIGNAL_EVENT,
                    direction: Constants.CATCHING_EVENT,
                    ownerId: ownerId,
                    attributes: {
                        event: "users.password.reset.requested",
                        contextKey: "user"
                    }   
                }));
                element = res[0];
            });
        });
        
        it("it should get sequence from event to first task", async () => {
            let params = {
                processId: element.processId,
                elementId: element.uid
            };
            return broker.call("v1.query.next", params, opts).then(res => {
                expect(res).toBeDefined();
                // console.log(res);
                expect(res.length).toEqual(1);
                expect(res).toContainEqual(expect.objectContaining({
                    processId: process.processId,
                    ownerId: ownerId,
                    uid: expect.any(String),
                    type: Constants.SEQUENCE_STANDARD
                }));
                element = res[0];
            });
        });
        
        it("it should get sequence element", async () => {
            let params = {
                processId: element.processId,
                elementId: element.uid
            };
            return broker.call("v1.query.getSequence", params, opts).then(res => {
                expect(res).toBeDefined();
                // console.log(res);
                expect(res.length).toEqual(1);
                expect(res).toContainEqual(expect.objectContaining({
                    processId: process.processId,
                    uid: element.uid,
                    from: expect.any(String),
                    to: expect.any(String),
                    type: Constants.SEQUENCE_STANDARD,
                    ownerId: ownerId,
                    attributes: expect.any(Object)  
                }));
            });
        });
        
        it("it should get first task", async () => {
            let params = {
                processId: element.processId,
                elementId: element.uid
            };
            return broker.call("v1.query.next", params, opts).then(res => {
                expect(res).toBeDefined();
                // console.log(res);
                expect(res.length).toEqual(1);
                expect(res).toContainEqual(expect.objectContaining({
                    processId: process.processId,
                    ownerId: ownerId,
                    uid: expect.any(String),
                    type: Constants.BUSINESS_RULE_TASK
                }));
                element = res[0];
            });
        });
        
        it("it should get details of first task", async () => {
            let params = {
                processId: element.processId,
                elementId: element.uid
            };
            return broker.call("v1.query.getTask", params, opts).then(res => {
                expect(res).toBeDefined();
                // console.log(res);
                expect(res.length).toEqual(1);
                expect(res).toContainEqual(expect.objectContaining({
                    processId: process.processId,
                    versionId: process.versionId,
                    uid: element.uid,
                    name: "parameters for rendering html",
                    type: Constants.BUSINESS_RULE_TASK,
                    ownerId: ownerId,
                    attributes: {
                        ruleset: "parameters.render.body",
                        contextKeys: ["user"],
                        contextKey: "parameters.render.body"
                    }   
                }));
            });
        });
        
    });
    
    describe("Test stop broker", () => {
        it("should stop the broker", async () => {
            expect.assertions(1);
            await broker.stop();
            expect(broker).toBeDefined();
        });
    });    
    
});