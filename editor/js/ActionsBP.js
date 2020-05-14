function ActionsBP(actions) {
    this.init(actions);
}

ActionsBP.prototype.init = function (actions) {
    var ui = actions.editorUi;
    var editor = ui.editor;
    var graph = editor.graph;
    var mod = graph.getModel();
    var deb = new debuggerBP(ui);

    function showConsole() {
        if (this.consoleWindow === null || this.consoleWindow === undefined) {
            this.consoleWindow = new myConsoleWindow(ui, document.body.offsetWidth - 480, 120, 420, 285);
        }
        else {
            this.consoleWindow.window.setVisible(true);
        }
    }

    function hideConsole() {
        if (this.consoleWindow === null || this.consoleWindow === undefined) {
            this.consoleWindow = new myConsoleWindow(ui, document.body.offsetWidth - 480, 120, 420, 285);
        }
        else {
            this.consoleWindow.window.setVisible(false);
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

        var code = mxUtils.getPrettyXml(ui.editor.getGraphXml());
        console.log(code);

        // if invalidCells is not empty -> there are edges without source or target OR start node without edges
        var invalidCells = findInvalidCells(graph.getModel());

        //Confirm that the graph is valid
        if(invalidCells.length != 0)
            mxUtils.alert("Graph is Invalid! lonely start node or edge");
        else
        {
            showConsole.call(this);
            parse_graph(code, null);
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

        deb.next();

    }, false, null);

    actions.addAction('debug_back', function() {

        deb.back();

    }, false, null);

    actions.addAction('debug_stop', function() {

        deb.endDebugging();

        hideConsole.call(this);

        ui.endDebugging();

    }, false, null);


    // Debugging actions using the undoManager of the editor
    actions.addAction('debug_debug', function() {

        try{
            var code = mxUtils.getPrettyXml(ui.editor.getGraphXml());
            parse_graph(code, deb);
        }
        catch{
            return;
        }

        // if invalidCells is not empty -> there are edges without source or target OR start node without edges
        if (findInvalidCells(graph.getModel()).length != 0) {
            mxUtils.alert("Graph is Invalid! disconnected start node or edge");
            return;
        }
        if(window.executeError) {
            return;
        }
        // Moves the UI into debugging mode
        ui.startDebugging();

        showConsole.call(this);

        deb.startDebugging();

    }, null, null);

};