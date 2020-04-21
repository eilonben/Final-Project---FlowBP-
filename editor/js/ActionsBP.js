function ActionsBP(actions) {
    this.init(actions);
};

ActionsBP.prototype.init = function(actions) {
    var ui = actions.editorUi;
    var editor = ui.editor;
    var graph = editor.graph;
    var lastUndo = 0;

    actions.addAction('editCode', function () {
        var cell = graph.getSelectionCell() || graph.getModel().getRoot();

        if (cell != null) {
            var dlg = new CodeEditorDialog(ui, cell);
            ui.showDialog(dlg.container, 520, 420, true, true);
            dlg.init();
        }
    });

    actions.addAction('runModel', function() {
        var code = mxUtils.getPrettyXml(ui.editor.getGraphXml());
        console.log(code);
        parse_graph(code);

        mxUtils.alert("Code deployed");
    }, null, null, 'Alt+Shift+R');

    actions.addAction('editBsync', function() {
        var cell = graph.getSelectionCell() || graph.getModel().getRoot();

        if (cell != null) {
            var dlg = new BSyncForm(ui, cell);
            ui.showDialog(dlg.container, 520, 420, true, true);
            dlg.init();
        }
    });

    actions.addAction('next_sbs', function() {
        graph.getModel().beginUpdate();
        var mod = graph.getModel();

        var stage = getNextStage();

        //updateStageVis(stage);
        for (let i = 0; i < stage[0].length; i++) {
            var cell = mod.getCell(stage[0][i]);
            var style = cell.getStyle();
            style = style.replace('strokeColor=#000000', 'strokeColor=#ff0000');
            mod.setStyle(cell, style);
        }

        for (let i = 0; i < stage[1].length; i++) {
            var cell = mod.getCell(stage[1][i]);
            var style = cell.getStyle();
            style = style.replace('strokeColor=#ff0000', 'strokeColor=#000000');
            mod.setStyle(cell, style);
        }

        graph.getModel().endUpdate();

        ui.noUndo();

    }, false, null);

    actions.addAction('back_sbs', function() {
        graph.getModel().beginUpdate();
        var mod = graph.getModel();

        var stage = getPrevStage();

        for (let i = 0; i < stage[0].length; i++) {
            var cell = mod.getCell(stage[0][i]);
            var style = cell.getStyle();
            style = style.replace('strokeColor=#000000', 'strokeColor=#ff0000');
            mod.setStyle(cell, style);
        }

        for (let i = 0; i < stage[1].length; i++) {
            var cell = mod.getCell(stage[1][i]);
            var style = cell.getStyle();
            style = style.replace('strokeColor=#ff0000', 'strokeColor=#000000');
            mod.setStyle(cell, style);
        }

        graph.getModel().endUpdate();

        ui.noUndo();

    }, false, null);

    actions.addAction('stop_sbs', function() {

        graph.getModel().beginUpdate();
        initSBS()
        var mod = graph.getModel();
        var cells = Object.values(mod.cells);

        for (let i = 0; i < cells.length; i++) {
            var cell = cells[i]
            var style = cell.getStyle();
            if (style !== undefined) {
                style = style.replace('strokeColor=#ff0000', 'strokeColor=#000000');
                mod.setStyle(cell, style);
            }
        }

        mod.root.children.forEach(layer => {
            if (mod.isLayer(layer)) {
                var style = layer.getStyle();
                style !== undefined ? style = style.replace('locked=1', 'locked=0') : style = 'locked=0';
                mod.setStyle(layer, style);
            }
        });

        ui.endDebugging();

        graph.getModel().endUpdate();

        editor.undoManager.indexOfNextAdd = lastUndo;
        var numOfNewUndos = editor.undoManager.history.length - lastUndo;
        while(numOfNewUndos-- > 0) {
            editor.undoManager.history.pop();
        }

    }, false, null);

     actions.addAction('debug_sbs', function() {

         lastUndo = editor.undoManager.indexOfNextAdd;

         graph.model.beginUpdate();

         var code = mxUtils.getPrettyXml(ui.editor.getGraphXml());
         console.log(code);
         parse_graph(code);

         graph.selectionModel.cells = []

         var mod = graph.getModel();
         mod.root.children.forEach(layer => {
             if(mod.isLayer(layer)) {
                 var style = layer.getStyle();
                 style !== undefined ? style = style.replace('locked=0', 'locked=1') : style = 'locked=1';
                 mod.setStyle(layer, style);
             }
         });

         ui.startDebugging();

         graph.model.endUpdate();

         ui.noUndo();

     }, null, null);
};