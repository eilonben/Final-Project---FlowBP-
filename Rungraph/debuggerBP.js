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
// Cells' sizes
debuggerBP.prototype.lastCellsSizes = {};
// Cells' values
debuggerBP.prototype.lastCellValues = {};

// Number of actions made when the graph was fixed (size/color-wise) before the debugging started
debuggerBP.prototype.isFixed = 0;
// Indicator for pre-debugging layer's locking
debuggerBP.prototype.isLocked = 0;

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
 * scenarios field holed a list of all the scenarios on the program execution
*/
debuggerBP.prototype.scenarios = {};

// consoleSteps represents the messages at each time unit during the execution,
// where null represents a time slot without a new message
debuggerBP.prototype.consoleSteps = [""];

// events represents the event occurred during the execution at each time unit
debuggerBP.prototype.events = [];

// events represents the event occurred during the execution at each time unit
debuggerBP.prototype.messages = [];

// Saves pre-debugging info such as stencils sizes, last undo index in undo manager and cell labels
debuggerBP.prototype.savePreDebuggingInfo = function () {
    this.lastUndo = this.editor.undoManager.indexOfNextAdd;
    this.lastCellsSizes = this.getCellsSizes();
    this.lastCellValues = this.getValues();
}

// Return a map of cells ID's and their values
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

// Fixes cells sizes at the beginning of the debugging.
debuggerBP.prototype.fixAllSizes = function () {
    let isFixed = this.editor.undoManager.indexOfNextAdd;
    let cells = Object.values(this.mod.cells).filter(cell => cell.isBPCell());
    cells.forEach(cell => this.fixSizes(cell, false));
    this.fixAllOutputsLabels();
    if(this.toHorizontal)
        this.ui.fixView();
    this.isFixed = this.editor.undoManager.indexOfNextAdd - isFixed;
}

debuggerBP.prototype.setDebuggingSteps = function () {
    var rec = this.getProgramRecord();
    this.updateVertexCells(rec);
    this.setConsoleSteps(rec);
}

debuggerBP.prototype.startDebugging = function(toHorizontal){

    this.toHorizontal = toHorizontal;
    this.makePayloadSectionsVisible(true);
    this.savePreDebuggingInfo();
    updateConsoleMessage("");

    this.editor.undoManager.size = 10000;

    //lock the option to create news edges
    let tmpCells = Object.values(this.mod.cells).filter(cell => cell.isVertex());
    tmpCells.forEach(cell => cell.connectable=false);

    // Locks all layers in order to prevent changes during the debugging
    let isLocked = this.editor.undoManager.indexOfNextAdd;
    this.graph.lockLayers(true);
    this.isLocked = this.editor.undoManager.indexOfNextAdd - isLocked;

    // Fixes the sizes of every cell according to it's content
    this.fixAllSizes();

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

    //this.setLabels();
    this.fixAllOutputsLabels();
    this.fixDataCells();
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

debuggerBP.prototype.fixSizes = function(cell, toDef) {
    if(toDef){
        var geo = this.mod.getGeometry(cell).clone();
        geo.width = this.lastCellsSizes[cell.id].width;
        geo.height = this.lastCellsSizes[cell.id].height;
        this.mod.setGeometry(cell, geo);
    }
    else {
        this.graph.fixSizes(cell);
    }
}

debuggerBP.prototype.convertPayloadToString = function(payload) {
    let i = 1;
    var res = "";
    var width = 0;
    if(payload.constructor === Array) {
        payload.forEach(cur => {
            var curRes = "Payload " + i++ + ": " + JSON.stringify(cur) + "\n";
            width = Math.max(width, curRes.length);
            res += curRes;
        })
    }
    else{
        var curRes = "Payload: " + JSON.stringify(payload) + "\n";
        width = Math.max(width, curRes.length);
        res += curRes;
    }
    return res + "\n";
}


debuggerBP.prototype.colorCell = function(cell, color) {
    mxUtils.setCellStyles(this.mod, [ cell], 'fillColor', color);
}

// Updates cell's size, content and color
debuggerBP.prototype.updateCell = function(cell, payload, blocked) {//blocked, payload) {
    this.colorCell(cell, "none");
    if(cell.isBPCell()) {
        cell.children.forEach(child => {
            if (payload !== undefined && child.bp_type == "payloads") {
                let color = blocked ? "#ff6666" : "#99ff99";
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
    geo.width = this.lastCellsSizes[cell.id].width;
    geo.height = this.lastCellsSizes[cell.id].height;
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
            this.updateCell(cell, curStage[cell.id], record[i].blocked.includes(cell.id))
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

// Fixes all the scenarios to the current time unit (max length of the scenarios)
debuggerBP.prototype.fixStages = function() {
    let scens = Object.values(this.scenarios);
    const lengths = scens.map(x => x.length);
    let curTime = Math.max(...lengths);
    for (let i = 0; i < scens.length; i++) {
        let curScen = scens[i];
        let numOfFixes = curTime - curScen.length;
        for (let j = 0; j < numOfFixes; j++)
            curScen.push(curScen[curScen.length - 1]);
    }
};

// Adds an event to the events array, after fixing the length of the array
// (and of the blocked array as well) to the current "time" (max length of the scenarios)
debuggerBP.prototype.addEvent = function(e) {
    let scens = Object.values(this.scenarios)
    const lengths = scens.map(x => x.length);
    let curTime = Math.max(...lengths)
    for (let i = 0; i < scens.length; i++) {
        let curScen = scens[i];
        let numOfFixes = curTime - curScen.length;
        for (let j = 0; j < numOfFixes + 1; j++)
            curScen.push(curScen[curScen.length - 1]);
    }
    let numOfFixes = curTime - this.events.length;
    for (let j = 0; j < numOfFixes; j++)
        this.events.push(-1);
    this.events.push(e);

    // fix blocked
    numOfFixes = curTime - this.blocked.length;
    for (let j = 0; j < numOfFixes; j++)
        this.blocked.push(null);
    this.blocked.push([]);
}

debuggerBP.prototype.addBlocked = function(c) {
    this.blocked[this.events.length - 1].push(c);
}

debuggerBP.prototype.getNumOfSteps = function(){
    let scen = Object.values(this.scenarios);
    if(scen.length > 0)
        return scen[0].length;
    return 0;
}

// Builds a program record, where each cell of the output contains the content of cells,
// the selected event and the blocked/wait blocks
debuggerBP.prototype.getProgramRecord = function() {
    var res = []
    var curBlocked = [];

    for(let step = 0; step < this.getNumOfSteps(); step++){
        var curStage = {stages: {}, eventSelected: null, blocked: [], messages:null}
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
        if(Object.values(curStage.stages).length > 0 || curStage.eventSelected !== undefined)
            res.push(curStage)
    }

    return res;
}

// Initialize all the fields required for debugging record
debuggerBP.prototype.initDebug = function() {
    this.consoleSteps = [""];
    this.scenarios = {}
    this.events = [];
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