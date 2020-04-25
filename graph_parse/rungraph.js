window.sbs = {
    time: 0,
    curStage: -1,
    scenarios: {}
};

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
            let e = getEvent();
            if (e === null)
                yield 'waiting for an event';
            console.log(e + "\n");
            mxUtils.alert("event selected: " + e + "\n");
            window.eventSelected = e;
            window.bpEngine.BThreads.forEach(bt => {
                if (isReqWait(bt, e)) {
                    bt.stmt = fixStmt(bt.iterator.next().value)
                }
            })
            fixStages();
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

function* goToFollowers(c, payloads, bpEngine, model, outputs, scen, curTime) {
    let edg = model.getEdges(c, false, true, true);
    if (edg.length > 0) {
        // Run extra followers in new threads
        for (let i = 1; i < edg.length; i++) {
            let target = edg[i].getTerminal(false);
            if (target !== undefined) {
                let nextPayloads = payloads;
                let edgeLabel = edg[i].getAttribute("label");
                if(edgeLabel!==undefined && outputs!==undefined && outputs[edgeLabel]!== undefined){
                    nextPayloads = outputs[edgeLabel];
                }
                yield* runInNewBT(target, nextPayloads, bpEngine, model, curTime);
            }
        }
        // Run the first follower in the same thread.
        let target = edg[0].getTerminal(false);
        if (target !== undefined) {
            let nextPayloads = payloads;
            let edgeLabel = edg[0].getAttribute("label");
            if(edgeLabel!==undefined && outputs!==undefined && outputs[edgeLabel]!== undefined){
                nextPayloads = outputs[edgeLabel];
            }
            yield* runInSameBT(edg[0].getTerminal(false), nextPayloads, bpEngine, model, scen);
        }
    }
}

function* runInNewBT(c, payloads, bpEngine, model, curTime) {
    // Cloning - Is this the right way?
    let outputs = {};
    let cloned = JSON.parse(JSON.stringify(payloads));
    window.bpEngine.registerBThread(function* () {
        if (c.getAttribute("code") !== undefined) {
            eval('var func = function(payloads) {' + c.getAttribute("code") + '}');
            outputs = func(cloned);
        }
        if (c.getAttribute("sync") !== undefined) {
            yield JSON.parse(c.getAttribute("sync"));
            // curr["selected"] = window.eventSelected;
        }

        c.setAttribute("scenarioID", c.id);
        window.sbs.scenarios[c.id] = [];
        for(let i = 0; i < window.sbs.time + curTime - 1; i++)
            window.sbs.scenarios[c.id].push(-1);
        window.sbs.scenarios[c.id].push([c.id, cloned]);

        yield* goToFollowers(c, cloned, bpEngine,model,outputs, c.id, curTime + 1);
    }());

};

function getshape(str) {
    let arr = str.split(";");
    return arr[0].split("=")[1].split(".")[1];
}

function* runInSameBT(c, payloads, bpEngine, model, scen) {
    let outputs = {};
    let curr = JSON.parse(JSON.stringify(payloads));
    if (c.getAttribute("code") !== undefined) {
        eval('var func = function(payloads) {' + c.getAttribute("code") + '}');
        outputs = func(curr);
    }
    if (c.getAttribute("sync") !== undefined) {
        yield JSON.parse(c.getAttribute("sync"));
        // curr["selected"] = window.eventSelected;
    }

    c.setAttribute("scenarioID", scen);
    window.sbs.scenarios[scen].push([c.id, curr]);

    yield* goToFollowers(c, curr, bpEngine, model, outputs, scen);
}

function startRunning(model) {
// Start the context nodes
    initSBS();

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
        runInNewBT(startNds[i], payloads, bpEngine, model, 0).next();
    }
    window.bpEngine.run().next();
    window.bpEngine.BThreads = [];
}

function getProgramRecord() {
    var res = []

    while(window.sbs.curStage < window.sbs.time - 1) {
        window.sbs.curStage++;

        var curStage = []
        var scens = Object.values(window.sbs.scenarios)
        for (let i = 0; i < scens.length; i++) {
            let cur = scens[i];
            if (cur[window.sbs.curStage][0] != -1) {
                curStage.push(cur[window.sbs.curStage])
            }
        }

        res.push(curStage)
    }
    return res;
}

function initSBS() {
    window.sbs.scenarios = {}
    window.sbs.curStage = -1
    window.sbs.time = 0
}

function fixStages() {
    let scens = Object.values(window.sbs.scenarios)
    const lengths = scens.map(x => x.length);
    let curTime = Math.max(...lengths)
    for(let i = 0; i < scens.length; i++)
    {
        let curScen = scens[i];
        for (let j = 0; j < curTime - curScen.length; j++)
            curScen.push(-1);
    }
    window.sbs.time = curTime
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

