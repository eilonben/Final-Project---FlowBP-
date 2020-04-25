window.sbs = {
    stages: [],
    curStage: -1
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

function* goToFollowers(c, payloads, bpEngine, model,outputs) {
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
                yield* runInNewBT(target,nextPayloads, bpEngine,model);
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
            yield* runInSameBT(edg[0].getTerminal(false), nextPayloads, bpEngine, model);
        }
    }
}

function* runInNewBT(c, payloads, bpEngine, model) {
    // Cloning - Is this the right way?
    let outputs = {};
    let cloned = JSON.parse(JSON.stringify(payloads));
    window.bpEngine.registerBThread(function* () {
        if (c.getAttribute("code") !== undefined) {
            try{
            eval('var func = function(payloads) {' + c.getAttribute("code") + '}');
                outputs=func(cloned)
            }
            catch(e){
                alert.log('There has been an error while executing the JS code on node ' +
                     c.getId()+": \n" +e+" execution will now terminate.");
                return;
            }
        }
        if (c.getAttribute("sync") !== undefined) {
            yield JSON.parse(c.getAttribute("sync"));
            // curr["selected"] = window.eventSelected;
        }
        window.sbs.stages.push(c.id);
        yield* goToFollowers(c, cloned, bpEngine,model,outputs);
    }());

};

function getshape(str) {
    let arr = str.split(";");
    return arr[0].split("=")[1].split(".")[1];
}

function* runInSameBT(c, payloads, bpEngine, model) {
    let outputs = {};
    let cloned = JSON.parse(JSON.stringify(payloads));
    if (c.getAttribute("code") !== undefined) {
        try{
        eval('var func = function(payloads) {' + c.getAttribute("code") + '}');
            outputs=func(cloned)
        }
        catch(e){
            alert('There has been an error while executing the JS code on node ' +
                c.getId()+": \n" +e+".\n execution will now terminate.");
            return;
        }
    }
    if (c.getAttribute("sync") !== undefined) {
        yield JSON.parse(c.getAttribute("sync"));
        // curr["selected"] = window.eventSelected;
    }
    window.sbs.stages.push(c.id);
    yield *goToFollowers(c, cloned,bpEngine,model,outputs);
}

function startRunning(model) {
// Start the context nodes
    let cells = model.cells;
    let arr = Object.keys(cells).map(function (key) {
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
        runInNewBT(startNds[i], payloads, bpEngine, model).next();
    }
    window.bpEngine.run().next();
    window.bpEngine.BThreads = [];
}

function getNextStage() {
    if(window.sbs.curStage < window.sbs.stages.length - 1)
        return window.sbs.stages[++window.sbs.curStage]
    return window.sbs.stages[window.sbs.curStage = window.sbs.stages.length - 1]
}

function getPrevStage() {
    if(window.sbs.curStage > 0)
        return window.sbs.stages[--window.sbs.curStage]
    return window.sbs.stages[window.sbs.curStage = 0]
}

function initSBS() {
    window.sbs.stages = []
    window.sbs.curStage = -1
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

