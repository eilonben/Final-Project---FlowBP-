// Designed to replace the call to Graph to GraphBP

EditorBP = function(chromeless, themes, model, graph, editable){
    Editor.call(this, chromeless, themes, model, graph, editable);
}

EditorBP.prototype = Object.create(Editor.prototype);

/**
 * Sets the XML node for the current diagram.
 */
EditorBP.prototype.createGraph = function(themes, model)
{
    var graph = new GraphBP(null, model, null, null, themes);
    graph.transparentBackground = false;

    // Opens all links in a new window while editing
    if (!this.chromeless)
    {
        graph.isBlankLink = function(href)
        {
            return !this.isExternalProtocol(href);
        };
    }

    return graph;
};

