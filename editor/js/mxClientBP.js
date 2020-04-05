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

function getOutEdges(source) {
    var outEdges = []
    for (let i = 0; i < source.getEdgeCount(); i++) {
        if (isOutEdge(source, source.edges[i]))
            outEdges.push(source.edges[i])
    }
    outEdges.sort((edge)=>edge.getAttribute('labelNum'));
    return outEdges;
}

function findCurrLabel(source) {
    if(getNumOfOutEdges(source)==0)
        return 1;
    var outEdges = getOutEdges(source);
    outEdges = outEdges.map((edge)=>edge.getAttribute('labelNum'));
    outEdges.sort();
    var minIndex=1;
    for(var i=0 ;i<outEdges.length;i++ )
        if(outEdges[i]==minIndex)
            minIndex++;
    return minIndex;
};

mxGraph.prototype.createEdge = function(parent, id, value, source, target, style)
{
    // Creates the edge
    var edge = new mxCell(value, new mxGeometry(), style);
    edge.setId(id);
    edge.setEdge(true);
    edge.geometry.relative = true;

    //check basic legal Edge
    if(source!=null && ( target ==null || getshape(target.getStyle())=="startnode"))
        return null;

    //cases by nodes

    if(source!=null && getshape(source.getStyle())=="general" ){
        var numberOfOutEdges = getNumOfOutEdges(source);
        if(numberOfOutEdges >= source.getAttribute('numberOfOutputs',1))
            return null;
        var indexLabel =findCurrLabel(source);
        var label = source.getAttribute('Outputnumber'+(indexLabel),' ');

        var doc = mxUtils.createXmlDocument();
        var obj = doc.createElement('object');
        obj.setAttribute('label','');
        var value = obj;

        value.setAttribute('labelNum',indexLabel);
        value.setAttribute('label',label);
        edge.setValue(value);

    }else if(source!=null && getshape(source.getStyle())=="bsync" ){
        var numberOfOutEdges = getNumOfOutEdges(source);
        if(numberOfOutEdges >= 1)
            return null;

    }if(source!=null && getshape(source.getStyle())=="startnode" ){
    var numberOfOutEdges = getNumOfOutEdges(source);
    if(numberOfOutEdges >= 1)
        return null;
    }
    return edge;
};

//mxGraphBP.prototype.constructor = mxGraph;