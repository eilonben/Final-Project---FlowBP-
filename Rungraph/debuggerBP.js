/*
 * debbugerBP responsibility is to record information during a program execution, and display this record on demand.
 * The constructor gets the relevant UI as an argument in order to make the changes needed for debugging display.
*/
function debuggerBP(ui){
    this.ui = ui;
    this.editor = ui.editor;
    this.graph = this.editor.graph;
    this.mod = this.graph.getModel();
}

// The UI instance (including the editor and the graph) needed to be change for the debugging steps' display
debuggerBP.prototype.ui = null;
debuggerBP.prototype.editor = null;
debuggerBP.prototype.graph = null;
debuggerBP.prototype.mod = null;

// Pre-debbuging info
// Index of the last undo action in the Undo manager
debuggerBP.prototype.lastUndo = 0;
// Cells' values
debuggerBP.prototype.lastCellValues = {};

// Number of actions made when the graph was fixed (size/color-wise) before the debugging started
debuggerBP.prototype.isFixed = 0;
// Indicator for pre-debugging layer's locking
debuggerBP.prototype.isLocked = 0;

// Cells' sizes after fixed to their debugging size (payload section is visible)
debuggerBP.prototype.cellsSizes = {};

// Indicator for type of display during the debugging
debuggerBP.prototype.toHorizontal = false;

// Program record
// Number of scenarios (payloads) so far in the execution
debuggerBP.prototype.scenCounter = 0;

/* Scenarios (payloads) represented as an array, where each cell represents
 * the location of the scenario at the cell index time.
 * For example: x = [-1, -1, -1, 4, 4] indicates that scenario x took part from time = 3,
 * (-1 indicates this scenario didn't took part at this time),
 * and it's payload stayed for 2 time units at block number 4 (cell.id)
 * scenarios field holds a list of all the scenarios on the program execution
*/
debuggerBP.prototype.scenarios = {};

// consoleSteps represents the messages at each time unit during the execution,
// where null represents a time slot without a new message
debuggerBP.prototype.consoleSteps = [""];

/* events represents the event occurred during the execution at each time unit.
 * for example: events = [null, null, "X(0,1)"] indicates that in time = 2 event "X(0,1)" occurred.
*/
debuggerBP.prototype.events = [];

/* messages represents the message occurred during the execution at each time unit.
 * Messages can be occurred when entering a console_block.
 * for example: messages = [null, null, "{"G":2}"] indicates that in time = 2 message "X(0,1)" was printed.
*/
debuggerBP.prototype.messages = [];

/* syncing represents the sets of syncing blocks at each time unit.
 * for example: syncing = [null, null, {4,2}, null] indicates that in time = 2 blocks number
 * 4 and 2 got into syncing state.
*/
debuggerBP.prototype.syncing = [];

// Saves pre-debugging info such as stencils sizes, last undo index in undo manager and cell labels
debuggerBP.prototype.savePreDebuggingInfo = function () {
    this.lastUndo = this.editor.undoManager.indexOfNextAdd;
    this.lastCellValues = this.getValues();
}

// Returns a map of cells ID's and their values
debuggerBP.prototype.getValues = function(){
    var res = {};

    let cells = Object.values(this.mod.cells).filter(cell => cell.bp_cell);
    cells.forEach(cell => {
        if (cell.bp_type !== "startnode")
            cell.children.forEach(child => res[child.id] = child.getValue() !== undefined ? child.getValue() : "")
        res[cell.id] = cell.getValue() !== undefined ? cell.getValue() : "";
    });

    return res;
}

// Builds an array of messages which should be displayed on the console in every step of the debugging
debuggerBP.prototype.setConsoleSteps = function (rec) {
    let i = 0;
    rec.forEach(stage => {
        let eventOcc = stage.eventSelected == null ? "" : "event selected: " + stage.eventSelected + "\n";
        let message = stage.messages == null ? "" : stage.messages + "\n";
        this.consoleSteps.push(this.consoleSteps[i++] + message + eventOcc);
    });
}

debuggerBP.prototype.VisibilityIsChangeable = function(type){
    return type != null && type != 'data' && type != 'divider' && type != 'label';
};

// changes special debug objects visibility
debuggerBP.prototype.makePayloadSectionsVisible = function (bool) {
    let cells = Object.values(this.mod.cells).filter(cell => cell.isBPCell());
    cells.forEach(cell => {
        cell.children.forEach(child => {
            if (this.VisibilityIsChangeable(child.bp_type))
                child.setVisible(bool)
        });
    })
}

// Fixes cells sizes at the beginning of the debugging (in accordance to their children- payload, data...).
debuggerBP.prototype.fixAllSizes = function () {
    this.mod.beginUpdate();

    let cells = Object.values(this.mod.cells).filter(cell => cell.isBPCell());
    cells.forEach(cell => this.fixSizes(cell, false));
    this.fixAllOutputsLabels();
    if(this.toHorizontal)
        this.ui.fixView();

    this.mod.endUpdate();
}

// For each time unit, sets every cell to it's current state (payload, blocked/not blocked, syncing/not syncing),
// and the console to it's current message.
debuggerBP.prototype.setDebuggingSteps = function () {
    var rec = this.getProgramRecord();
    this.editor.undoManager.size += rec.length * 2;
    this.updateVertexCells(rec);
    this.setConsoleSteps(rec);
}

/*
 * startDebugging:
 *      1. Saves the graph state before starting the program execution display.
 *      2. Lock all layers in order to prevent changes as long as the execution is displayed.
 *      3. Using the undoManger, sets the graph state in accordance to every
 *         time unit in the program execution record.
 */
debuggerBP.prototype.startDebugging = function(toHorizontal){

    this.toHorizontal = toHorizontal;
    this.makePayloadSectionsVisible(true);
    this.savePreDebuggingInfo();
    updateConsoleMessage("");

    // lock the option to create news edges
    let tmpCells = Object.values(this.mod.cells).filter(cell => cell.isVertex());
    tmpCells.forEach(cell => cell.connectable=false);

    // Locks all layers in order to prevent changes during the debugging
    let isLocked = this.editor.undoManager.indexOfNextAdd;
    this.graph.lockLayers(true);
    this.isLocked = this.editor.undoManager.indexOfNextAdd - isLocked;

    // Fixes the sizes of every cell according to it's content
    let isFixed = this.editor.undoManager.indexOfNextAdd;
    this.fixAllSizes();
    this.isFixed = this.editor.undoManager.indexOfNextAdd - isFixed;

    // Saves the sizes of cells after fixing their sizes for debugging purpose
    // int order to set a cell's size to this size when there is no payload in it
    this.cellsSizes = this.getCellsSizes();

    this.setDebuggingSteps();

    // After setting the changes on the graph for every step in the debugging, returns the graph state
    // to the beginning of the debugging (right after locking the layers and setting all cells' sizes);
    let numOfUndos = this.editor.undoManager.indexOfNextAdd - this.lastUndo - this.isFixed - this.isLocked;
    for (let i = 0; i < numOfUndos; i++) {
        this.mod.beginUpdate();

        this.ui.undo();

        this.mod.endUpdate();
    }

    // Clears selected cells, which appears after undoing an action on a graph
    this.graph.clearSelection();
    this.ui.noUndoRedo();

    if (numOfUndos == 0)
        this.ui.enableDebugNext(false);
};

debuggerBP.prototype.endDebugging = function() {

    //unlock the option to create news edges
    let tmpCells = Object.values(this.mod.cells).filter(cell => cell.isVertex());
    tmpCells.forEach(cell => cell.connectable=true);

    // Undoes all the actions occurred from the start of the debugging,
    // and also pops them from the undoManger
    this.editor.undoManager.indexOfNextAdd = this.editor.undoManager.history.length;
    var numOfNewUndos = this.editor.undoManager.history.length - this.lastUndo;
    while (numOfNewUndos-- > 0) {
        this.ui.undo();
        this.editor.undoManager.history.pop()
    }

    this.graph.clearSelection();
    updateConsoleMessage("");

    this.fixAllOutputsLabels();
    this.makePayloadSectionsVisible(false);
}

// Preforms a step back (debugging-wise) by preforming a undo (using the undoManger)
// and changing the console to the correct message
debuggerBP.prototype.back = function () {
    if (this.editor.undoManager.indexOfNextAdd > this.lastUndo) {
        this.mod.beginUpdate();

        this.ui.undo();
        this.graph.clearSelection();
        this.ui.noUndoRedo();

        this.mod.endUpdate();

        updateConsoleMessage(this.curConsoleMessage());

        if (this.editor.undoManager.indexOfNextAdd == this.lastUndo + this.isLocked + this.isFixed)
            this.ui.enableDebugBack(false);
        else if(this.editor.undoManager.indexOfNextAdd == this.editor.undoManager.history.length - 1)
            this.ui.enableDebugNext(true);
    }
}

debuggerBP.prototype.curConsoleMessage = function() {
    let index = this.editor.undoManager.indexOfNextAdd - this.lastUndo - this.isFixed - this.isLocked;
    return this.consoleSteps[index];
}

// Preforms a step forward (debugging-wise) by preforming a redo (using the undoManger)
// and changing the console to the correct message
debuggerBP.prototype.next = function () {
    this.graph.getModel().beginUpdate();

    this.ui.redo();
    this.graph.clearSelection();
    this.ui.noUndoRedo();

    this.graph.getModel().endUpdate();
    updateConsoleMessage(this.curConsoleMessage());

    if (this.lastUndo + this.isLocked + this.isFixed == this.editor.undoManager.indexOfNextAdd - 1)
        this.ui.enableDebugBack(true);
    else if (this.editor.undoManager.indexOfNextAdd == this.editor.undoManager.history.length)
        this.ui.enableDebugNext(false);
}

debuggerBP.prototype.getCellsSizes = function() {
    var res = {};
    let cells = Object.values(this.mod.cells).filter(cell => cell.bp_cell);
    cells.forEach(cell => {
        var geo = this.mod.getGeometry(cell);
        res[cell.id] = {width: geo.width, height: geo.height}
        if (cell.children !== null && cell.children !== undefined) {
            cell.children.forEach(child => {
                var cgeo = this.mod.getGeometry(child);
                res[child.id] = {width: geo.width, height: cgeo.height}
            })
        }
    });
    return res;
}

// Sets a cell's size to size with/without payload.
debuggerBP.prototype.fixSizes = function(cell, toDef) {
    if(toDef){
        var geo = this.mod.getGeometry(cell).clone();
        geo.width = this.cellsSizes[cell.id].width;
        geo.height = this.cellsSizes[cell.id].height;
        this.mod.setGeometry(cell, geo);
    }
    else {
        this.graph.fixSizes(cell);
    }
}

function cutPayload(payload) {
    let tmp = "{";
    let first = true;
    Object.keys(payload).forEach(function(key) {
        if(!first)
            tmp += "...................";
        else first = false;
        tmp += key + ": " + JSON.stringify(payload[key]) + ",\n";
    });
    if(tmp.length > 1)
        tmp = tmp.substring(0, tmp.length - 2);
    tmp += "}";
    return tmp;
}

debuggerBP.prototype.convertPayloadToString = function(payload) {
    let i = 1;
    var res = "";
    var width = 0;
    if(payload.constructor === Array) {
        payload.forEach(cur => {
            var curRes = "Payload " + i++ + ": " + cutPayload(cur) + "\n";
            width = Math.max(width, curRes.length);
            res += curRes;
        })
    }
    else{
        let tmp = cutPayload(payload);
        var curRes = "Payload: " + tmp + "\n";
        width = Math.max(width, curRes.length);
        res += curRes;
    }
    return res + "\n";
}


debuggerBP.prototype.colorCell = function(cell, color) {
    mxUtils.setCellStyles(this.mod, [ cell], 'fillColor', color);
}

// Updates cell's size, content and color
debuggerBP.prototype.updateCell = function(cell, payload, blocked, syncing) {//blocked, payload) {
    this.colorCell(cell, "#ffffff");
    if(cell.isBPCell()) {
        cell.children.forEach(child => {
            if (payload !== undefined && child.bp_type == "payloads") {
                let color = syncing ? "#b3b3b3" : "#99ff99";
                color = blocked ? "#ff6666" : color;
                this.colorCell(child, color);
                this.mod.setValue(child, child.getValue() + this.convertPayloadToString(payload));
            } else
                this.colorCell(child, "none");
        });
        this.fixSizes(cell, payload === undefined);
    }
    else if(payload !== undefined)
        this.colorCell(cell, "#99ff99");

}

// Sets cell's size, content and color to their original (pre-debugging) values
debuggerBP.prototype.setToOriginal = function (cell) {
    var geo = this.mod.getGeometry(cell).clone();
    geo.width = this.cellsSizes[cell.id].width;
    geo.height = this.cellsSizes[cell.id].height;
    var val = this.lastCellValues[cell.id];
    if (cell.bp_cell && cell.bp_type !== "startnode"){
        cell.children.forEach(child =>{
            if(child.bp_type !== 'label') this.setToOriginal(child)
        });
    }
    mxUtils.setCellStyles(this.mod, cell, 'fillColor', 'none');
    this.mod.setGeometry(cell, geo);
    this.mod.setValue(cell, val);
};


debuggerBP.prototype.fixAllOutputsLabels = function() {
    let cells = Object.values(this.mod.cells).filter(cell => cell.isBPCell());
    cells.forEach(cell => {
        this.editor.graph.fixConnectionPointsLabelLocation(cell);
    })
};


debuggerBP.prototype.fixDataCells = function() {
    let cells = Object.values(this.mod.cells).filter(cell => cell.isBPCell());
    cells.forEach(cell => {
        var data = this.graph.getChildByType(cell, 'data');
        data.geometry.height = 0;
        data.geometry.width = 0;
    })
};

// Using mxGraph's undoManager, sets the graph at each debugging step,
// by changing sizes, fill colors and content of every node (if needed).
debuggerBP.prototype.updateVertexCells = function(record) {
    let cells = Object.values(this.mod.cells).filter(cell => cell.bp_cell);

    for (let i = 0; i < record.length; i++) {
        this.mod.beginUpdate();

        let curStage = record[i].stages;

        cells.forEach(cell => {
            this.setToOriginal(cell);
            this.updateCell(cell, curStage[cell.id], record[i].blocked.has(cell.id), record[i].syncing.has(cell.id))
        });

        if(this.toHorizontal)
            this.ui.fixView();

        this.fixAllOutputsLabels();

        this.mod.endUpdate();
    }
};

function updateConsoleMessage(msg) {
    let myConsole = document.getElementById("ConsoleText1");
    if (myConsole !== undefined && myConsole !== null) {
        myConsole.value = msg;
    }
};

debuggerBP.prototype.addSyncing = function (curScen) {
    if (this.syncing[curScen.length] === null)
        this.syncing[curScen.length] = new Set();
    this.syncing[curScen.length].add(curScen[curScen.length - 1][0]);
}

// Fixes the arrays of syncing, blocks, messages and all the scenarios to the current
// time unit (max length of the scenarios)
debuggerBP.prototype.fixStages = function() {

    let scens = Object.values(this.scenarios);
    const lengths = scens.map(x => x.length);
    let curTime = Math.max(...lengths);

    //fix syncing
    let numOfFixes = curTime - this.syncing.length;
    for (let j = 0; j < numOfFixes + 2; j++)
        this.syncing.push(null);

    //fix scenes
    for (let i = 0; i < scens.length; i++) {
        let curScen = scens[i];
        let numOfFixes = curTime - curScen.length;
        for (let j = 0; j < numOfFixes + 2; j++) {
            if(curScen[curScen.length - 1][0] !== -1)
                this.addSyncing(curScen);
            curScen.push(curScen[curScen.length - 1]);
        }
        curScen.push(curScen[curScen.length - 1]);
    }

    //fix events
    numOfFixes = curTime - this.events.length;
    for (let j = 0; j < numOfFixes + 2; j++)
        this.events.push(-1);

    // fix blocked
    numOfFixes = curTime - this.blocked.length;
    for (let j = 0; j < numOfFixes + 3; j++)
        this.blocked.push(null);

};

debuggerBP.prototype.addEvent = function(e) {
    this.fixStages();
    this.events[this.events.length - 1] = e;
}

debuggerBP.prototype.addBlocked = function(c) {
    if(this.blocked[this.blocked.length - 1] === null)
        this.blocked[this.blocked.length - 1] = new Set();
    this.blocked[this.blocked.length - 1].add(c);
}

debuggerBP.prototype.getNumOfSteps = function(){
    let scen = Object.values(this.scenarios);
    if(scen.length > 0)
        return scen[0].length;
    return 0;
}

function diff(lastStage, curStage) {
    return JSON.stringify(lastStage.stages) !== JSON.stringify(curStage.stages)  ||
        lastStage.eventSelected !== curStage.eventSelected ||
        !eqSet(lastStage.blocked, curStage.blocked) ||
        !eqSet(lastStage.syncing, curStage.syncing);
}

function eqSet(as, bs) {
    if (as.size !== bs.size) return false;
    for (var a of as) if (!bs.has(a)) return false;
    return true;
}

/* Builds a program record, where each cell of the output contains the content of cells,
 * the selected event, the blocked blocks and blocks at syncing point at each time unit.
 * For example:
 * rec = [{stages: {2: [{"X": 4}, {"Y": 6}]},
 *          eventSelected: null,
 *          blocked: {},
 *          messages:null,
 *          syncing: {}},
 *        {stages: {3: [{"X": 3}, {"Y": 4}], 4: [{"X": 5}, {"Y": 7}]},
 *          eventSelected: null,
 *          blocked: {},
 *          messages:["Hello", "World"]],
 *          syncing: {}},
 *        {stages: {3: [{"X": 3}, {"Y": 4}], 4: [{"X": 5}, {"Y": 7}]},
 *          eventSelected: null,
 *          blocked: {},
 *          messages: null,
 *          syncing: {3, 4}},
 *        {stages: {3: [{"X": 3}, {"Y": 4}], 4: [{"X": 5}, {"Y": 7}]},
 *          eventSelected: "X",
 *          blocked: {},
 *          messages: null,
 *          syncing: {3, 4}},
 *        {stages: {3: [{"X": 3}, {"Y": 4}], 4: [{"X": 5}, {"Y": 7}]},
 *          eventSelected: null,
 *          blocked: {5}},
 *          messages: null,
 *          syncing: {}}]
 * Every cell in this list represents the program state at this time unit.
 * For example, at time = 0 block number 2 holds two payloads- {"X": 4} and {"Y": 6}, there are no
 * blocked blocks, no blocks in syncing state, no messages and no selected event.
 * At time = 2 blocks number 3 and 4 are at syncing state, and at time = 3 an event has been selected.
 * At time = 4 blocks number 3 and 4 holds some payloads, and block number 5 is blocked.
*/
debuggerBP.prototype.getProgramRecord = function() {
    var res = []
    var curBlocked = new Set();
    var lastStage ={};
    for(let step = 0; step < this.getNumOfSteps(); step++){
        var curStage = {stages: {}, eventSelected: null, blocked: null, messages:null, syncing: null}
        var scens = Object.values(this.scenarios);
        curStage.stages = {};
        for (let j = 0; j < scens.length; j++) {
            if (scens[j][step][0] != -1)
                if (scens[j][step][0] in curStage.stages)
                    curStage.stages[scens[j][step][0]].push(scens[j][step][1]);
                else
                    curStage.stages[scens[j][step][0]] = [scens[j][step][1]];
        }
        if(this.events[step] != -1)
            curStage.eventSelected = this.events[step];
        if(this.messages[step] != "")
            curStage.messages = this.messages[step];
        if(this.blocked[step] != null)
            curBlocked = this.blocked[step];
        curStage.blocked = curBlocked;
        curStage.syncing = this.syncing[step] !== null ? this.syncing[step] : new Set();
        if((Object.values(curStage.stages).length > 0 || curStage.eventSelected !== null) && diff(lastStage, curStage))
            res.push(curStage)
        lastStage = curStage;
    }
    res.push({stages: {}, eventSelected: null, blocked: new Set(), messages:null, syncing: new Set()})
    return res;
}

// Initialize all the fields required for debugging record
debuggerBP.prototype.initDebug = function() {
    this.consoleSteps = [""];
    this.scenarios = {}
    this.events = [];
    this.syncing = [];
    this.messages = [];
    this.blocked = [];
    this.scenCounter = 0;
    updateConsoleMessage("");
}

// Adds a new scen to the record (filling it with curTime irrelevant cells)
debuggerBP.prototype.newScen = function(c, curTime, cloned) {
    let scen = this.scenCounter++;
    this.scenarios[scen] = [];
    for (let i = 0; i < curTime; i++)
        this.scenarios[scen].push([-1, null]);
    this.scenarios[scen].push([c.id, cloned]);
    return scen;
}

debuggerBP.prototype.updateScen = function(scen, c, cloned) {
    this.scenarios[scen].push([c.id, cloned]);
}

    debuggerBP.prototype.endScen = function(scen) {
    this.scenarios[scen].push([-1, null]);
}

debuggerBP.prototype.getScenarioTime = function(scen) {
    return this.scenarios[scen].length;
}

debuggerBP.prototype.addMessage = function(message, curTime, scen) {
    let time = curTime !== -1 ? curTime + 1 : this.scenarios[scen].length;
    let numOfFixes = time - this.messages.length;
    for (let j = 0; j < numOfFixes; j++)
        this.messages.push("");
    let m = this.messages[time - 1] !== "" ? "\n" + message : message;
    this.messages[time - 1] += m;
}

debuggerBP.prototype.endRecord = function() {


    let scens = Object.values(this.scenarios);
    const lengths = scens.map(x => x.length);
    let curTime = Math.max(...lengths);

    //fix syncing
    let numOfFixes = curTime - this.syncing.length;
    for (let j = 0; j < numOfFixes; j++)
        this.syncing.push(null);

    //fix scenes
    for (let i = 0; i < scens.length; i++) {
        let curScen = scens[i];
        let numOfFixes = curTime - curScen.length;
        for (let j = 0; j < numOfFixes; j++) {
            curScen.push([-1, null]);
        }
    }

    //fix events
    numOfFixes = curTime - this.events.length;
    for (let j = 0; j < numOfFixes; j++)
        this.events.push(-1);
    // fix blocked
    numOfFixes = curTime - this.blocked.length;
    for (let j = 0; j < numOfFixes + 1; j++)
        this.blocked.push(null);
}