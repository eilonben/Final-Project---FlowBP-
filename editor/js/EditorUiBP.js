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


/**
 * Creates a temporary graph instance for rendering off-screen content.
 */
EditorUiBP.prototype.createTemporaryGraph = function(stylesheet)
{
    var graph = new GraphBP(document.createElement('div'), null, null, stylesheet);
    graph.resetViewOnRootChange = false;
    graph.setConnectable(false);
    graph.gridEnabled = false;
    graph.autoScroll = false;
    graph.setTooltips(false);
    graph.setEnabled(false);

    // Container must be in the DOM for correct HTML rendering
    graph.container.style.visibility = 'hidden';
    graph.container.style.position = 'absolute';
    graph.container.style.overflow = 'hidden';
    graph.container.style.height = '1px';
    graph.container.style.width = '1px';

    return graph;
};

// EditorUiBP.prototype.constructor = EditorUi;
