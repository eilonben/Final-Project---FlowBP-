function ActionsBP(actions) {
    this.init(actions);
}

ActionsBP.prototype.init = function (actions) {
    var ui = actions.editorUi;
    var editor = ui.editor;
    var graph = editor.graph;
    var mod = graph.getModel();

    var lastUndo = 0;

    function showConsole() {
        if (this.consoleWindow === null || this.consoleWindow === undefined) {
            this.consoleWindow = new myConsoleWindow(ui, document.body.offsetWidth - 480, 120, 420, 285);
        }
        else {
            this.consoleWindow.window.setVisible(true);
        }
    }

    actions.addAction('showConsole', function () {
        showConsole.call(this);
    });
    actions.addAction('editCode', function () {
        var cell = graph.getSelectionCell() || graph.getModel().getRoot();

        if (cell != null) {
            var dlg = new CodeEditorDialog(ui, cell);
            ui.showDialog(dlg.container, 520, 420, true, true);
            dlg.init();
        }
    });

    actions.addAction('runModel', function () {
        var cells = graph.getModel().cells;
        fixValues(Object.values(cells));
        showConsole.call(this);
        var code = mxUtils.getPrettyXml(ui.editor.getGraphXml());
        console.log(code);

        // if invalidCells is not empty -> there are edges without source or target OR start node without edges
        var invalidCells = findInvalidCells(graph.getModel());

        //Confirm that the graph is valid
        if(invalidCells.length != 0)
            mxUtils.alert("Graph is Invalid! lonely start node or edge");
        else
            {
            parse_graph(code);
            mxUtils.alert("Code deployed");
        }


    }, null, null, 'Alt+Shift+R');

    actions.addAction('editBsync', function () {
        var cell = graph.getSelectionCell() || graph.getModel().getRoot();

        if (cell != null) {
            var dlg = new BSyncForm(ui, cell);
            ui.showDialog(dlg.container, 520, 420, true, true);
            dlg.init();
        }
    });

    actions.addAction('debug_next', function() {
        graph.getModel().beginUpdate();

        ui.redo();
        graph.clearSelection()
        ui.noUndoRedo();

        graph.getModel().endUpdate();

        if(lastUndo + 1 == editor.undoManager.indexOfNextAdd)
            ui.enableDebugBack(true);
        else if(editor.undoManager.indexOfNextAdd == editor.undoManager.history.length)
            ui.enableDebugNext(false);
    }, false, null);

    actions.addAction('debug_back', function() {

        if (editor.undoManager.indexOfNextAdd > lastUndo) {
            graph.getModel().beginUpdate();

            ui.undo();
            graph.clearSelection()
            ui.noUndoRedo();

            graph.getModel().endUpdate();

            if (editor.undoManager.indexOfNextAdd == lastUndo)
                ui.enableDebugBack(false);
            else if(editor.undoManager.indexOfNextAdd + 1 == editor.undoManager.history.length)
                ui.enableDebugNext(true);
        }
    }, false, null);

    actions.addAction('debug_stop', function() {

        editor.undoManager.indexOfNextAdd = editor.undoManager.history.length;
        var numOfNewUndos = editor.undoManager.history.length - lastUndo + 1;
        while (numOfNewUndos-- > 0) {
            ui.undo()
            editor.undoManager.history.pop()
        }

        graph.clearSelection()

        ui.endDebugging();

    }, false, null);

    function updateCell(cell, blocked, payload) {
        var val = cell.clone().getValue();
        var style = cell.getStyle()
        //cell.setAttribute('payloadUpdated', '1');
        if(blocked) {
            val.setAttribute('Blocked', '1');
            //style = style.replace('strokeColor=#000000', 'strokeColor=#ff0000');
        }
        else if(payload !== undefined){
            val.setAttribute('Blocked', '0');
            val.setAttribute('Payloads', JSON.stringify(payload));
            style = style.replace('strokeColor=#000000', 'strokeColor=#ff0000');
        }
        else
            //val.setAttribute('payloadUpdated', '0');
            style = style.replace('strokeColor=#ff0000', 'strokeColor=#000000');
        mod.setValue(cell, val);
        mod.setStyle(cell, style);
    }

    function updateVertexCells(record) {
        let cells = Object.values(mod.cells).filter(cell => cell.isVertex());

        for (let i = 0; i < record.length; i++) {
            mod.beginUpdate();

            let curBlocksToBlock = record[i].blockedBlocks;
            let curStage = record[i].stages;

            cells.forEach(cell => {
                updateCell(cell, curBlocksToBlock.includes(cell.id), curStage[cell.id])
            });

            mod.endUpdate();
        }
    }

    actions.addAction('debug_debug', function() {

        fixValues(Object.values(mod.cells));

        lastUndo = editor.undoManager.indexOfNextAdd + 1;

        ui.startDebugging();

        lockLayers(graph, true)

        var code = mxUtils.getPrettyXml(ui.editor.getGraphXml());
        console.log(code);

        // if invalidCells is not empty -> there are edges without source or target OR start node without edges
        var invalidCells = findInvalidCells(graph.getModel());

        if (invalidCells.length != 0) {
            mxUtils.alert("Graph is Invalid! disconnected start node or edge");
            return;
        }

        lockLayers(graph, true)
        parse_graph(code, graph);

        var record = getProgramRecord();
        updateVertexCells(record);

        let numOfUndos = editor.undoManager.indexOfNextAdd - lastUndo;
        for (let i = 0; i < numOfUndos; i++) {
            graph.model.beginUpdate();

            ui.undo();

            graph.model.endUpdate();
        }

        graph.clearSelection()

        graph.view.validate();

        if (numOfUndos == 0)
            ui.enableDebugNext(false);

    }, null, null);

};

function lockLayers(graph, lock) {

    var mod = graph.getModel()
    graph.getModel().beginUpdate();

    var locker;
    lock ? locker = '1' : locker = '0';

    mod.root.children.forEach(layer => {
        if(mod.isLayer(layer)) {
            var style = layer.getStyle()
            var value = (mxUtils.getValue(style, 'locked', locker) == '1') ? locker : !locker;
            graph.setCellStyles('locked', value, [layer]);
        }
    });

    graph.getModel().endUpdate();

}

function fixValues(cells) {
    for (let i = 0; i < cells.length; i++) {
        let c = cells[i];
        let value = c.getValue();

        // Converts the value to an XML node
        if (value == "") {
            var doc = mxUtils.createXmlDocument();
            var obj = doc.createElement('object');
            obj.setAttribute('label', value || '');
            value = obj;
        }

        c.setValue(value);
    }
}