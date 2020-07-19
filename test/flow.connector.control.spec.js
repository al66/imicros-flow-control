"use strict";

const Connector = require("../lib/connector/neo4j");
const { ServiceBroker } = require("moleculer");
//const { Serializer } = require("../index");
const Constants = require("../lib/util/constants");
const { v4: uuid } = require("uuid");

const ownerId = uuid();
const timestamp = Date.now();
//const serializer = new Serializer();
//const util = require("util");

let broker, connector;
beforeAll(() => {
    broker = new ServiceBroker({
        logger: console,
        logLevel: "debug", //"debug"
    });
    return broker.start()
        .then(() => {
            //
        });
});

afterAll(async () => {
});

describe("Test connector", () => {
    
    describe("Test connect", () => {
        
        it("it should initialize the connector and connect to database", async () => {
            let options = {
                uri: process.env.URI,
                user: "neo4j",
                password: "neo4j"
            };
            connector = new Connector(broker, options);
            connector.connect();
            expect(connector instanceof Connector).toEqual(true);
        });

        it("it should create constraints", async () => {
            let res = await connector.createConstraints();
            expect(res).toBeDefined();
            expect(res).toEqual(true);
        });

        it("it should run a simple statement", async () => {
            let params = {
                name: "flow.connector"
            };
            let statement = "MERGE (s:Service { name: {name}}) RETURN s.name AS name";
            let res = await connector.run(statement, params);
            expect(res).toBeDefined();
            expect(res).toContainEqual(expect.objectContaining({
                name: params.name
            }));
        });

        it("it should run multiple simple statement", async () => {
            for (let i=1; i <= 5; i++) {
                let params = {
                    name: "flow.connector_" + i
                };
                let statement = "MERGE (s:Service { name: {name}}) RETURN s.name AS name";
                let res = await connector.run(statement, params);
                expect(res).toBeDefined();
                expect(res).toContainEqual(expect.objectContaining({
                    name: params.name
                }));
            }
        });

        it("it should run batches", async () => {
            let params = {
                batches: []
            };
            for (let i=1; i <= 100; i++) {
                params.batches.push({
                    name: "flow.connector_batch_" + i
                });
            }
            let statement = "UNWIND {batches} as batch MERGE (s:Service { name: batch.name})";
            let res = await connector.run(statement, params);
            expect(res).toBeDefined();
            expect(res).toEqual([]);
        });
   
    });
    
    describe("Test control", () => {
        
        let processes = [], tasks = [], gateways = [], events = [], sequences = [];
        
        it("it should add a process", async () => {
            let process = { 
                name: "my first process",
                ownerId: `group1-${timestamp}`
            };
            let res = await connector.addProcess(process);
            expect(res).toBeDefined();
            expect(res).toContainEqual(expect.objectContaining({
                id: expect.any(String)
            }));
            processes["P1"] = res[0].id;
        });
   
        it("it should add an event", async () => {
            let event = {
                processId: processes["P1"],
                name: "mail.received",
                position: Constants.START_EVENT,
                type: Constants.DEFAULT_EVENT,
                direction: Constants.CATCHING_EVENT,
                ownerId: `group1-${timestamp}`
            };
            let res = await connector.addEvent(event);
            expect(res).toBeDefined();
            expect(res).toContainEqual(expect.objectContaining({
                id: expect.any(String)
            }));
            events["S1"] = res[0].id;
        });
   
        it("it should get element event ", async () => {
            let element = {
                processId: processes["P1"],
                elementId: events["S1"],
                ownerId: `group1-${timestamp}`
            };
            let res = await connector.getEvent(element);
            expect(res).toBeDefined();
            expect(res[0]).toMatchObject({
                processId: processes["P1"],
                name: "mail.received",
                position: Constants.START_EVENT,
                type: Constants.DEFAULT_EVENT,
                direction: Constants.CATCHING_EVENT,
                uid: events["S1"],
                ownerId: `group1-${timestamp}`
            });
        });
        
        it("it should add a task", async () => {
            let task = {
                processId: processes["P1"],
                name: "my first task in the process",
                ownerId: `group1-${timestamp}`,
                attributes: {
                    service: "test",
                    action: "action",
                    map: { 
                        attrib1: "context.firststep.result",
                        attrib2: "context.secondstep.result"
                    }
                }
            };
            let res = await connector.addTask(task);
            expect(res).toBeDefined();
            expect(res).toContainEqual(expect.objectContaining({
                id: expect.any(String)
            }));
            tasks["T1"] = res[0].id;
        });
   
        it("it should get element task ", async () => {
            let task = {
                processId: processes["P1"],
                name: "my first task in the process",
                ownerId: `group1-${timestamp}`,
                attributes: {
                    service: "test",
                    action: "action",
                    map: { 
                        attrib1: "context.firststep.result",
                        attrib2: "context.secondstep.result"
                    }
                }
            };
            let element = {
                processId: processes["P1"],
                elementId: tasks["T1"],
                ownerId: `group1-${timestamp}`
            };
            let res = await connector.getTask(element);
            expect(res).toBeDefined();
            expect(res[0]).toMatchObject({
                processId: task.processId,
                name: task.name,
                type: expect.any(String),
                ownerId: task.ownerId,
                uid: expect.any(String),
                attributes: task.attributes
            });
        });
        
        it("it should add a second task", async () => {
            let task = {
                processId: processes["P1"],
                name: "my second task in the process",
                ownerId: `group1-${timestamp}`
            };
            let res = await connector.addTask(task);
            expect(res).toBeDefined();
            expect(res).toContainEqual(expect.objectContaining({
                id: expect.any(String)
            }));
            tasks["T2"] = res[0].id;
        });
   
        it("it should add a third task", async () => {
            let task = {
                processId: processes["P1"],
                name: "my third task in the process",
                ownerId: `group1-${timestamp}`
            };
            let res = await connector.addTask(task);
            expect(res).toBeDefined();
            expect(res).toContainEqual(expect.objectContaining({
                id: expect.any(String)
            }));
            tasks["T3"] = res[0].id;
        });
   
        it("it should add a gateway", async () => {
            let gateway = {
                processId: processes["P1"],
                type: Constants.EXCLUSIVE_GATEWAY,
                ownerId: `group1-${timestamp}`,
                attributes: {
                    rule: "@@ > result:=0 @ a :: > b => result := 1",
                    function: "(c) => { let r=0; if (c.a > c.b) r=1; return r; }"  
                }
            };
            let res = await connector.addGateway(gateway);
            expect(res).toBeDefined();
            expect(res).toContainEqual(expect.objectContaining({
                id: expect.any(String)
            }));
            gateways["G1"] = res[0].id;
        });

        it("it should get element gateway ", async () => {
            let element = {
                processId: processes["P1"],
                elementId: gateways["G1"],
                ownerId: `group1-${timestamp}`
            };
            let res = await connector.getGateway(element);
            expect(res).toBeDefined();
            expect(res[0]).toMatchObject({
                processId: processes["P1"],
                type: Constants.EXCLUSIVE_GATEWAY,
                uid: gateways["G1"],
                ownerId: `group1-${timestamp}`,
                attributes: {
                    rule: "@@ > result:=0 @ a :: > b => result := 1",
                    function: "(c) => { let r=0; if (c.a > c.b) r=1; return r; }"  
                }
            });
        });
   
        it("it should add sequence flow from event to gateway", async () => {
            let connection = {
                fromId: events["S1"],
                toId: gateways["G1"],
                ownerId: `group1-${timestamp}`
            };
            let res = await connector.addSequence(connection);
            expect(res).toBeDefined();
            expect(res).toContainEqual(expect.objectContaining({
                connection: {
                    from: events["S1"],
                    to: gateways["G1"],
                    type: Constants.SEQUENCE_STANDARD,
                    uid: expect.any(String)
                }
            }));
            sequences.push(res[0].connection);
            console.log(sequences[0]);
        });
   
        it("it should get element sequence ", async () => {
            let element = {
                processId: processes["P1"],
                elementId: sequences[0].uid,
                ownerId: `group1-${timestamp}`
            };
            let res = await connector.getSequence(element);
            expect(res).toBeDefined();
            expect(res[0]).toMatchObject({
                processId: processes["P1"],
                from: sequences[0].from,
                to: sequences[0].to,
                type: sequences[0].type,
                uid: sequences[0].uid,
                ownerId: `group1-${timestamp}`
            });
        });
   
        it("it should add sequence flow from gateway to task", async () => {
            let connection = {
                fromId: gateways["G1"],
                toId: tasks["T1"],
                ownerId: `group1-${timestamp}`
            };
            let res = await connector.addSequence(connection);
            expect(res).toBeDefined();
            expect(res).toContainEqual(expect.objectContaining({
                connection: {
                    from: gateways["G1"],
                    to: tasks["T1"],
                    type: Constants.SEQUENCE_STANDARD,
                    uid: expect.any(String)
                }
            }));
            sequences.push(res[0].connection);
        });
   
        it("it should add a conditional sequence flow from task 1 to task 2 ", async () => {
            let connection = {
                fromId: tasks["T1"],
                toId: tasks["T2"],
                type: Constants.SEQUENCE_CONDITIONAL,
                attributes: {
                    rule: "@@ > result:=0 @ a :: > b => result := 1",
                    function: (c) => { let r=0; if (c.a > c.b) r=1; return r; }
                },
                ownerId: `group1-${timestamp}`
            };
            let res = await connector.addSequence(connection);
            expect(res).toBeDefined();
            expect(res).toContainEqual(expect.objectContaining({
                connection: {
                    from: tasks["T1"],
                    to: tasks["T2"],
                    type: Constants.SEQUENCE_CONDITIONAL,
                    uid: expect.any(String)
                }
            }));
        });
   
        it("it should add a conditional sequence flow from task 1 to task 3 ", async () => {
            let connection = {
                fromId: tasks["T1"],
                toId: tasks["T3"],
                type: Constants.SEQUENCE_CONDITIONAL,
                attributes: {
                    rule: "@@ > result:=0 @ a :: > b => result := 2",
                    function: (c) => { let r=0; if (c.a > c.b) r=2; return r; }  ,
                },
                ownerId: `group1-${timestamp}`
            };
            let res = await connector.addSequence(connection);
            expect(res).toBeDefined();
            expect(res).toContainEqual(expect.objectContaining({
                connection: {
                    from: tasks["T1"],
                    to: tasks["T3"],
                    type: Constants.SEQUENCE_CONDITIONAL,
                    uid: expect.any(String)
                }
            }));
        });
   
        it("it should get sequence from event to gateway ", async () => {
            let element = {
                processId: processes["P1"],
                elementId: events["S1"],
                ownerId: `group1-${timestamp}`
            };
            let res = await connector.getNext(element);
            expect(res).toBeDefined();
            expect(res[0]).toMatchObject({
                processId: processes["P1"],
                uid: sequences[0].uid,
                type: sequences[0].type,
                ownerId: `group1-${timestamp}`
            });
        });
   
        it("it should get gateway ", async () => {
            let element = {
                processId: processes["P1"],
                elementId: sequences[0].uid,
                ownerId: `group1-${timestamp}`
            };
            let res = await connector.getNext(element);
            expect(res).toBeDefined();
            expect(res[0]).toMatchObject({
                processId: processes["P1"],
                uid: gateways["G1"],
                type: Constants.EXCLUSIVE_GATEWAY,
                ownerId: `group1-${timestamp}`
            });
        });        
        
        it("it should get all elements of the process ", async () => {
            let process = {
                processId: processes["P1"],
                ownerId: `group1-${timestamp}`
            };
            let res = await connector.getElements(process);
            expect(res).toBeDefined();
            expect(res).toContainEqual(expect.objectContaining({
                processId: processes["P1"],
                uid: gateways["G1"],
                type: Constants.EXCLUSIVE_GATEWAY,
                ownerId: `group1-${timestamp}`
            }));
            expect(res).toContainEqual(expect.objectContaining({
                processId: processes["P1"],
                uid: sequences[0].uid,
                type: sequences[0].type,
                ownerId: `group1-${timestamp}`
            }));
            expect(res).toContainEqual(expect.objectContaining({
                processId: processes["P1"],
                uid: sequences[1].uid,
                type: sequences[1].type,
                ownerId: `group1-${timestamp}`
            }));
            expect(res).toContainEqual(expect.objectContaining({
                processId: processes["P1"],
                uid: events["S1"],
                type: Constants.DEFAULT_EVENT,
                ownerId: `group1-${timestamp}`
            }));
            expect(res).toContainEqual(expect.objectContaining({
                processId: processes["P1"],
                uid: tasks["T1"],
                type: expect.any(String),
                ownerId: `group1-${timestamp}`
            }));
            expect(res).toContainEqual(expect.objectContaining({
                processId: processes["P1"],
                uid: tasks["T2"],
                type: expect.any(String),
                ownerId: `group1-${timestamp}`
            }));
            expect(res).toContainEqual(expect.objectContaining({
                processId: processes["P1"],
                uid: tasks["T3"],
                type: expect.any(String),
                ownerId: `group1-${timestamp}`
            }));
        });        

        it("it should add an second event", async () => {
            let event = {
                processId: processes["P1"],
                name: "user.found",
                position: Constants.INTERMEDIATE_EVENT,
                type: Constants.DEFAULT_EVENT,
                direction: Constants.CATCHING_EVENT,
                ownerId: `group1-${timestamp}`
            };
            let res = await connector.addEvent(event);
            expect(res).toBeDefined();
            expect(res).toContainEqual(expect.objectContaining({
                id: expect.any(String)
            }));
            events["S2"] = res[0].id;
        });
   
        
        it("it should get first event as subscription", async () => {
            let event = {
                name: "mail.received",
                ownerId: `group1-${timestamp}`
            };
            let res = await connector.getSubscriptions(event);
            expect(res).toBeDefined();
            expect(res).toContainEqual(expect.objectContaining({
                processId: processes["P1"],
                elementId: events["S1"],
                type: expect.any(String),
                ownerId: `group1-${timestamp}`
            }));
        });
   
        it("it should get second event as subscription", async () => {
            let event = {
                name: "user.found",
                ownerId: `group1-${timestamp}`
            };
            let res = await connector.getSubscriptions(event);
            expect(res).toBeDefined();
            expect(res).toContainEqual(expect.objectContaining({
                processId: processes["P1"],
                elementId: events["S2"],
                type: expect.any(String),
                ownerId: `group1-${timestamp}`
            }));
        });
   
        it("it should return sequence", async () => {
            let element = {
                processId: processes["P1"],
                elementId: events["S1"],
                ownerId: `group1-${timestamp}`
            };
            let res = await connector.getNext(element);
            expect(res).toBeDefined();
            expect(res).toContainEqual(expect.objectContaining({
                processId: processes["P1"],
                uid: sequences[0].uid,
                type: expect.any(String),
                ownerId: `group1-${timestamp}`
            }));
        });
        /*
        it("it should delete sequence flow from event to gateway", async () => {
            let connection = {
                fromId: events["S1"],
                toId: gateways["G1"],
                owner: {
                    type: "group",
                    id: `group1-${timestamp}`
                }
            };
            let res = await connector.removeSequence(connection);
            expect(res).toBeDefined();
            expect(res).toEqual([]);
        });

        it("it should delete a gateway", async () => {
            let gateway = {
                processId: processes["P1"],
                id: gateways["G1"],
                owner: {
                    type: "group",
                    id: `group1-${timestamp}`
                }
            };
            let res = await connector.removeGateway(gateway);
            expect(res).toBeDefined();
            expect(res).toEqual([]);
        });
   
        it("it should delete an event", async () => {
            let event = {
                processId: processes["P1"],
                id: events["S1"],
                owner: {
                    type: "group",
                    id: `group1-${timestamp}`
                }
            };
            let res = await connector.removeEvent(event);
            expect(res).toBeDefined();
            expect(res).toEqual([]);
        });
   
        it("it should delete a task", async () => {
            let task = {
                processId: processes["P1"],
                id: tasks["T1"],
                owner: {
                    type: "group",
                    id: `group1-${timestamp}`
                }
            };
            let res = await connector.removeTask(task);
            expect(res).toBeDefined();
            expect(res).toEqual([]);
        });
   
        it("it should remove the whole process", async () => {
            let process = {
                id: processes["P1"],
                owner: {
                    type: "group",
                    id: `group1-${timestamp}`
                }
            };
            let res = await connector.removeProcess(process);
            expect(res).toBeDefined();  
            expect(res).toEqual([]);
        });
        
        */
        
    });

    describe("Test instance", () => {
        
        let instances = [];
        
        
        it("it should create an instance", async () => {
            let instance = {
                processId: uuid(),
                ownerId: ownerId,
                instanceId: uuid(),
                status: Constants.INSTANCE_RUNNING
            };
            instances.push(instance);
            let res = await connector.updateInstance(instance);
            expect(res).toBeDefined();
            expect(res.length).toEqual(1);
            expect(res[0]).toEqual(instance);
        });
        
        it("it should update an instance", async () => {
            let instance = {
                processId: instances[0].processId,
                ownerId: instances[0].ownerId,
                instanceId: instances[0].instanceId,
                status: Constants.INSTANCE_FAILED
            };
            let res = await connector.updateInstance(instance);
            expect(res).toBeDefined();
            expect(res.length).toEqual(1);
            expect(res[0]).toEqual(instance);
            instances[0].status = instance.status;
        });
        
        it("it should create a second instance", async () => {
            let instance = {
                processId: instances[0].processId,
                ownerId: ownerId,
                instanceId: uuid(),
                status: Constants.INSTANCE_RUNNING
            };
            instances.push(instance);
            let res = await connector.updateInstance(instance);
            expect(res).toBeDefined();
            expect(res.length).toEqual(1);
            expect(res[0]).toEqual(instance);
        });
        
        it("it should create a third instance", async () => {
            let instance = {
                processId: instances[0].processId,
                ownerId: ownerId,
                instanceId: uuid(),
                status: Constants.INSTANCE_RUNNING
            };
            instances.push(instance);
            let res = await connector.updateInstance(instance);
            expect(res).toBeDefined();
            expect(res.length).toEqual(1);
            expect(res[0]).toEqual(instance);
        });
        
        it("it should return all instances", async () => {
            let selection = {
                processId: instances[0].processId,
                ownerId: instances[0].ownerId
            };
            let res = await connector.getInstances(selection);
            expect(res).toBeDefined();
            expect(res.length).toEqual(3);
            console.log(res);
        });
        
        it("it should return the failed instance", async () => {
            let selection = {
                processId: instances[0].processId,
                ownerId: instances[0].ownerId,
                failed: true
            };
            let res = await connector.getInstances(selection);
            expect(res).toBeDefined();
            expect(res.length).toEqual(1);
            expect(res).toContainEqual(expect.objectContaining(instances[0]));
            console.log(res);
        });
        
        it("it should return the two running instances", async () => {
            let selection = {
                processId: instances[0].processId,
                ownerId: instances[0].ownerId,
                running: true
            };
            let res = await connector.getInstances(selection);
            expect(res).toBeDefined();
            expect(res.length).toEqual(2);
            expect(res).toContainEqual(expect.objectContaining(instances[1]));
            expect(res).toContainEqual(expect.objectContaining(instances[2]));
            console.log(res);
        });
        
        it("it should delete an instance", async () => {
            let instance = {
                processId: instances[0].processId,
                ownerId: instances[0].ownerId,
                instanceId: instances[0].instanceId
            };
            let res = await connector.deleteInstance(instance);
            expect(res).toBeDefined();
            expect(res.length).toEqual(0);
        });
        
        it("it should delete the second instance", async () => {
            let instance = {
                processId: instances[1].processId,
                ownerId: instances[1].ownerId,
                instanceId: instances[1].instanceId
            };
            let res = await connector.deleteInstance(instance);
            expect(res).toBeDefined();
            expect(res.length).toEqual(0);
        });
        
        it("it should delete the third instance", async () => {
            let instance = {
                processId: instances[2].processId,
                ownerId: instances[2].ownerId,
                instanceId: instances[2].instanceId
            };
            let res = await connector.deleteInstance(instance);
            expect(res).toBeDefined();
            expect(res.length).toEqual(0);
        });
        
    });
    
    describe("Test stop broker", () => {
        it("should stop the broker", async () => {
            expect.assertions(1);
            await connector.disconnect();
            await broker.stop();
            expect(broker).toBeDefined();
        });
    });        
    
});
    