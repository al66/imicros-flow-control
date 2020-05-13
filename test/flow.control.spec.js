"use strict";

const { ServiceBroker } = require("moleculer");
const { Controller } = require("../index");
const { Query } = require("../index");
const Constants = require("../lib/util/constants");
const { v4: uuidv4 } = require("uuid");

const ownerId = uuidv4();
const userId = uuidv4();
const timestamp = Date.now();

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
            await broker.start();
            expect(service).toBeDefined();
            expect(queryService).toBeDefined();
        });

    });

    describe("Test controller actions", () => {
    
       let opts, processes = [], tasks = [], gateways = [], events = [], sequences = [];
        
        beforeEach(() => {
            opts = { 
                meta: { 
                    ownerId: ownerId,
                    acl: {
                        accessToken: "this is the access token",
                        ownerId: ownerId,
                        unrestricted: true
                    }, 
                    user: { 
                        id: userId , 
                        email: `${userId}@host.com` }
                } 
            };
        });
        
        it("it should add a new process", () => {
            let params = { 
                name: "my first process"
            };
            return broker.call("v1.control.addProcess", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res).toContainEqual(expect.objectContaining({
                    id: expect.any(String)
                }));
                processes["P1"] = res[0].id;
            });
            
        });
        
        it("it should add an event", async () => {
            let params = { 
                processId: processes["P1"],
                name: "mail.received",
                position: Constants.START_EVENT,
                type: Constants.DEFAULT_EVENT,
                direction: Constants.CATCHING_EVENT
            };
            return broker.call("v1.control.addEvent", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res).toContainEqual(expect.objectContaining({
                    id: expect.any(String)
                }));
                events["S1"] = res[0].id;
            });
        });
   
        it("it should get the event", async () => {
            let params = { 
                processId: processes["P1"],
                elementId: events["S1"]
            };
            return broker.call("v1.query.getEvent", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res).toContainEqual(expect.objectContaining({
                    processId: processes["P1"],
                    uid: events["S1"],
                    ownerId: ownerId,
                    name: "mail.received",
                    position: Constants.START_EVENT,
                    type: Constants.DEFAULT_EVENT,
                    direction: Constants.CATCHING_EVENT
                }));
            });
        });
   
        it("it should get subscriptions", async () => {
            let params = { 
                name: "mail.received"
            };
            return broker.call("v1.query.subscriptions", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res).toContainEqual(expect.objectContaining({
                    processId: processes["P1"],
                    elementId: events["S1"],
                    ownerId: ownerId,
                    type: Constants.DEFAULT_EVENT
                }));
            });
        });
   
        it("it should add a task", async () => {
            let params = { 
                processId: processes["P1"],
                name: "my first task in the process",
                attributes: {
                    service: "test",
                    action: "action"
                }
            };
            return broker.call("v1.control.addTask", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res).toContainEqual(expect.objectContaining({
                    id: expect.any(String)
                }));
                tasks["T1"] = res[0].id;
            });
        });
   
        it("it should get the task", async () => {
            let params = { 
                processId: processes["P1"],
                elementId: tasks["T1"]
            };
            return broker.call("v1.query.getTask", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res).toContainEqual(expect.objectContaining({
                    processId: processes["P1"],
                    uid: tasks["T1"],
                    ownerId: ownerId,
                    type: Constants.SERVICE_TASK,
                    name: "my first task in the process",
                    attributes: {
                        service: "test",
                        action: "action"
                    }
                }));
            });
        });
   
        it("it should add a gateway", async () => {
            let params = { 
                processId: processes["P1"],
                name: "first gateway",
                type: Constants.EXCLUSIVE_GATEWAY
            };
            return broker.call("v1.control.addGateway", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res).toContainEqual(expect.objectContaining({
                    id: expect.any(String)
                }));
                gateways["G1"] = res[0].id;
            });
        });
       
        it("it should get the gateway", async () => {
            let params = { 
                processId: processes["P1"],
                elementId: gateways["G1"]
            };
            return broker.call("v1.query.getGateway", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res).toContainEqual(expect.objectContaining({
                    processId: processes["P1"],
                    uid: gateways["G1"],
                    ownerId: ownerId,
                    type: Constants.EXCLUSIVE_GATEWAY,
                    name: "first gateway"
                }));
            });
        });
   
        it("it should add a sequence flow from gateway to task", async () => {
            let params = { 
                processId: processes["P1"],
                from: gateways["G1"],
                to: tasks["T1"]
            };
            return broker.call("v1.control.addSequence", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res).toContainEqual(expect.objectContaining({
                    connection: {
                        from: gateways["G1"],
                        to: tasks["T1"],
                        type: Constants.SEQUENCE_STANDARD,
                        uid: expect.any(String)
                    }
                }));
                sequences["S1"] = res[0].connection.uid;
            });
        });
       
        it("it should get the sequence", async () => {
            let params = { 
                processId: processes["P1"],
                elementId: sequences["S1"]
            };
            return broker.call("v1.query.getSequence", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res).toContainEqual(expect.objectContaining({
                    processId: processes["P1"],
                    uid: sequences["S1"],
                    ownerId: ownerId,
                    from: gateways["G1"],
                    to: tasks["T1"],
                    type: Constants.SEQUENCE_STANDARD
                }));
            });
        });
   
        it("it should get elements of the process", async () => {
            let params = { 
                processId: processes["P1"]
            };
            return broker.call("v1.query.getElements", params, opts).then(res => {
                expect(res).toBeDefined();
                expect(res).toContainEqual(expect.objectContaining({
                    processId: processes["P1"],
                    uid: events["S1"],
                    type: Constants.DEFAULT_EVENT,
                    ownerId: ownerId
                }));
                expect(res).toContainEqual(expect.objectContaining({
                    processId: processes["P1"],
                    uid: tasks["T1"],
                    type: Constants.SERVICE_TASK,
                    ownerId: ownerId
                }));
                expect(res).toContainEqual(expect.objectContaining({
                    processId: processes["P1"],
                    uid: gateways["G1"],
                    type: Constants.EXCLUSIVE_GATEWAY,
                    ownerId: ownerId
                }));
                expect(res).toContainEqual(expect.objectContaining({
                    processId: processes["P1"],
                    uid: sequences["S1"],
                    type: Constants.SEQUENCE_STANDARD,
                    ownerId: ownerId
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