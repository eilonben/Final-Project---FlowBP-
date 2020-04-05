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

function isOutEdge(source,edge){
    return edge.source.getId()==source.getId();
};

function getNumOfOutEdges(source){
    var result = 0 ;
    for(var i=0 ; i<source.getEdgeCount() ; i++){
        if (isOutEdge(source,source.edges[i]))
            result++;
    }
    return result;
};

function findCurrLabel(source) {
    var allLabel = []
    for (var i =0 ; i<source.getAttribute('numberOfOutputs');i++)
        allLabel.push(source.getAttribute('Outputnumber'+(i+1)));

    for(var i=0 ; i<source.getEdgeCount() ; i++){
        if (isOutEdge(source,source.edges[i])  ) {
            var index = allLabel.indexOf(source.edges[i].value);
            if (index >= 0)
                allLabel[index] = true;
        }
    }
    var minIndex=0;
    for(var i=0 ;i<allLabel.length;i++ )
        if(allLabel[i]!=true) {
            minIndex = i;
            break;
        }
    return minIndex;
};

mxGraph.prototype.createEdge = function(parent, id, value, source, target, style)
{
    // Creates the edge
    var edge = new mxCell(value, new mxGeometry(), style);
    edge.setId(id);
    edge.setEdge(true);
    edge.geometry.relative = true;
    if(source!=null && getshape(source.getStyle())=="general" ){
        var numberOfOutEdges = getNumOfOutEdges(source);
        if(numberOfOutEdges >= source.getAttribute('numberOfOutputs',1)|| target ==null || getshape(target.getStyle())=="startnode")
            return null;
        var indexLabel =findCurrLabel(source);
        var label = source.getAttribute('Outputnumber'+(indexLabel+1));
        edge.setAttribute('labelNum',indexLabel);

       var tt=  edge.getAttribute('labelNum');
        edge.setValue(label);

    }
    return edge;
};

//mxGraphBP.prototype.constructor = mxGraph;