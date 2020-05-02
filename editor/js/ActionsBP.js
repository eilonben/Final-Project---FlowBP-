function ActionsBP(actions) {
    this.init(actions);
}

ActionsBP.prototype.init = function (actions) {
    var ui = actions.editorUi;
    var editor = ui.editor;
    var graph = editor.graph;

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
        var invalidCells = parse_graph(code,graph);

        if(invalidCells.length == 0)
            mxUtils.alert("Code deployed");
        else
            mxUtils.alert("Graph is Invalid! lonely start node or edge");

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

     actions.addAction('debug_debug', function() {

         var mod = graph.getModel()
         fixValues(Object.values(mod.cells));

        lastUndo = editor.undoManager.indexOfNextAdd + 1;

         //var mod = graph.getModel()
         //Object.values(mod.cells).forEach(cell => {
             //cell.setAttribute('label', cell.id)
         //})

         lockLayers(graph, true)

         var code = mxUtils.getPrettyXml(ui.editor.getGraphXml());
         console.log(code);

         var invalidCells = parse_graph(code,graph);

         if(invalidCells.length != 0) {
             mxUtils.alert("Graph is Invalid! lonely start node or edge");
             return;
         }


        // coloring
        var record = getProgramRecord();

         for (let i = 0; i < record.length; i++) {
             mod.beginUpdate();

            var curRec = record[i];
            for (let j = 0; j < curRec.length; j++) {
                var cell = mod.getCell(curRec[j][0]);
                var val = cell.clone().getValue();
                val.setAttribute('Payloads', curRec[j][1]);
                // indicator
                var style = cell.getStyle()
                style = style.replace('strokeColor=#000000', 'strokeColor=#ff0000');
                mod.setStyle(cell, style);
                ////////////
                mod.setValue(cell, val);
            }

             mod.endUpdate();
         }
         //

        let numOfUndos = editor.undoManager.indexOfNextAdd - lastUndo

        for (let i = 0; i < numOfUndos; i++) {
            graph.model.beginUpdate();

            ui.undo();

            graph.model.endUpdate();
        }

        graph.clearSelection()

        ui.startDebugging();

         if(numOfUndos == 0)
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