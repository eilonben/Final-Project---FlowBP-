function ActionsBP(actions) {
    this.init(actions);
}

ActionsBP.prototype.init = function (actions) {
    var ui = actions.editorUi;
    var editor = ui.editor;
    var graph = editor.graph;
    var mod = graph.getModel();
    var deb = new debuggerBP(ui);
    // The action that connects between creating the console window and the button to open it
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
    //The action that occurs while clicking the "Open Code Editor" on the general block
    actions.addAction('editCode', function () {
        var cell = graph.getSelectionCell() || graph.getModel().getRoot();

        if (cell != null) {
            var dlg = new CodeEditorDialog(ui, cell);
            ui.showDialog(dlg.container, 520, 420, true, true);
            dlg.init();
        }
    });
    //The action that occurs while clicking the "Play" button in order to execute the BP program
    actions.addAction('runModel', function () {
        var cells = graph.getModel().cells;

        var code = mxUtils.getPrettyXml(ui.editor.getGraphXml());

        // check graph validation
        var ValidationMassage = checkGraphValidation(graph.getModel());
        if (ValidationMassage !== "")
            mxUtils.alert("Graph is Invalid!\n" + ValidationMassage);
        else
        {
            showConsole.call(this);
            parse_graph(code, null);
        }


    }, null, null, 'Alt+Shift+R');

    // actions.addAction('editBsync', function () {
    //     var cell = graph.getSelectionCell() || graph.getModel().getRoot();
    //
    //     if (cell != null) {
    //         var dlg = new BSyncForm(ui, cell);
    //         ui.showDialog(dlg.container, 520, 420, true, true);
    //         dlg.init();
    //     }
    // });

    //The action that occurs when clicking on the "next step" button while in debug mode
    actions.addAction('debug_next', function() {

        deb.next();

    }, false, null);
    //The action that occurs when clicking on the "previous step" button while in debug mode
    actions.addAction('debug_back', function() {

        deb.back();

    }, false, null);
    //The action that occurs when clicking on the "stop" button while in debug mode
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
        var ValidationMassage = checkGraphValidation(graph.getModel());
        if (ValidationMassage !== "") {
            mxUtils.alert("Graph is Invalid!\n" + ValidationMassage);
            return;
        }
        if(window.executeError) {
            return;
        }
        // Moves the UI into debugging mode
        ui.startDebugging();

        showConsole.call(this);

        deb.startDebugging(false);

    }, null, null);

    //new file with new URL
    actions.addAction('new...', function() {
        graph.openLink(ui.getUrl().split('?')[0]);
    });

};