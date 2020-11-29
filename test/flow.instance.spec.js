"use strict";

const { ServiceBroker } = require("moleculer");
const { Instance } = require("../index");
const Constants = require("../lib/util/constants");
const { v4: uuidv4 } = require("uuid");

const ownerId = uuidv4();
const userId = uuidv4();

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
            service = await broker.createService(Instance, Object.assign({ 
                name: "v1.instance",
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

    describe("Test instance actions", () => {
    
        let opts, instances = [];
        
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
        
        /*
        it("it should create an instance", async () => {
            let params = {
                processId: uuidv4()
            };
            let res = await broker.call("v1.instance.createInstance", params, opts);
            expect(res).toBeDefined();
            expect(res.instanceId).toBeDefined();
            instances.push(res);
        });
        */
        
        it("it should create an instance", async () => {
            let instance = {
                ownerId: ownerId,
                processId: uuidv4(),
                instanceId: uuidv4()
            };
            await broker.emit("flow.instance.created", instance);
            instances.push(instance);
        });
        // ctx.emit("flow.instance.created", { ownerId: ownerId, processId: subscription.processId, instanceId: instanceId });
      
        it("it should update an instance", async () => {
            let params = {
                processId: instances[0].processId,
                instanceId: instances[0].instanceId,
                failed: true
            };
            let res = await broker.call("v1.instance.update", params, opts);
            expect(res).toBeDefined();
            instances[0].status = Constants.INSTANCE_FAILED;
            expect(res).toEqual(instances[0]);
        });
        
        it("it should create a second instance", async () => {
            let params = {
                processId: instances[0].processId
            };
            let res = await broker.call("v1.instance.create", params, opts);
            expect(res).toBeDefined();
            expect(res.instanceId).toBeDefined();
            instances.push(res);
        });
        
        it("it should create a third instance", async () => {
            let params = {
                processId: instances[0].processId
            };
            let res = await broker.call("v1.instance.create", params, opts);
            expect(res).toBeDefined();
            expect(res.instanceId).toBeDefined();
            instances.push(res);
        });
        
        it("it should return all instances", async () => {
            let params = {
                processId: instances[0].processId,
                running: true,
                failed: true
            };
            let res = await broker.call("v1.instance.getRunning", params, opts);
            console.log(res);
            expect(res).toBeDefined();
            expect(res.length).toEqual(3);
        });
        
        it("it should return the failed instance", async () => {
            let params = {
                processId: instances[0].processId,
                running: false,
                failed: true
            };
            let res = await broker.call("v1.instance.getRunning", params, opts);
            expect(res).toBeDefined();
            expect(res.length).toEqual(1);
            expect(res).toContainEqual(expect.objectContaining(instances[0]));
        });
        
        it("it should return the two running instances", async () => {
            let params = {
                processId: instances[0].processId,
                running: true,
                failed: false
            };
            let res = await broker.call("v1.instance.getRunning", params, opts);
            expect(res).toBeDefined();
            expect(res.length).toEqual(2);
            expect(res).toContainEqual(expect.objectContaining(instances[1]));
            expect(res).toContainEqual(expect.objectContaining(instances[2]));
        });

        it("it should update an instance", async () => {
            let params = {
                processId: instances[0].processId,
                instanceId: instances[0].instanceId,
                failed: true
            };
            let res = await broker.call("v1.instance.update", params, opts);
            expect(res).toBeDefined();
            instances[0].status = Constants.INSTANCE_FAILED;
            expect(res).toEqual(instances[0]);
        });
        
        it("it should delete an instance", async () => {
            let params = {
                processId: instances[0].processId,
                instanceId: instances[0].instanceId,
                completed: true
            };
            let res = await broker.call("v1.instance.update", params, opts);
            expect(res).toBeDefined();
            expect(res.length).toEqual(0);
        });
        
        it("it should delete the second instance", async () => {
            let params = {
                processId: instances[1].processId,
                instanceId: instances[1].instanceId,
                completed: true
            };
            let res = await broker.call("v1.instance.update", params, opts);
            expect(res).toBeDefined();
            expect(res.length).toEqual(0);
        });
        
        it("it should delete the third instance", async () => {
            let params = {
                processId: instances[2].processId,
                instanceId: instances[2].instanceId,
                completed: true
            };
            let res = await broker.call("v1.instance.update", params, opts);
            expect(res).toBeDefined();
            expect(res.length).toEqual(0);
        });        
        
        it("it should return no instances", async () => {
            let params = {
                processId: instances[0].processId,
                running: true,
                failed: true
            };
            let res = await broker.call("v1.instance.getRunning", params, opts);
            expect(res).toBeDefined();
            expect(res.length).toEqual(0);
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