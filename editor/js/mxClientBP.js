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
mxGraph.prototype.createConnectionHandler = function()
{
    return new mxConnectionHandlerBP(this);
};


function mxConnectionHandlerBP(graph, factoryMethod){
    mxConnectionHandler.call(this,graph, factoryMethod);
};


mxConnectionHandlerBP.prototype = Object.create(mxConnectionHandler.prototype);


mxConnectionHandlerBP.prototype.checkLeftConstraints = function(c1, c2) {
    if(c2.point.x != null)
        return c2.point.x < 0.02;
    return true;
}

mxConnectionHandlerBP.prototype.mouseUp = function(sender, me)
{
    if (!me.isConsumed() && this.isConnecting())
    {
        if (this.waypointsEnabled && !this.isStopEvent(me))
        {
            this.addWaypointForEvent(me);
            me.consume();

            return;
        }

        var c1 = this.sourceConstraint;
        var c2 = this.constraintHandler.currentConstraint;

        var source = (this.previous != null) ? this.previous.cell : null;
        var target = null;

        if (this.constraintHandler.currentConstraint != null &&
            this.constraintHandler.currentFocus != null)
        {
            target = this.constraintHandler.currentFocus.cell;
        }

        if (target == null && this.currentState != null)
        {
            target = this.currentState.cell;
        }

        // Inserts the edge if no validation error exists and if constraints differ
        if (this.error == null && this.checkLeftConstraints(c1, c2) && (source == null || target == null ||
            source != target || this.checkConstraints(c1, c2)))
        {
            this.connect(source, target, me.getEvent(), me.getCell());
        }
        else
        {
            // Selects the source terminal for self-references
            if (this.previous != null && this.marker.validState != null &&
                this.previous.cell == this.marker.validState.cell)
            {
                this.graph.selectCellForEvent(this.marker.source, me.getEvent());
            }

            // Displays the error message if it is not an empty string,
            // for empty error messages, the event is silently dropped
            if (this.error != null && this.error.length > 0)
            {
                this.graph.validationAlert(this.error);
            }
        }

        // Redraws the connect icons and resets the handler state
        this.destroyIcons();
        me.consume();
    }

    if (this.first != null)
    {
        this.reset();
    }
};


//mxGraphBP.prototype.constructor = mxGraph;