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
debuggerBP.prototype.lastCellValues = {};
debuggerBP.prototype.isFixed = 0;
debuggerBP.prototype.isLocked = 0;
debuggerBP.prototype.scenCounter = 0
debuggerBP.prototype.scenarios = {};
debuggerBP.prototype.consoleSteps = [""];
debuggerBP.prototype.events = [];


// Saves pre-debugging info such as stencils sizes, last undo index in undo manager and cell labels
debuggerBP.prototype.savePreDebuggingInfo = function () {
    this.lastUndo = this.editor.undoManager.indexOfNextAdd;
    this.lastLabels = this.getLabels();
    this.lastCellsSizes = this.getCellsSizes();
    this.lastCellValues = this.getValues();
}

debuggerBP.prototype.getValues = function(){
    var res = {};

    let cells = Object.values(this.mod.cells).filter(cell => cell.bp_cell);
    cells.forEach(cell => {
        if (cell.children !== null && cell.children !== undefined)
            cell.children.forEach(child => res[child.id] = child.getValue())
        res[cell.id] = cell.getValue();
    });

    return res;
}

debuggerBP.prototype.setConsoleSteps = function (rec) {
    let i = 0;
    rec.forEach(stage => {
        let eventOcc = stage.eventSelected == null ? "" : "event selected: " + stage.eventSelected + "\n";
        this.consoleSteps.push(this.consoleSteps[i++] + eventOcc);
    });
}

debuggerBP.prototype.makePayloadSectionsVisible = function (bool) {
    let cells = Object.values(this.mod.cells).filter(cell => cell.bp_cell);
    cells.forEach(cell => {
        if (cell.children !== null && cell.children !== undefined) {
            cell.children.forEach(child => child.setVisible(bool));
            cell.children[0].setVisible(true);
        }
    })
}

debuggerBP.prototype.fixCellsChildrenSizes = function(){
    let cells = Object.values(this.mod.cells).filter(cell => cell.bp_cell);
    cells.forEach(cell => {
        this.setToOriginal(cell)
    })
}

debuggerBP.prototype.startDebugging = function(){

    this.savePreDebuggingInfo();
    this.makePayloadSectionsVisible(true);


    // Locks all layers
    let isLocked = this.editor.undoManager.indexOfNextAdd;
    this.graph.lockLayers(true);
    this.isLocked = this.editor.undoManager.indexOfNextAdd - isLocked;

    let isFixed = this.editor.undoManager.indexOfNextAdd;
    this.fixCellsChildrenSizes();
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
    this.makePayloadSectionsVisible(false);
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
        else if(this.editor.undoManager.indexOfNextAdd == this.editor.undoManager.history.length - 1)
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
        var dWidth = 0;
        var pWidth = 0;
        var dHeight = 0;
        var pHeight = 0;
        var geo = this.mod.getGeometry(cell).clone();
        if (cell.children !== null && cell.children !== undefined) {
            this.graph.cellSizeUpdated(cell.children[0], true);
            //this.graph.updateCellSize(cell.children[0], true);
            dWidth = this.mod.getGeometry(cell.children[0]).width;
            dHeight = this.mod.getGeometry(cell.children[0]).height;
            this.graph.cellSizeUpdated(cell.children[2], true);
            //this.graph.updateCellSize(cell.children[2], true);
            pWidth = this.mod.getGeometry(cell.children[2]).width;
            pHeight = this.mod.getGeometry(cell.children[2]).height;
            //this.fixSizes(cell.children[2], width, height);
        }
        geo.width = Math.max(dWidth, pWidth, this.lastCellsSizes[cell.id].width);
        geo.height = dHeight + pHeight + this.lastCellsSizes[cell.children[1].id].height + 32;
        this.mod.setGeometry(cell, geo);
        var tmpGeo = this.mod.getGeometry(cell.children[0]).clone();
        tmpGeo.width = Math.max(geo.width, dWidth, pWidth);
        this.mod.setGeometry(cell.children[0], tmpGeo);
    }
}

debuggerBP.prototype.convertPayloadToString = function(payload) {
    let i = 0;
    var res = "";
    var width = 0;
    if(payload.constructor === Array) {
        payload.forEach(cur => {
            var curRes = "Payloads[" + i++ + "]: " + JSON.stringify(cur) + "\n";
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

debuggerBP.prototype.updateCell = function(cell, payload) {//blocked, payload) {
    var cellToUpdate = cell;
    var val;
    var color = "none";
    if (payload !== undefined) {
        color = "#99ff99";
        if (cell.bp_type !== "startnode") {
            if (cell.children !== null && cell.children !== undefined) {
                cellToUpdate = cell.children[2];
            }
            val = this.convertPayloadToString(payload);
        }
    }
    mxUtils.setCellStyles(this.mod, [cellToUpdate], 'fillColor', color);
    if(val !== undefined)
        this.mod.setValue(cellToUpdate, val);
    if (cell.bp_type !== "startnode")
        this.fixSizes(cell, payload === undefined);
}

debuggerBP.prototype.setToOriginal = function (cell) {
    var geo = this.mod.getGeometry(cell).clone();
    geo.width = this.lastCellsSizes[cell.id].width;
    geo.height = this.lastCellsSizes[cell.id].height;
    if (cell.children !== null && cell.children !== undefined){
        this.setToOriginal(cell.children[1]);
        this.setToOriginal(cell.children[2]);

        mxUtils.setCellStyles(this.mod, [cell.children[2]], 'fillColor', 'none');
        this.mod.setValue(cell.children[2], '');
    }
    this.mod.setGeometry(cell, geo);
    this.mod.setValue(cell, this.lastCellValues[cell.id]);
}

debuggerBP.prototype.updateVertexCells = function(record) {
    let cells = Object.values(this.mod.cells).filter(cell => cell.bp_cell);

    for (let i = 0; i < record.length; i++) {
        this.mod.beginUpdate();

        let curStage = record[i].stages;

        cells.forEach(cell => {
            this.setToOriginal(cell);
            //this.graph.fixValue(cell);
            this.updateCell(cell, curStage[cell.id])
        });

        this.ui.fixView();

        cells.forEach(cell => {
            fixConnectionPointsLabelLocation(this.editor.graph, cell)
        });

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
    this.scenCounter = 0;
    updateConsoleMessage("");
}

debuggerBP.prototype.newScen = function(c, curTime, cloned) {
    let scen = this.scenCounter++;
    c.scenarioID = scen;
    this.scenarios[scen] = [];
    for (let i = 0; i < curTime; i++)
        this.scenarios[scen].push([-1, null]);
    this.scenarios[scen].push([c.id, cloned]);
}

debuggerBP.prototype.updateScen = function(scen, c, cloned) {
    //c.setAttribute("scenarioID", scen);
    this.scenarios[scen].push([c.id, cloned]);
}

debuggerBP.prototype.endScen = function(scen) {
    this.scenarios[scen].push([-1, null]);
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