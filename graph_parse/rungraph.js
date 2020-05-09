window.debug = {
    scenarios: {},
    blockedBlocks: [],
    events: []
};

function writeToConsole(message) {
    let myConsole = document.getElementById("ConsoleText1");
    if (myConsole !== undefined && myConsole !== null) {
        myConsole.value += message +"\n" ;
    }
}

function getBlockedEvents() {
    var res = []
    window.bpEngine.BThreads.forEach(bt => {
        bt.stmt.block.forEach(e => res.push(e));
    });
    return res;
}

window.bpEngine = {
    BThreads: [],

    sync: function* (stmt) {
        yield stmt;
    },

    registerBThread: (bt) => {
        let x = bt.next().value;
        let b = {iterator: bt, stmt: fixStmt(x)};
        window.bpEngine.BThreads.push(b);
    },

    run: function* () {
        while (true) {
            ///////
            //let blockedEvents = getBlockedEvents();
            //let curBlocked = []
            //blockedEvents.forEach(e => {
                //window.bpEngine.BThreads.forEach(bt => {
                    //if(isReqWait(bt, e))
                        //curBlocked.push(bt.stmt.cellID);
                //});
            //});
            //window.debug.blockedBlocks.push(curBlocked);
            ////////
            let e = getEvent();
            if (e === null)
                yield 'waiting for an event';
            fixStages(e);
            console.log(e + "\n");
            writeToConsole("event selected: " + e);
            window.bpEngine.BThreads.forEach(bt => {
                if (isReqWait(bt, e)) {
                    bt.stmt = fixStmt(bt.iterator.next().value)
                }
            })
        }
    }
};

// // to be implemented
// function waitForEvent() {
// }

function fixStmt(stmt) {
    if (stmt === undefined)
        return {request: [], block: [], wait: []};
    if (stmt.request === undefined)
        stmt.request = [];
    if (stmt.block === undefined)
        stmt.block = [];
    if (stmt.wait === undefined)
        stmt.wait = [];
    return stmt
}

function isReqWait(bt, e) {
    return bt.stmt.request.includes(e) || bt.stmt.wait.includes(e)
}

function getEvent() {
    let requests = new Set();
    let blocks = new Set();
    window.bpEngine.BThreads.forEach(bt => {
        bt.stmt.request.forEach(requests.add, requests);
        bt.stmt.block.forEach(blocks.add, blocks);
    });
    let diff = [...requests].filter(x => ![...blocks].includes(x));
    return getRandomItem(diff);
}

// get random item from a Set
function getRandomItem(set) {
    let items = Array.from(set);
    if (items.length === 0)
        return null;
    return items[Math.floor(Math.random() * items.length)];
}

function* goToFollowers(c, payloads, bpEngine, model, outputs, scen) {
    let edg = model.getEdges(c, false, true, true);

    if (edg.length > 0) {
        // Run extra followers in new threads
        for (let i = 1; i < edg.length; i++) {
            let target = edg[i].getTerminal(false);
            if (target !== undefined) {
                let edgeLabel = edg[i].getAttribute("label");
                if (edgeLabel !== undefined && outputs !== undefined) {
                    if (outputs[edgeLabel] !== undefined) {
                        let nextPayloads = outputs[edgeLabel];
                        runInNewBT(target, nextPayloads, bpEngine, model, window.debug.scenarios[scen].length);
                    }
                }
            }
        }
        // Run the first follower in the same thread.
        let target = edg[0].getTerminal(false);
        if (target !== undefined) {
            let block = getshape(c.getStyle());
            if (block !== "general") {
                yield* runInSameBT(edg[0].getTerminal(false), JSON.parse(JSON.stringify(payloads)), bpEngine, model, scen);
            }
            else {
                let edgeLabel = edg[0].getAttribute("label");
                if (edgeLabel !== undefined && outputs !== undefined) {
                    if (outputs[edgeLabel] !== undefined) {
                        let nextPayloads = outputs[edgeLabel];
                        yield* runInSameBT(edg[0].getTerminal(false), nextPayloads, bpEngine, model, scen);
                    }
                }
            }
        }
    }
}


function runInNewBT(c, payloads, bpEngine, model, curTime) {
    window.bpEngine.registerBThread(function* () {
        let outputs = {};
        let cloned = JSON.parse(JSON.stringify(payloads));
        outputs = handleNodeAttributes(c,outputs,cloned,payloads);
        if(outputs === -1){
            return;
        }
        c.setAttribute("scenarioID", c.id);
        window.debug.scenarios[c.id] = [];
        for(let i = 0; i < curTime; i++)
            window.debug.scenarios[c.id].push([-1, null]);
        window.debug.scenarios[c.id].push([c.id, cloned]);

        if (c.getAttribute("sync") !== undefined) {
            var stmt = JSON.parse(c.getAttribute("sync"));
            stmt["cellID"] = c.id;
            yield stmt;
            // cloned["selected"] = window.eventSelected;
        }

        yield* goToFollowers(c, cloned, bpEngine,model,outputs, c.id);
    }());

};

function getshape(str) {
    if(str == null || str == undefined)
        return "";
    let arr = str.split(";");
    arr = arr[0].split("=")[1] != null ? arr[0].split("=")[1].split(".")[1] : "";
    return arr;
}

function handleNodeAttributes(c, outputs, cloned, payloads) {
    if(getshape(c.getStyle()) === "console"){
        writeToConsole(JSON.stringify(payloads));
    }
    if (c.getAttribute("code") !== undefined) {
        try {
            eval('var func = function(payloads){' + c.getAttribute("code") + '\n}');
            outputs = func(cloned)
        }
        catch (e) {
            alert('There has been an error while executing the JS code on node ' +
                c.getId() + ": \n" + e + ".\n execution will now terminate.");
            return -1;
        }
    }
    if (c.getAttribute("log") !== undefined) {
        try {
            eval('var func = function(payloads){' + c.getAttribute("log") + '\n}');
            let consoleString = func(cloned);
            if (consoleString !== undefined) {
                writeToConsole(consoleString);
            }
        }
        catch (e) {
            alert('There has been an error while executing the JS code on Console node ' +
                c.getId() + ": \n" + e + ".\n execution will now terminate.");
            return -1;
        }
    }
    return outputs;
}

function* runInSameBT(c, payloads, bpEngine, model, scen) {
    let outputs = {};
    let cloned = JSON.parse(JSON.stringify(payloads));
    outputs = handleNodeAttributes(c, outputs, cloned, payloads);
    if(outputs === -1){
        return;
    }
    c.setAttribute("scenarioID", scen);
    window.debug.scenarios[scen].push([c.id, cloned]);

    if (c.getAttribute("sync") !== undefined) {
        let stmt = JSON.parse(c.getAttribute("sync"));
        stmt["cellID"] = c.id;
        yield stmt;
        // cloned["selected"] = window.eventSelected;
    }

    yield* goToFollowers(c, cloned, bpEngine, model, outputs, scen);
}



function startRunning(model) {
// Start the context nodes
    initDebug();

    var cells = model.cells;
    var arr = Object.keys(cells).map(function (key) {
        return cells[key]
    });
    let startNds = model.filterCells(arr,
        function (cell) {
            return cell.getStyle() !== undefined && getshape(cell.getStyle()) === "startnode";
        });
    for (let i = 0; i < startNds.length; i++) {
        let payloads = [{}];
        if (startNds[i].getAttribute("Payloads") !== undefined)
            payloads = (JSON.parse(startNds[i].getAttribute("Payloads")));
        runInNewBT(startNds[i], payloads, bpEngine, model, 0);
    }
    window.bpEngine.run().next();
    window.bpEngine.BThreads = [];
}

function getNumOfSteps(){
    let scen = Object.values(window.debug.scenarios);
    if(scen.length > 0)
        return scen[0].length;
    return 0;
}

function getProgramRecord() {
    var res = []

    for(let step = 0; step < getNumOfSteps(); step++){
        var curStage = {stages: [], events: null}
        var scens = Object.values(window.debug.scenarios);
        curStage.stages = {};
        for (let j = 0; j < scens.length; j++) {
            curStage.stages[scens[j][step][0]] = scens[j][step][1];
        }
        if(window.debug.events[step] != -1)
            curStage.events = window.debug.events[step];
        //if(Object.keys(curStage.stages).length > 0)
        res.push(curStage)
    }

    return res;
}

function initDebug() {
    window.debug.scenarios = {}
}

function fixStages(event) {
    let scens = Object.values(window.debug.scenarios)
    const lengths = scens.map(x => x.length);
    let curTime = Math.max(...lengths)
    for(let i = 0; i < scens.length; i++)
    {
        let curScen = scens[i];
        let numOfFixes = curTime - curScen.length;
        for (let j = 0; j < numOfFixes + 1; j++)
            curScen.push(curScen[curScen.length - 1]);
    }
    let numOfFixes = curTime - window.debug.events.length;
    for (let j = 0; j < numOfFixes; j++)
        window.debug.events.push(-1);
    window.debug.events.push(e);
}


// function f1(){}
// function f2(){}
// function f3(){}
// function f4(){}
// let c1 ={getId: function(){return 1},
// 	     sync: {request:['hot']}
// 	};
// let c2 ={getId: function(){return 2},
//     sync: {request:['cold']}
// };
// let c3 ={getId: function(){return 3},
//     sync: {wait:['hot'],block:['cold']}
// };
// let c4 ={getId: function(){return 4},
//     sync: {request:["hhhhhh"]}
// };
// bpEngine1=Object.create(bpEngine)
// runInNewBT(c1,{},bpEngine1);
// runInNewBT(c2,{},bpEngine1);
// runInNewBT(c3,{},bpEngine1);
// bpEngine1.run().next();

