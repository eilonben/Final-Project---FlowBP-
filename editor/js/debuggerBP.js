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


// Saves pre-debugging info such as stencils sizes, last undo index in undo manager and cell labels
debuggerBP.prototype.savePreDebuggingInfo = function () {
    this.lastUndo = this.editor.undoManager.indexOfNextAdd;
    this.lastLabels = this.getLabels();
    this.lastCellsSizes = this.getCellsSizes();
}

debuggerBP.prototype.startDebugging = function(record){

    this.savePreDebuggingInfo();

    let undoAdd = 0;

    // Locks all layers
    let isLocked = this.editor.undoManager.indexOfNextAdd;
    this.graph.lockLayers(true);
    this.isLocked = this.editor.undoManager.indexOfNextAdd - isLocked;

    let isFixed = this.editor.undoManager.indexOfNextAdd;
    this.ui.fixView();
    this.isFixed = this.editor.undoManager.indexOfNextAdd - isFixed;

    this.updateVertexCells(record);

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

    this.setLabels();
}

debuggerBP.prototype.back = function () {
    if (this.editor.undoManager.indexOfNextAdd > this.lastUndo) {
        this.mod.beginUpdate();

        this.ui.undo();
        this.graph.clearSelection()
        this.ui.noUndoRedo();

        this.mod.endUpdate();

        if (this.editor.undoManager.indexOfNextAdd == this.lastUndo + this.isLocked + this.isFixed)
            this.ui.enableDebugBack(false);
        else if(this.editor.undoManager.indexOfNextAdd + this.isFixed == this.editor.undoManager.history.length)
            this.ui.enableDebugNext(true);
    }
}

debuggerBP.prototype.next = function () {
    this.graph.getModel().beginUpdate();

    this.ui.redo();
    this.graph.clearSelection()
    this.ui.noUndoRedo();

    this.graph.getModel().endUpdate();

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
    let cells = Object.values(this.mod.cells).filter(cell => cell.isVertex());
    cells.forEach(cell => {
        var geo = this.mod.getGeometry(cell);
        res[cell.id] = {width: geo.width, height: geo.height}
    })
    return res;
}

debuggerBP.prototype.fixSizes = function(cell, content) {
    var geo = this.mod.getGeometry(cell).clone();

    if(content != undefined) {
        geo.width += (content.width * 4);
        geo.height += (content.height * 16);
    }
    else{
        geo.width = this.lastCellsSizes[cell.id].width;
        geo.height = this.lastCellsSizes[cell.id].width;
    }

    this.mod.setGeometry(cell, geo);
}

debuggerBP.prototype.convertPayloadToString = function(payload) {
    let i = 0;
    var res = "";
    var width = 0;
    payload.forEach(cur => {
        var curRes = "Payloads[" + i++ + "]: " + JSON.stringify(cur) + "\n";
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
    let cells = Object.values(this.mod.cells).filter(cell => cell.isVertex());

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



