/*mxGraphBP.prototype.init = function(container)
function mxGraphBP(container) {
    mxGrap.call(this, container);
};

mxGraphBP.prototype = Object.create(mxGrap.prototype);*/

mxGraph.prototype.insertEdge = function(parent, id, value, source, target, style)
{
    var edge = this.createEdge(parent, id, value, source, target, style);
    if( edge==null)
        return null;
    return this.addEdge(edge, parent, source, target);
};


mxGraph.prototype.createEdge = function(parent, id, value, source, target, style)
{
    // Creates the edge
    var edge = new mxCell(value, new mxGeometry(), style);
    edge.setId(id);
    edge.setEdge(true);
    edge.geometry.relative = true;
    if(source!=null){
        if(source.edges==null)
            source.edges=[];
        if(source.edges.length == source.getAttribute('numberOfOutputs'))
            return null;
        var outPutNum=source.edges.length;
        var label = source.getAttribute('Outputnumber'+(outPutNum+1));
        edge.setValue(label);

    }
    return edge;
};

//mxGraphBP.prototype.constructor = mxGraph;