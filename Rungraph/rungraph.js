
function writeToConsole(bpEngine, message, curTime, scen) {
    if(bpEngine.deb !== null && (curTime !== -1 || scen !== -1)){
        bpEngine.deb.addMessage(message, curTime, scen);
    }
    let myConsole = document.getElementById("ConsoleText1");
    if (myConsole !== undefined && myConsole !== null) {
        myConsole.value += message +"\n" ;
    }
}

// window.bpEngine = {
//     deb : null,
//     BThreads: [],
//
//     sync: function* (stmt) {
//         yield stmt;
//     },
//
//     registerBThread: (bt) => {
//         let x = bt.next().value;
//         let b = {iterator: bt, stmt: fixStmt(x)};
//         window.bpEngine.BThreads.push(b);
//     },
//
//     run: function* () {
//         while (true) {
//             window.bpEngine.deb.fixStages();
//             let e = getEvent();
//             if (e === null)
//                 yield 'waiting for an event';
//             window.bpEngine.deb.addEvent(e);
//             console.log(e + "\n");
//             writeToConsole("event selected: " + e);
//             window.bpEngine.BThreads.forEach(bt => {
//                 if (isReqWait(bt, e)) {
//                     bt.stmt = fixStmt(bt.iterator.next().value)
//                 }
//             })
//         }
//     }
// };
//
// // // to be implemented
// // function waitForEvent() {
// // }
//
// function fixStmt(stmt) {
//     if (stmt === undefined)
//         return {request: [], block: [], wait: []};
//     if (stmt.request === undefined)
//         stmt.request = [];
//     if (stmt.block === undefined)
//         stmt.block = [];
//     if (stmt.wait === undefined)
//         stmt.wait = [];
//     return stmt
// }
//
// function isReqWait(bt, e) {
//     return bt.stmt.request.includes(e) || bt.stmt.wait.includes(e)
// }
//
// function getEvent() {
//     let requests = new Set();
//     let blocks = new Set();
//     window.bpEngine.BThreads.forEach(bt => {
//         bt.stmt.request.forEach(requests.add, requests);
//         bt.stmt.block.forEach(blocks.add, blocks);
//     });
//     let diff = [...requests].filter(x => ![...blocks].includes(x));
//     return getRandomItem(diff);
// }
//
// // get random item from a Set
// function getRandomItem(set) {
//     let items = Array.from(set);
//     if (items.length === 0)
//         return null;
//     return items[Math.floor(Math.random() * items.length)];
// }

function* goToFollowers(c, payload, bpEngine, model, outputs, scen) {
    let edg = model.getEdges(c, false, true, true);

    if (edg.length > 0) {
        // Run extra followers in new threads
        for (let i = 1; i < edg.length; i++) {
            let target = edg[i].getTerminal(false);
            if (target !== undefined) {
                let edgeLabel = edg[i].getAttribute("label");
                if (edgeLabel !== undefined && outputs !== undefined) {
                    if (outputs[edgeLabel] !== undefined) {
                        let nextpayload = outputs[edgeLabel];
                        if(bpEngine.deb !== null) {
                            runInNewBT(target, nextpayload, bpEngine, model, bpEngine.deb.getScenarioTime(scen));
                        }
                        else{
                            runInNewBT(target, nextpayload, bpEngine, model, null);
                        }
                    }
                }
            }
        }
        // Run the first follower in the same thread.
        let target = edg[0].getTerminal(false);
        if (target !== undefined) {
            let block = getshape(c.getStyle());
            if (block !== "general") {
                yield* runInSameBT(edg[0].getTerminal(false), JSON.parse(JSON.stringify(payload)), bpEngine, model, scen);
            }
            else {
                let edgeLabel = edg[0].getAttribute("label");
                if (edgeLabel !== undefined && outputs !== undefined) {
                    if (outputs[edgeLabel] !== undefined) {
                        let nextpayload = outputs[edgeLabel];
                        yield* runInSameBT(edg[0].getTerminal(false), nextpayload, bpEngine, model, scen);
                    }
                }
            }
        }
    }
    else{
        if(bpEngine.deb !== null) {
            bpEngine.deb.endScen(scen);
        }
    }
}

/*
A function which is called in 2 cases:
1. When the interpreter encounters a start node
2. When the interpreter encounters a split from a general node into 2 different nodes
c describes the current cell the interpreter is parsing
 */
function runInNewBT(c, payload, bpEngine, model, curTime) {
    bpEngine.registerBThread(function* () {
        let outputs = {};
        //cloning the payload object
        let cloned = JSON.parse(JSON.stringify(payload));
        outputs = handleNodeAttributes(bpEngine, c,outputs,cloned,payload,curTime, -1);
        if(outputs === -1){
            window.executeError = true;
            return;
        }
        let scen;
        //checking if we are in debug mode
        if(bpEngine.deb!=null) {
            scen = bpEngine.deb.newScen(c, curTime, cloned);
        }

        if (c.getAttribute("Request") !== undefined || c.getAttribute("Wait") !==undefined || c.getAttribute("Block")!==undefined ) {
            // let stmt = JSON.parse(c.getAttribute("sync"));
            // yield stmt;
            // cloned["selected"] = window.eventSelected;
            let requested = handleBsync("Request",c,cloned);
            if(requested === -1) {
                return;
            }
            let wait = handleBsync("Wait",c,cloned);
            if(wait === -1) {
                return;
            }
            let block = handleBsync("Block",c,cloned);
            if(block === -1) {
                return;
            }else{
                let stmt = JSON.parse("{\"request\":" + JSON.stringify(requested) + ", \"wait\":" + JSON.stringify(wait)+ ",\"block\":" + JSON.stringify(block) + ",\"c\":\"" + c.id + "\"}");
                yield stmt;
            }
        }

        yield* goToFollowers(c, cloned, bpEngine,model,outputs, scen);
    }());

};

function getshape(str) {
    if(str == null || str == undefined)
        return "";
    let arr = str.split(";");
    arr = arr[0].split("=")[1] != null ? arr[0].split("=")[1].split(".")[1] : "";
    return arr;
}
/*
A function that handles all the fields inside a node relevant for executing BP flow programs
"code" for the code editor in general blocks
"sync" for the sync section in bsync nodes
"log" for the code section in console nodes
 */
function handleNodeAttributes(bpEngine, c, outputs, cloned, payload, curTime, scen) {
    if(getshape(c.getStyle()) === "console") {
        writeToConsole(bpEngine, JSON.stringify(payload), curTime, scen);
    }
    if (c.getAttribute("code") !== undefined) {
        try {
            eval('var func = function(payload){' + c.getAttribute("code") + '\n}');
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
            eval('var func = function(payload){' + c.getAttribute("log") + '\n}');
            let consoleString = func(cloned);
            if (consoleString !== undefined) {
                writeToConsole(bpEngine, consoleString, curTime, scen);
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

function* runInSameBT(c, payload, bpEngine, model, scen) {
    let outputs = {};
    let cloned = JSON.parse(JSON.stringify(payload));
    //checking if we are in debug mode
    if (bpEngine.deb != null) {
        bpEngine.deb.updateScen(scen, c, cloned);
    }

    cloned = JSON.parse(JSON.stringify(payload));

    outputs = handleNodeAttributes(bpEngine, c, outputs, cloned, payload, -1, scen);
    if(outputs === -1){
        window.executeError = true;
        return;
    }

    if (c.getAttribute("Request") !== undefined || c.getAttribute("Wait") !==undefined || c.getAttribute("Block")!==undefined ) {
        // let stmt = JSON.parse(c.getAttribute("sync"));
        // yield stmt;
        // cloned["selected"] = window.eventSelected;
        let requested = handleBsync("Request",c,cloned);
        if(requested === -1) {
            return;
        }
        let wait = handleBsync("Wait",c,cloned);
        if(wait === -1) {
            return;
        }
        let block = handleBsync("Block",c,cloned);
        if(block === -1) {
            return;
        }else{
           let stmt = JSON.parse("{\"request\":" + JSON.stringify(requested) + ", \"wait\":" + JSON.stringify(wait)+ ",\"block\":" + JSON.stringify(block) + ",\"c\":\"" + c.id + "\"}");
           yield stmt;
        }
    }

    yield* goToFollowers(c, cloned, bpEngine, model, outputs, scen);
}

const handleBsync = function(section,c,payload) {
    try {
        if (c.getAttribute(section) === undefined || c.getAttribute(section) === null || c.getAttribute(section) === "")
            return [];
        eval('var func = function(payload){' + c.getAttribute(section) + '\n}');
        let arr = func(payload);
        let isOk = true;
        if (!Array.isArray(arr)) {
            isOk = false;
        }
        else {
            const reducer = function (currBool, curritem) {
                return (currBool && (curritem && typeof curritem.valueOf() === 'string'))
            };
            arr.reduce(reducer, isOk);
        }
        if (!isOk) {
            alert(section + ' section should return an array of strings');
            return -1;
        }
        else {
            return arr;
        }
    }
    catch (e) {
        alert('There has been an error while executing the JS code on the ' + section + ' section' +
            ": \n" + e + ".\n please try again");
        return -1;
    }
};

function startRunning(model, debug) {
    // Start the context nodes
    window.executeError= false;
    let bpEngine = new BPEngine();
    if(debug != null) {
        bpEngine.deb = debug;
        bpEngine.deb.initDebug();
    }

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
        if (startNds[i].getAttribute("Payloads") !== undefined) {
            payloads = (JSON.parse(startNds[i].getAttribute("Payloads")));
            for (let j=0; j<payloads.length; j++){
                runInNewBT(startNds[i], payloads[j], bpEngine, model, 0);
            }
        }
    }
    bpEngine.run().next();
    bpEngine.BThreads = [];
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

