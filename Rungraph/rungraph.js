/**
 * @param message
 * Writes the message received to the console window
 */
function writeToConsole(message) {
    let myConsole = document.getElementById("ConsoleText1");
    if (myConsole !== undefined && myConsole !== null) {
        myConsole.value += message +"\n" ;
    }
}

/**
 *
 * @param c
 * @param payload
 * @param bpEngine
 * @param model
 * @param outputs
 * @param scen
 * Handles the transition of the execution from one block to other block/blocks.
 * If there are multiple outputs, determines which payloads
 * are sent to which outputs(using the code on the general block)
 * and registers new BThreads for any extra output.
 */
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

/**
 * @param c
 * @param payload
 * @param bpEngine
 * @param model
 * @param curTime
 * A function which is called in 2 cases:
 * 1. When the interpreter encounters a start node
 * 2. When the interpreter encounters a split from a general node into 2 different nodes
 * c describes the current cell the interpreter is parsing
 */
function runInNewBT(c, payload, bpEngine, model, curTime) {
    bpEngine.registerBThread(function* () {
        let outputs = {};
        //cloning the payload object
        let cloned = JSON.parse(JSON.stringify(payload));
        outputs = handleNodeAttributes(c,outputs,cloned,payload);
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


/**
 * @param c
 * @param outputs
 * @param cloned
 * @param payload
 * A function that handles all the fields inside a node relevant for executing BP flow programs
 * "code" for the code editor in general blocks
 * "sync" for the sync section in bsync nodes
 * "log" for the code section in console nodes
 **/
function handleNodeAttributes(c, outputs, cloned, payload) {
    if(getshape(c.getStyle()) === "console") {
        writeToConsole(JSON.stringify(payload));
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

/**
 *
 * @param c
 * @param payload
 * @param bpEngine
 * @param model
 * @param scen
 * A function which is called on transition between blocks in order to continue the execution
 * of the scenario in the same BThread it was running until the function call point
 */
function* runInSameBT(c, payload, bpEngine, model, scen) {
    let outputs = {};
    let cloned = JSON.parse(JSON.stringify(payload));
    //checking if we are in debug mode
    if (bpEngine.deb != null) {
        bpEngine.deb.updateScen(scen, c, cloned);
    }

    cloned = JSON.parse(JSON.stringify(payload));

    outputs = handleNodeAttributes(c, outputs, cloned, payload);
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

/**
 * @param section
 * @param c
 * @param payload
 *
 * A function that handles the Bsync fields and checks that the code written in the fields
 * is returning a string array.
 * section param determines which section is being processed (Request, Wait or Block).
 * If there are no errors, returns the string array to the caller.
 */
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

/**
 * @param model
 * @param debug
 * The entry function that starts the work of the interpreter.
 * Receives the MxGraphModel from the caller (param model), and a debugger object if in debug mode.
 */
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
