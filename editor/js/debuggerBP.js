function debuggerBP(ui){
    this.ui = ui;
    this.editor = ui.editor;
    this.graph = this.editor.graph;
    this.mod = this.graph.getModel();
}

debuggerBP.prototype.ui = null;
debuggerBP.prototype.editor = null;
debuggerBP.prototype.graph = null;
debuggerBP.prototype.mod = null;
debuggerBP.prototype.lastUndo = 0;
debuggerBP.prototype.lastLabels = {};
debuggerBP.prototype.lastCellsSizes = {};
debuggerBP.prototype.isFixed = 0;
debuggerBP.prototype.isLocked = 0;
debuggerBP.prototype.scenarios = {};
debuggerBP.prototype.consoleSteps = [""];
debuggerBP.prototype.events = [];


// Saves pre-debugging info such as stencils sizes, last undo index in undo manager and cell labels
debuggerBP.prototype.savePreDebuggingInfo = function () {
    this.lastUndo = this.editor.undoManager.indexOfNextAdd;
    this.lastLabels = this.getLabels();
    this.lastCellsSizes = this.getCellsSizes();
}

debuggerBP.prototype.setConsoleSteps = function (rec) {
    let i = 0;
    rec.forEach(stage => {
        let eventOcc = stage.eventSelected == null ? "" : "event selected: " + stage.eventSelected + "\n";
        this.consoleSteps.push(this.consoleSteps[i++] + eventOcc);
    });
}

debuggerBP.prototype.startDebugging = function(){

    this.savePreDebuggingInfo();

    let undoAdd = 0;

    // Locks all layers
    let isLocked = this.editor.undoManager.indexOfNextAdd;
    this.graph.lockLayers(true);
    this.isLocked = this.editor.undoManager.indexOfNextAdd - isLocked;

    let isFixed = this.editor.undoManager.indexOfNextAdd;
    this.ui.fixView();
    this.isFixed = this.editor.undoManager.indexOfNextAdd - isFixed;

    var rec = this.getProgramRecord()
    this.updateVertexCells(rec);
    this.setConsoleSteps(rec);

    let numOfUndos = this.editor.undoManager.indexOfNextAdd - this.lastUndo - this.isFixed - this.isLocked;
    for (let i = 0; i < numOfUndos; i++) {
        this.mod.beginUpdate();

        this.ui.undo();

        this.mod.endUpdate();
    }

    this.graph.clearSelection();
    this.ui.noUndoRedo();

    if (numOfUndos == 0)
        this.ui.enableDebugNext(false);
}

debuggerBP.prototype.endDebugging = function() {

    this.editor.undoManager.indexOfNextAdd = this.editor.undoManager.history.length;
    var numOfNewUndos = this.editor.undoManager.history.length - this.lastUndo;
    while (numOfNewUndos-- > 0) {
        this.ui.undo();
        this.editor.undoManager.history.pop()
    }

    this.graph.clearSelection();
    updateConsoleMessage("");

    this.setLabels();
}

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
        else if(this.editor.undoManager.indexOfNextAdd + this.isFixed == this.editor.undoManager.history.length)
            this.ui.enableDebugNext(true);
    }
}

debuggerBP.prototype.curConsoleMessage = function() {
    let index = this.editor.undoManager.indexOfNextAdd - this.lastUndo - this.isFixed - this.isLocked;
    return this.consoleSteps[index];
}

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

debuggerBP.prototype.getLabels = function() {
    var res = {};

    let cells = Object.values(this.mod.cells).filter(cell => cell.isVertex());
    cells.forEach(cell => {
        let label = cell.getAttribute('label');
        res[cell.id] = label != undefined ? label : ""
    });

    return res;
}

debuggerBP.prototype.getCellsSizes = function() {
    var res = {};
    let cells = Object.values(this.mod.cells).filter(cell => cell.isVertex() && getshape(cell.getStyle()) !== undefined);
    cells.forEach(cell => {
        var geo = this.mod.getGeometry(cell);
        res[cell.id] = {width: geo.width, height: geo.height}
    });
    return res;
}

debuggerBP.prototype.fixSizes = function(cell, content) {
    var geo = this.mod.getGeometry(cell).clone();

    geo.width = this.lastCellsSizes[cell.id].width;
    geo.height = this.lastCellsSizes[cell.id].width;
    if(content != undefined) {
        geo.width += (content.width * 4);
        geo.height += (content.height * 16);
    }

    this.mod.setGeometry(cell, geo);
}

debuggerBP.prototype.convertPayloadToString = function(payload) {
    let i = 0;
    var res = "";
    var width = 0;
    payload.forEach(cur => {
        var curRes = "Payloads[" + i + "]: " + JSON.stringify(cur) + "\n";
        width = Math.max(width, curRes.length);
        res += curRes;
    })
    return {text: res, width: width, height: i};
}

debuggerBP.prototype.updateCell = function(cell, payload) {//blocked, payload) {
    var content;
    var val = cell.clone().getValue();
    var style = cell.getStyle();
    val.setAttribute('label', "");
    style = style.replace('fillColor=#ffff99', 'fillColor=#ffffff');
    if (payload !== undefined) {
        style = style.replace('fillColor=#ffffff', 'fillColor=#ffff99');
        if (getshape(cell.getStyle()) !== "startnode") {
            content = this.convertPayloadToString(payload);
            val.setAttribute('label', content.text);
        }
    }
    this.mod.setStyle(cell, style);
    this.mod.setValue(cell, val);
    this.fixSizes(cell, content);
    var ret = content !== undefined ? content.text : "";
    return ret;
}

debuggerBP.prototype.updateVertexCells = function(record) {
    let cells = Object.values(this.mod.cells).filter(cell => cell.isVertex() && getshape(cell.getStyle()) !== undefined);

    for (let i = 0; i < record.length; i++) {
        this.mod.beginUpdate();

        let curStage = record[i].stages;

        cells.forEach(cell => {
            this.graph.fixValue(cell);
            this.updateCell(cell, curStage[cell.id])
        });

        this.ui.fixView();

        this.mod.endUpdate();
    }
}

debuggerBP.prototype.setLabels = function() {
    let cells = Object.values(this.mod.cells).filter(cell => cell.isVertex());
    cells.forEach(cell => cell.setAttribute('label', this.lastLabels[cell.id]));
}

debuggerBP.prototype.fixStages = function() {
    let scens = Object.values(this.scenarios)
    const lengths = scens.map(x => x.length);
    let curTime = Math.max(...lengths)
    for (let i = 0; i < scens.length; i++) {
        let curScen = scens[i];
        let numOfFixes = curTime - curScen.length;
        for (let j = 0; j < numOfFixes; j++)
            curScen.push(curScen[curScen.length - 1]);
    }
}

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
}


debuggerBP.prototype.getNumOfSteps = function(){
    let scen = Object.values(this.scenarios);
    if(scen.length > 0)
        return scen[0].length;
    return 0;
}

debuggerBP.prototype.getProgramRecord = function() {
    var res = []

    for(let step = 0; step < this.getNumOfSteps(); step++){
        var curStage = {stages: [], eventSelected: null}
        var scens = Object.values(this.scenarios);
        curStage.stages = {};
        for (let j = 0; j < scens.length; j++) {
            curStage.stages[scens[j][step][0]] = scens[j][step][1];
        }
        if(this.events[step] != -1)
            curStage.eventSelected = this.events[step];
        res.push(curStage)
    }

    return res;
}

function updateConsoleMessage(msg) {
    let myConsole = document.getElementById("ConsoleText1");
    if (myConsole !== undefined && myConsole !== null) {
        myConsole.value = msg;
    }
}

debuggerBP.prototype.initDebug = function() {
    this.consoleSteps = [""];
    this.scenarios = {}
    this.events = [];
    updateConsoleMessage("");
}

debuggerBP.prototype.newScen = function(c, curTime, cloned) {
    c.setAttribute("scenarioID", c.id);
    this.scenarios[c.id] = [];
    for (let i = 0; i < curTime; i++)
        this.scenarios[c.id].push([-1, null]);
    this.scenarios[c.id].push([c.id, cloned]);
}

debuggerBP.prototype.updateScen = function(scen, c, cloned) {
    c.setAttribute("scenarioID", scen);
    this.scenarios[scen].push([c.id, cloned]);
}

debuggerBP.prototype.getScenarioTime = function(scen) {
    return this.scenarios[scen].length;
}

// function getBlockedEvents() {
//     var res = []
//     window.bpEngine.BThreads.forEach(bt => {
//         bt.stmt.block.forEach(e => res.push(e));
//     });
//     return res;
// }




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