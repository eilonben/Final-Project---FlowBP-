//
// //defining our own EditorUi, which extends the graph editor original EditorUi
//
// EditorUIBP = function(editor, container, lightbox) {
//
//     EditorUi.call(this, editor, container, lightbox);
// };
//
// EditorUIBP.prototype = Object.create(EditorUi.prototype);
//
// EditorUIBP.prototype.createFormat = function(container){
//
//     return new FormatBP(this,container);
// };
//
// EditorUIBP.prototype.constructor = EditorUi;

function EditorUiBP(editor, container, lightbox) {
    EditorUi.call(this,editor, container, lightbox);
    // new ActionsBP(this.actions);
};
EditorUiBP.prototype = Object.create(EditorUi.prototype);

EditorUiBP.prototype.createFormat = function(container)
{
    return new FormatBP(this, container);
};


EditorUiBP.prototype.createToolbar = function(container)
{
    new ActionsBP(this.actions);
    return new ToolbarBP(this, container);
};

EditorUiBP.prototype.createSidebar = function(container)
{
    return new SidebarBP(this, container);
};


EditorUiBP.prototype.constructor = EditorUi;

EditorUiBP.prototype.disableActionsForDebugging = function (bool) {

    var actions = Object.values(this.actions.actions);

    for (var i = 0; i < actions.length; i++) {
        actions[i].setEnabled(bool);
    }

    actions = ['stop_sbs', 'next_sbs', 'back_sbs'];
    for (var i = 0; i < actions.length; i++) {
        this.actions.get(actions[i]).setEnabled(!bool);
    }
}

EditorUiBP.prototype.startDebugging = function () {

    this.disableActionsForDebugging(false);

    this.toggleFormatPanel(true);
    this.sidebar.showTooltips = false;
    this.sidebarContainer.style.width = '0px';
    this.diagramContainer.style.left = '12px';
    this.hsplit.style.left = '0px';
    this.sidebarContainer.style.visibility = 'hidden';
}

EditorUiBP.prototype.endDebugging = function () {

    this.disableActionsForDebugging(true);

    this.sidebarContainer.style.visibility = 'visible';
    this.toggleFormatPanel();
}

EditorUiBP.prototype.noUndo = function () {
    this.actions.get('undo').setEnabled(false);
}
