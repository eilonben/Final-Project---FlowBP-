function ActionsBP(actions) {
    this.init(actions);
};

ActionsBP.prototype.init = function(actions) {
    var ui = actions.editorUi;
    var editor = ui.editor;
    var graph = editor.graph;

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

    actions.addAction('runSBS', function() {
        ////////////////////////////////////
        var mod = graph.getModel();

        var stage = getStage();
        if(stage == -1)
            return;

        var cell = mod.getCell(stage);
        var style = cell.getStyle();
        style = style.replace('strokeColor=#000000', 'strokeColor=#ff0000');
        mod.setStyle(cell, style);

        var edges = mod.getIncomingEdges(cell);
        //edges.forEach(edge => {
        for(let i = 0; i < edges.length; i++){
            var parent = edges[i].source
            style = parent.getStyle();
            if (style !== undefined) {
                style = style.replace('strokeColor=#ff0000', 'strokeColor=#000000');
                mod.setStyle(parent, style);
            }
        }//)
        ////////////////////////////////////
    }, null, null);

};