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
    //this.lastLabels = this.getLabels();
    this.lastCellsSizes = this.getCellsSizes();
    this.lastCellValues = this.getValues();
}

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

debuggerBP.prototype.setConsoleSteps = function (rec) {
    let i = 0;
    rec.forEach(stage => {
        let eventOcc = stage.eventSelected == null ? "" : "event selected: " + stage.eventSelected + "\n";
        this.consoleSteps.push(this.consoleSteps[i++] + eventOcc);
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

debuggerBP.prototype.fixCellsChildrenSizes = function(){
    let cells = Object.values(this.mod.cells).filter(cell => cell.bp_cell);
    cells.forEach(cell => {
        this.setToOriginal(cell)
    })
}

debuggerBP.prototype.startDebugging = function(){

    this.makePayloadSectionsVisible(true);
    this.savePreDebuggingInfo();

    //lock the option to create news edges
    let tmpCells = Object.values(this.mod.cells).filter(cell => cell.isVertex());
    tmpCells.forEach(cell => cell.connectable=false);


    // Locks all layers
    let isLocked = this.editor.undoManager.indexOfNextAdd;
    this.graph.lockLayers(true);
    this.isLocked = this.editor.undoManager.indexOfNextAdd - isLocked;


    let isFixed = this.editor.undoManager.indexOfNextAdd;
    let cells = Object.values(this.mod.cells).filter(cell => cell.isBPCell());
    cells.forEach(cell => this.fixSizes(cell, false));
    this.fixAllOutputsLabels();
    //this.ui.fixView();
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

};

debuggerBP.prototype.endDebugging = function() {

    //unlock the option to create news edges
    let tmpCells = Object.values(this.mod.cells).filter(cell => cell.isVertex());
    tmpCells.forEach(cell => cell.connectable=true);

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

    let cells = Object.values(this.mod.cells).filter(cell => cell.bp_type);
    cells.forEach(cell => {
        let label = cell.getAttribute('label');
        res[cell.id] = label != undefined ? label : "";
        if(cell.bp_type !== "startnode")
            cell.children.forEach(child => {
                let clabel = child.getAttribute('label');
                res[child.id] = clabel != undefined ? clabel : "";
            })
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
        this.graph.fixSizes(cell);
        // var dWidth = 0;
        // var pWidth = 0;
        // var dHeight = 0;
        // var pHeight = 0;
        // var geo = this.mod.getGeometry(cell).clone();
        // var payloads = this.graph.getChildByType(cell, 'payloads');
        // var data = this.graph.getChildByType(cell, 'data');
        // var divider = this.graph.getChildByType(cell, 'divider2');
        // if (cell.children !== null && cell.children !== undefined) {
        //     this.graph.cellSizeUpdated(data, true);
        //     //this.graph.updateCellSize(cell.children[0], true);
        //     dWidth = this.mod.getGeometry(data).width;
        //     dHeight = this.mod.getGeometry(data).height;
        //     this.graph.cellSizeUpdated(payloads, true);
        //     //this.graph.updateCellSize(cell.children[2], true);
        //     pWidth = this.mod.getGeometry(payloads).width;
        //     pHeight = this.mod.getGeometry(payloads).height;
        //     //this.fixSizes(cell.children[2], width, height);
        // }
        // geo.width = Math.max(dWidth, pWidth, geo.width);
        // geo.height = dHeight + pHeight + divider.getGeometry().height + 32;
        // this.mod.setGeometry(cell, geo);
        // var tmpGeo = this.mod.getGeometry(data).clone();
        // tmpGeo.width = Math.max(geo.width, dWidth, pWidth);
        // this.mod.setGeometry(data, tmpGeo);
        //
        // var dividerGeo = this.mod.getGeometry(divider).clone();
        // dividerGeo.y = this.mod.getGeometry(payloads).y;
        // this.mod.setGeometry(divider, dividerGeo);
        // //this.graph.cellSizeUpdated(cell, true);
        // this.editor.graph.fixConnectionPointsLabelLocation(cell);
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


debuggerBP.prototype.colorCell = function(cell, color) {
    mxUtils.setCellStyles(this.mod, [ cell], 'fillColor', color);
}
debuggerBP.prototype.updateCell = function(cell, payload) {//blocked, payload) {
    this.colorCell(cell, "none");
    if(cell.isBPCell()) {
        cell.children.forEach(child => {
            if (payload !== undefined && child.bp_type == "payloads") {
                this.colorCell(child, "#99ff99");
                this.mod.setValue(child, this.convertPayloadToString(payload));
            } else
                this.colorCell(child, "none");
        });
        this.fixSizes(cell, payload === undefined);
    }
    else if(payload !== undefined)
        this.colorCell(cell, "#99ff99");

}

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
}



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

        //this.ui.fixView();

        this.fixAllOutputsLabels();

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
        var curStage = {stages: {}, eventSelected: null}
        var scens = Object.values(this.scenarios);
        curStage.stages = {};
        for (let j = 0; j < scens.length; j++) {
            if(scens[j][step][0] != -1)
                curStage.stages[scens[j][step][0]] = scens[j][step][1];
        }
        if(this.events[step] != -1)
            curStage.eventSelected = this.events[step];
        if(Object.values(curStage.stages).length > 0 || curStage.eventSelected !== undefined)
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