"use strict";

const { ServiceBroker } = require("moleculer");
const { Controller } = require("../index");
const Constants = require("../lib/util/constants");
const { v4: uuidv4 } = require("uuid");

const groupId = uuidv4();
const userId = uuidv4();
const timestamp = Date.now();

describe("Test controller service", () => {

    let broker, service;
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
            await broker.start();
            expect(service).toBeDefined();
        });

    });

    describe("Test controller actions", () => {
    
       let opts, processes = [], tasks = [], gateways = [], events = [];
        
        beforeEach(() => {
            opts = { 
                meta: { 
                    ownerId: groupId,
                    acl: {
                        accessToken: "this is the access token",
                        ownerId: groupId,
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
                        type: Constants.SEQUENCE_STANDARD
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