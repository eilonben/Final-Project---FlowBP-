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


EditorUiBP.prototype.createHoverIcons = function()
{
    return new HoverIconsBP(this.editor.graph);
};



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
