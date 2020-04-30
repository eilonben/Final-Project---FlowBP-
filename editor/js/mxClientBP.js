// mxGraphBP.prototype.init = function(container)

// function mxGraphBP(container, model, renderHint, stylesheet){
//     mxGraph.call(this,container, model, renderHint, stylesheet);
// };
//
// mxGraphBP.prototype = Object.create(mxGrap.prototype);





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


function findCurrLabel(source, state) {
    //there is only one constraint point
    if(source.new_constraints == null)
        return 1;
    //search for the source constraint of the edge
    var index = 0;
    for(; index <= source.new_constraints.length; index++){
        var constraint = source.new_constraints[index];
        if(constraint.point.x == state.exitX && constraint.point.y == state.exitY)
            break;
    }
    return index+1;
}
function getOutEdges(source) {
    var outEdges = [];
    for (let i = 0; i < source.getEdgeCount(); i++) {
        if (isOutEdge(source, source.edges[i]))
            outEdges.push(source.edges[i])
    }
    outEdges.sort((edge)=>edge.getAttribute('labelNum'));
    return outEdges;
}


function mxVertexHandlerBP(state){
    mxVertexHandler.call(this, state);
};


mxVertexHandlerBP.prototype = Object.create(mxVertexHandler.prototype);


// TODO hadas resize
mxVertexHandlerBP.prototype.mouseUp = function(sender, me)
{
    if (this.index != null && this.state != null)
    {
        var point = new mxPoint(me.getGraphX(), me.getGraphY());
        var index = this.index;
        this.index = null;

        this.graph.getModel().beginUpdate();
        try
        {
            if (index <= mxEvent.CUSTOM_HANDLE)
            {
                if (this.customHandles != null)
                {
                    this.customHandles[mxEvent.CUSTOM_HANDLE - index].active = false;
                    this.customHandles[mxEvent.CUSTOM_HANDLE - index].execute();
                }
            }
            else if (index == mxEvent.ROTATION_HANDLE)
            {
                if (this.currentAlpha != null)
                {
                    var delta = this.currentAlpha - (this.state.style[mxConstants.STYLE_ROTATION] || 0);

                    if (delta != 0)
                    {
                        this.rotateCell(this.state.cell, delta);
                    }
                }
                else
                {
                    this.rotateClick();
                }
            }
            else
            {
                var gridEnabled = this.graph.isGridEnabledEvent(me.getEvent());
                var alpha = mxUtils.toRadians(this.state.style[mxConstants.STYLE_ROTATION] || '0');
                var cos = Math.cos(-alpha);
                var sin = Math.sin(-alpha);

                var dx = point.x - this.startX;
                var dy = point.y - this.startY;

                // Rotates vector for mouse gesture
                var tx = cos * dx - sin * dy;
                var ty = sin * dx + cos * dy;

                dx = tx;
                dy = ty;

                var s = this.graph.view.scale;
                var recurse = this.isRecursiveResize(this.state, me);
                this.resizeCell(this.state.cell, this.roundLength(dx / s), this.roundLength(dy / s),
                    index, gridEnabled, this.isConstrainedEvent(me), recurse, this.state, me);

            }
        }
        finally
        {
            this.graph.getModel().endUpdate();
        }

        me.consume();
        this.reset();
    }
};


mxVertexHandlerBP.prototype.resizeCell = function(cell, dx, dy, index, gridEnabled, constrained, recurse, state, event)
{
    var geo = this.graph.model.getGeometry(cell);

    if (geo != null)
    {
        if (index == mxEvent.LABEL_HANDLE)
        {
            var alpha = -mxUtils.toRadians(this.state.style[mxConstants.STYLE_ROTATION] || '0');
            var cos = Math.cos(alpha);
            var sin = Math.sin(alpha);
            var scale = this.graph.view.scale;
            var pt = mxUtils.getRotatedPoint(new mxPoint(
                Math.round((this.labelShape.bounds.getCenterX() - this.startX) / scale),
                Math.round((this.labelShape.bounds.getCenterY() - this.startY) / scale)),
                cos, sin);

            geo = geo.clone();

            if (geo.offset == null)
            {
                geo.offset = pt;
            }
            else
            {
                geo.offset.x += pt.x;
                geo.offset.y += pt.y;
            }

            this.graph.model.setGeometry(cell, geo);
        }
        else if (this.unscaledBounds != null)
        {
            var scale = this.graph.view.scale;

            if (this.childOffsetX != 0 || this.childOffsetY != 0)
            {
                this.moveChildren(cell, Math.round(this.childOffsetX / scale), Math.round(this.childOffsetY / scale));
            }

            this.graph.resizeCell(cell, this.unscaledBounds, recurse);

        }
        this.graph.connectionHandler.constraintHandler.showConstraint(event, state, true);
    }
};



function mxConnectionHandlerBP(graph, factoryMethod){
    mxConnectionHandler.call(this,graph, factoryMethod);
};


mxConnectionHandlerBP.prototype = Object.create(mxConnectionHandler.prototype);


mxConnectionHandlerBP.prototype.insertEdge = function(parent, id, value, source, target, style, state)
{
    if (this.factoryMethod == null)
    {
        return this.graph.insertEdge(parent, id, value, source, target, style, state);
    }
    else
    {
        var edge = this.createEdge(value, source, target, style);
        edge = this.graph.addEdge(edge, parent, source, target);

        return edge;
    }
};

mxConnectionHandlerBP.prototype.init = function()
{
    this.graph.addMouseListener(this);
    this.marker = this.createMarker();
    this.constraintHandler = new mxConstraintHandlerBP(this.graph);

    // Redraws the icons if the graph changes
    this.changeHandler = mxUtils.bind(this, function(sender)
    {
        if (this.iconState != null)
        {
            this.iconState = this.graph.getView().getState(this.iconState.cell);
        }

        if (this.iconState != null)
        {
            this.redrawIcons(this.icons, this.iconState);
            this.constraintHandler.reset();
        }
        else if (this.previous != null && this.graph.view.getState(this.previous.cell) == null)
        {
            this.reset();
        }
    });

    this.graph.getModel().addListener(mxEvent.CHANGE, this.changeHandler);
    this.graph.getView().addListener(mxEvent.SCALE, this.changeHandler);
    this.graph.getView().addListener(mxEvent.TRANSLATE, this.changeHandler);
    this.graph.getView().addListener(mxEvent.SCALE_AND_TRANSLATE, this.changeHandler);

    // Removes the icon if we step into/up or start editing
    this.drillHandler = mxUtils.bind(this, function(sender)
    {
        this.reset();
    });

    this.graph.addListener(mxEvent.START_EDITING, this.drillHandler);
    this.graph.getView().addListener(mxEvent.DOWN, this.drillHandler);
    this.graph.getView().addListener(mxEvent.UP, this.drillHandler);
};



mxConnectionHandlerBP.prototype.checkAndFixBorder = function(edge) {
    var styles = edge.style.trim().split(";");
    styles=styles.map(x=>x.split("="));
    var stylesDic={};
    function toDictionary(style,val) {
        stylesDic[style]=val;
    }

    for (let i = 0; i < styles.length-1; i++) {
        toDictionary(styles[i][0],styles[i][1])
    }
    stylesDic["entryX"]="0";
    stylesDic["entryY"]= "0.5";
    var newStyle="";
    for (var key in stylesDic) {
        newStyle+=key+"="+stylesDic[key]+";";
    }
    edge.style=newStyle;

}

//this is for labels per constraint point
mxConnectionHandlerBP.prototype.connect = function(source, target, evt, dropTarget)
{
        if (target != null || this.isCreateTarget(evt) || this.graph.allowDanglingEdges)
        {
            // Uses the common parent of source and target or
            // the default parent to insert the edge
            var model = this.graph.getModel();
            var terminalInserted = false;
            var edge = null;

            model.beginUpdate();
            try
            {
                if (source != null && target == null && !this.graph.isIgnoreTerminalEvent(evt) && this.isCreateTarget(evt))
                {
                    target = this.createTargetVertex(evt, source);

                    if (target != null)
                    {
                        dropTarget = this.graph.getDropTarget([target], evt, dropTarget);
                        terminalInserted = true;

                        // Disables edges as drop targets if the target cell was created
                        // FIXME: Should not shift if vertex was aligned (same in Java)
                        if (dropTarget == null || !this.graph.getModel().isEdge(dropTarget))
                        {
                            var pstate = this.graph.getView().getState(dropTarget);

                            if (pstate != null)
                            {
                                var tmp = model.getGeometry(target);
                                tmp.x -= pstate.origin.x;
                                tmp.y -= pstate.origin.y;
                            }
                        }
                        else
                        {
                            dropTarget = this.graph.getDefaultParent();
                        }

                        this.graph.addCell(target, dropTarget);
                    }
                }

                var parent = this.graph.getDefaultParent();

                if (source != null && target != null &&
                    model.getParent(source) == model.getParent(target) &&
                    model.getParent(model.getParent(source)) != model.getRoot())
                {
                    parent = model.getParent(source);

                    if ((source.geometry != null && source.geometry.relative) &&
                        (target.geometry != null && target.geometry.relative))
                    {
                        parent = model.getParent(parent);
                    }
                }

                // Uses the value of the preview edge state for inserting
                // the new edge into the graph
                var value = null;
                var style = null;
                var state = null;

                if (this.edgeState != null)
                {
                    value = this.edgeState.cell.value;
                    style = this.edgeState.cell.style;
                    state = this.edgeState.style;
                }

                edge = this.insertEdge(parent, null, value, source, target, style, state);

                if (edge != null)
                {
                    // Updates the connection constraints
                    this.graph.setConnectionConstraint(edge, source, true, this.sourceConstraint);
                    this.graph.setConnectionConstraint(edge, target, false, this.constraintHandler.currentConstraint);
                    this.checkAndFixBorder(edge);
                    // Uses geometry of the preview edge state
                    if (this.edgeState != null)
                    {
                        model.setGeometry(edge, this.edgeState.cell.geometry);
                    }

                    var parent = model.getParent(source);

                    // Inserts edge before source
                    if (this.isInsertBefore(edge, source, target, evt, dropTarget))
                    {
                        var index = null;
                        var tmp = source;

                        while (tmp.parent != null && tmp.geometry != null &&
                        tmp.geometry.relative && tmp.parent != edge.parent)
                        {
                            tmp = this.graph.model.getParent(tmp);
                        }

                        if (tmp != null && tmp.parent != null && tmp.parent == edge.parent)
                        {
                            model.add(parent, edge, tmp.parent.getIndex(tmp));
                        }
                    }

                    // Makes sure the edge has a non-null, relative geometry
                    var geo = model.getGeometry(edge);

                    if (geo == null)
                    {
                        geo = new mxGeometry();
                        geo.relative = true;

                        model.setGeometry(edge, geo);
                    }

                    // Uses scaled waypoints in geometry
                    if (this.waypoints != null && this.waypoints.length > 0)
                    {
                        var s = this.graph.view.scale;
                        var tr = this.graph.view.translate;
                        geo.points = [];

                        for (var i = 0; i < this.waypoints.length; i++)
                        {
                            var pt = this.waypoints[i];
                            geo.points.push(new mxPoint(pt.x / s - tr.x, pt.y / s - tr.y));
                        }
                    }

                    if (target == null)
                    {
                        var t = this.graph.view.translate;
                        var s = this.graph.view.scale;
                        var pt = (this.originalPoint != null) ?
                            new mxPoint(this.originalPoint.x / s - t.x, this.originalPoint.y / s - t.y) :
                            new mxPoint(this.currentPoint.x / s - t.x, this.currentPoint.y / s - t.y);
                        pt.x -= this.graph.panDx / this.graph.view.scale;
                        pt.y -= this.graph.panDy / this.graph.view.scale;
                        geo.setTerminalPoint(pt, false);
                    }

                    this.fireEvent(new mxEventObject(mxEvent.CONNECT, 'cell', edge, 'terminal', target,
                        'event', evt, 'target', dropTarget, 'terminalInserted', terminalInserted));
                }
            }
            catch (e)
            {
                mxLog.show();
                mxLog.debug(e.message);
            }
            finally
            {
                model.endUpdate();
            }

            if (this.select)
            {
                this.selectCells(edge, (terminalInserted) ? target : null);
            }
        }
};

//mxGraphBP.prototype.constructor = mxGraph;


// TODO: delete this - hadas
var mxConstraintHandler_id = 101;
var listforme = [];

function mxConstraintHandlerBP(graph){
    mxConstraintHandler.call(this, graph);
    this.focusIcons = new Map();
    listforme.push(this);
    this.id = mxConstraintHandler_id++;

};

let hadas = 'a';

// mxConstraintHandlerBP.prototype.focusIcons = new Map();


mxConstraintHandlerBP.prototype = Object.create(mxConstraintHandler.prototype);


mxConstraintHandlerBP.prototype.pointImage = new mxImage(mxClient.imageBasePath + '/purple-point.png', 10, 10);


mxConstraintHandlerBP.prototype.highlightColor = '#808080';


mxConstraintHandlerBP.prototype.getImageForConstraint = function(state, constraint, point)
{
    return this.pointImage;
};


/**
 * Function: reset
 *
 * Resets the state of this handler.
 */
mxConstraintHandlerBP.prototype.reset = function()
{
    if (this.focusIcons[hadas] != null)
    {
        for (var i = 0; i < this.focusIcons[hadas].length; i++)
        {
            this.focusIcons[hadas][i].destroy();
        }

        this.focusIcons[hadas] = [];
    }

    if (this.focusHighlight != null)
    {
        this.focusHighlight.destroy();
        this.focusHighlight = null;
    }

    this.currentConstraint = null;
    this.currentFocusArea = null;
    this.currentPoint = null;
    this.currentFocus = null;
    this.focusPoints = null;
};


/**
 * Function: destroyIcons
 *
 * Destroys the <focusIcons> if they exist.
 */
mxConstraintHandlerBP.prototype.destroyIcons = function()
{
    if (this.focusIcons[hadas] != null)
    {
        for (var i = 0; i < this.focusIcons[hadas].length; i++)
        {
            this.focusIcons[hadas][i].destroy();
        }

        this.focusIcons[hadas] = [];
        this.focusPoints = null;
    }
};


/**
 * Function: update
 *
 * Updates the state of this handler based on the given <mxMouseEvent>.
 * Source is a boolean indicating if the cell is a source or target.
 */
mxConstraintHandlerBP.prototype.update = function(me, source, existingEdge, point)
{
    if (this.isEnabled() && !this.isEventIgnored(me))
    {
        // Lazy installation of mouseleave handler
        if (this.mouseleaveHandler == null && this.graph.container != null)
        {
            this.mouseleaveHandler = mxUtils.bind(this, function()
            {
                this.reset();
            });

            mxEvent.addListener(this.graph.container, 'mouseleave', this.resetHandler);
        }

        var tol = this.getTolerance(me);
        var x = (point != null) ? point.x : me.getGraphX();
        var y = (point != null) ? point.y : me.getGraphY();
        var grid = new mxRectangle(x - tol, y - tol, 2 * tol, 2 * tol);
        var mouse = new mxRectangle(me.getGraphX() - tol, me.getGraphY() - tol, 2 * tol, 2 * tol);
        var state = this.graph.view.getState(this.getCellForEvent(me, point));

        // Keeps focus icons visible while over vertex bounds and no other cell under mouse or shift is pressed
        if (!this.isKeepFocusEvent(me) && (this.currentFocusArea == null || this.currentFocus == null ||
            (state != null) || !this.graph.getModel().isVertex(this.currentFocus.cell) ||
            !mxUtils.intersects(this.currentFocusArea, mouse)) && (state != this.currentFocus))
        {
            this.currentFocusArea = null;
            this.currentFocus = null;
            this.setFocus(me, state, source);
        }

        this.currentConstraint = null;
        this.currentPoint = null;
        var minDistSq = null;

        if (this.focusIcons[hadas] != null && this.constraints != null &&
            (state == null || this.currentFocus == state))
        {
            var cx = mouse.getCenterX();
            var cy = mouse.getCenterY();

            for (var i = 0; i < this.focusIcons[hadas].length; i++)
            {
                var dx = cx - this.focusIcons[hadas][i].bounds.getCenterX();
                var dy = cy - this.focusIcons[hadas][i].bounds.getCenterY();
                var tmp = dx * dx + dy * dy;

                if ((this.intersects(this.focusIcons[hadas][i], mouse, source, existingEdge) || (point != null &&
                    this.intersects(this.focusIcons[hadas][i], grid, source, existingEdge))) &&
                    (minDistSq == null || tmp < minDistSq))
                {
                    this.currentConstraint = this.constraints[i];
                    this.currentPoint = this.focusPoints[i];
                    minDistSq = tmp;

                    var tmp = this.focusIcons[hadas][i].bounds.clone();
                    tmp.grow(mxConstants.HIGHLIGHT_SIZE + 1);
                    tmp.width -= 1;
                    tmp.height -= 1;

                    if (this.focusHighlight == null)
                    {
                        var hl = this.createHighlightShape();
                        hl.dialect = (this.graph.dialect == mxConstants.DIALECT_SVG) ?
                            mxConstants.DIALECT_SVG : mxConstants.DIALECT_VML;
                        hl.pointerEvents = false;

                        hl.init(this.graph.getView().getOverlayPane());
                        this.focusHighlight = hl;

                        var getState = mxUtils.bind(this, function()
                        {
                            return (this.currentFocus != null) ? this.currentFocus : state;
                        });

                        mxEvent.redirectMouseEvents(hl.node, this.graph, getState);
                    }

                    this.focusHighlight.bounds = tmp;
                    this.focusHighlight.redraw();
                }
            }
        }

        if (this.currentConstraint == null)
        {
            this.destroyFocusHighlight();
        }
    }
    else
    {
        this.currentConstraint = null;
        this.currentFocus = null;
        this.currentPoint = null;
    }
};


/**
 * Function: redraw
 *
 * Transfers the focus to the given state as a source or target terminal. If
 * the handler is not enabled then the outline is painted, but the constraints
 * are ignored.
 */
mxConstraintHandlerBP.prototype.redraw = function()
{
    if (this.currentFocus != null && this.constraints != null && this.focusIcons[hadas] != null)
    {
        var state = this.graph.view.getState(this.currentFocus.cell);
        this.currentFocus = state;
        this.currentFocusArea = new mxRectangle(state.x, state.y, state.width, state.height);

        for (var i = 0; i < this.constraints.length; i++)
        {
            var cp = this.graph.getConnectionPoint(state, this.constraints[i]);
            var img = this.getImageForConstraint(state, this.constraints[i], cp);

            var bounds = new mxRectangle(Math.round(cp.x - img.width / 2),
                Math.round(cp.y - img.height / 2), img.width, img.height);
            this.focusIcons[hadas][i].bounds = bounds;
            this.focusIcons[hadas][i].redraw();
            this.currentFocusArea.add(this.focusIcons[hadas][i].bounds);
            this.focusPoints[i] = cp;
        }
    }
};


mxConstraintHandlerBP.prototype.setFocus = function(me, state, source)
{
    this.constraints = (state != null && !this.isStateIgnored(state, source) &&
        this.graph.isCellConnectable(state.cell)) ? ((this.isEnabled()) ?
        (this.graph.getAllConnectionConstraints(state, source) || []) : []) : null;

    // Only uses cells which have constraints
    if (this.constraints != null)
    {
        this.currentFocus = state;
        this.currentFocusArea = new mxRectangle(state.x, state.y, state.width, state.height);

        if (this.focusIcons[hadas] != null)
        {
            for (var i = 0; i < this.focusIcons[hadas].length; i++)
            {
                this.focusIcons[hadas][i].destroy();
            }

            this.focusIcons[hadas] = null;
            this.focusPoints = null;
        }

        this.focusPoints = [];
        this.focusIcons[hadas] = [];

        for (var i = 0; i < this.constraints.length; i++)
        {
            var cp = this.graph.getConnectionPoint(state, this.constraints[i]);
            var img = this.getImageForConstraint(state, this.constraints[i], cp);

            var src = img.src;
            var bounds = new mxRectangle(Math.round(cp.x - img.width / 2),
                Math.round(cp.y - img.height / 2), img.width, img.height);
            var icon = new mxImageShape(bounds, src);
            icon.dialect = (this.graph.dialect != mxConstants.DIALECT_SVG) ?
                mxConstants.DIALECT_MIXEDHTML : mxConstants.DIALECT_SVG;
            icon.preserveImageAspect = false;
            icon.init(this.graph.getView().getDecoratorPane());

            // Fixes lost event tracking for images in quirks / IE8 standards
            if (mxClient.IS_QUIRKS || document.documentMode == 8)
            {
                mxEvent.addListener(icon.node, 'dragstart', function(evt)
                {
                    mxEvent.consume(evt);

                    return false;
                });
            }

            // Move the icon behind all other overlays
            if (icon.node.previousSibling != null)
            {
                icon.node.parentNode.insertBefore(icon.node, icon.node.parentNode.firstChild);
            }

            var getState = mxUtils.bind(this, function()
            {
                return (this.currentFocus != null) ? this.currentFocus : state;
            });

            icon.redraw();

            mxEvent.redirectMouseEvents(icon.node, this.graph, getState);
            this.currentFocusArea.add(icon.bounds);
            this.focusIcons[hadas].push(icon);
            this.focusPoints.push(cp);
        }

        this.currentFocusArea.grow(this.getTolerance(me));
    }
    else
    {
        this.destroyIcons();
        this.destroyFocusHighlight();
    }
};




mxConstraintHandlerBP.prototype.showConstraint = function(me, states, source)
{
    return;
   states = (states instanceof Array) ? states : [states];
   for(var j = 0; j < states.length; j++) {
       var state = states[j];
       this.constraints = (state != null) ? this.graph.getAllConnectionConstraints(state, source) : null;

       // Only uses cells which have constraints
       if (this.constraints != null) {
           this.currentFocus = state;
           this.currentFocusArea = new mxRectangle(state.x, state.y, state.width, state.height);

           var cell = state.cell;
           if (this.focusIcons[cell] != null) {
               for (var i = 0; i < this.focusIcons[cell].length; i++) {
                   this.focusIcons[cell][i].destroy();
               }

               this.focusIcons[cell] = null;
               this.focusPoints = null;
           }

           this.focusPoints = [];
           this.focusIcons[cell] = [];

           for (var i = 0; i < this.constraints.length; i++) {
               var cp = this.graph.getConnectionPoint(state, this.constraints[i]);
               var img = this.getImageForConstraint(state, this.constraints[i], cp);

               var src = img.src;
               var bounds = new mxRectangle(Math.round(cp.x - img.width / 2),
                   Math.round(cp.y - img.height / 2), img.width, img.height);
               var icon = new mxImageShape(bounds, src);
               icon.dialect = (this.graph.dialect != mxConstants.DIALECT_SVG) ?
                   mxConstants.DIALECT_MIXEDHTML : mxConstants.DIALECT_SVG;
               icon.preserveImageAspect = false;
               icon.init(this.graph.getView().getDecoratorPane());

               // Fixes lost event tracking for images in quirks / IE8 standards
               if (mxClient.IS_QUIRKS || document.documentMode == 8) {
                   mxEvent.addListener(icon.node, 'dragstart', function (evt) {
                       mxEvent.consume(evt);

                       return false;
                   });
               }

               // Move the icon behind all other overlays
               if (icon.node.previousSibling != null) {
                   icon.node.parentNode.insertBefore(icon.node, icon.node.parentNode.firstChild);
               }

               var getState = mxUtils.bind(this, function () {
                   return (this.currentFocus != null) ? this.currentFocus : state;
               });

               icon.redraw();

               mxEvent.redirectMouseEvents(icon.node, this.graph, getState);
               this.currentFocusArea.add(icon.bounds);
               this.focusIcons[cell].push(icon);
               this.focusPoints.push(cp);
           }

           this.currentFocusArea.grow(this.getTolerance(me));
       }
   }
};



//this section aim to
function mxGraphHandlerBP(graph){
    mxGraphHandler.call(this, graph);

};


mxGraphHandlerBP.prototype = Object.create(mxGraphHandler.prototype);


mxGraphHandlerBP.prototype.moveCells = function(cells, dx, dy, clone, target, evt) {
    //this is new
    const edges = cells.filter(cell => cell.getStyle().includes("edgeStyle"));
    const shapes = cells.filter(cell => cell.getStyle().includes('shape'));
    var validEdges = edges.filter(edge => (cells.includes(edge.target) && cells.includes(edge.source)));
    cells = shapes.concat(validEdges);

    //this is old
    if (clone) {
        cells = this.graph.getCloneableCells(cells);
    }

    // Removes cells from parent
    var parent = this.graph.getModel().getParent(this.cell);

    if (target == null && this.isRemoveCellsFromParent() &&
        this.shouldRemoveCellsFromParent(parent, cells, evt)) {
        target = this.graph.getDefaultParent();
    }

    // Cloning into locked cells is not allowed
    clone = clone && !this.graph.isCellLocked(target || this.graph.getDefaultParent());

    this.graph.getModel().beginUpdate();
    try {
        var parents = [];

        // Removes parent if all child cells are removed
        if (!clone && target != null && this.removeEmptyParents) {
            // Collects all non-selected parents
            var dict = new mxDictionary();

            for (var i = 0; i < cells.length; i++) {
                dict.put(cells[i], true);
            }

            // LATER: Recurse up the cell hierarchy
            for (var i = 0; i < cells.length; i++) {
                var par = this.graph.model.getParent(cells[i]);

                if (par != null && !dict.get(par)) {
                    dict.put(par, true);
                    parents.push(par);
                }
            }
        }

        // Passes all selected cells in order to correctly clone or move into
        // the target cell. The method checks for each cell if its movable.
        cells = this.graph.moveCells(cells, dx, dy, clone, target, evt);

        // Removes parent if all child cells are removed
        var temp = [];

        for (var i = 0; i < parents.length; i++) {
            if (this.shouldRemoveParent(parents[i])) {
                temp.push(parents[i]);
            }
        }

        this.graph.removeCells(temp, false);
    }
    finally {
        this.graph.getModel().endUpdate();
    }

    // Selects the new cells if cells have been cloned
    if (clone) {
        this.graph.setSelectionCells(cells);
    }

    if (this.isSelectEnabled() && this.scrollOnMove) {
        this.graph.scrollCellToVisible(cells[0]);
    }


};


// mxGraph
mxGraph.prototype.insertEdge = function(parent, id, value, source, target, style, state)
{

    var edge = this.createEdge(parent, id, value, source, target, style, state);
    if( edge==null)
        return null;
    return this.addEdge(edge, parent, source, target);
};


mxGraph.prototype.createGraphHandler = function()
{
    return new mxGraphHandlerBP(this);
};


mxGraph.prototype.createVertexHandler = function(state)
{
    return new mxVertexHandlerBP(state);
};


mxGraph.prototype.createConnectionHandler = function()
{
    return new mxConnectionHandlerBP(this);
};


mxGraph.prototype.moveCells = function(cells, dx, dy, clone, target, evt, mapping)
{
    dx = (dx != null) ? dx : 0;
    dy = (dy != null) ? dy : 0;
    clone = (clone != null) ? clone : false;

    if (cells != null && (dx != 0 || dy != 0 || clone || target != null))
    {
        // Removes descendants with ancestors in cells to avoid multiple moving
        cells = this.model.getTopmostCells(cells);

        this.model.beginUpdate();
        try
        {
            // Faster cell lookups to remove relative edge labels with selected
            // terminals to avoid explicit and implicit move at same time
            var dict = new mxDictionary();

            for (var i = 0; i < cells.length; i++)
            {
                dict.put(cells[i], true);
            }

            var isSelected = mxUtils.bind(this, function(cell)
            {
                while (cell != null)
                {
                    if (dict.get(cell))
                    {
                        return true;
                    }

                    cell = this.model.getParent(cell);
                }

                return false;
            });

            // Removes relative edge labels with selected terminals
            var checked = [];

            for (var i = 0; i < cells.length; i++)
            {
                var geo = this.getCellGeometry(cells[i]);
                var parent = this.model.getParent(cells[i]);

                if ((geo == null || !geo.relative) || !this.model.isEdge(parent) ||
                    (!isSelected(this.model.getTerminal(parent, true)) &&
                        !isSelected(this.model.getTerminal(parent, false))))
                {
                    checked.push(cells[i]);
                }
            }

            cells = checked;

            if (clone)
            {
                cells = this.cloneCells(cells, this.isCloneInvalidEdges(), mapping);

                if (target == null)
                {
                    target = this.getDefaultParent();
                }
            }

            // FIXME: Cells should always be inserted first before any other edit
            // to avoid forward references in sessions.
            // Need to disable allowNegativeCoordinates if target not null to
            // allow for temporary negative numbers until cellsAdded is called.
            var previous = this.isAllowNegativeCoordinates();

            if (target != null)
            {
                this.setAllowNegativeCoordinates(true);
            }

            this.cellsMoved(cells, dx, dy, !clone && this.isDisconnectOnMove()
                && this.isAllowDanglingEdges(), target == null,
                this.isExtendParentsOnMove() && target == null);

            this.setAllowNegativeCoordinates(previous);

            if (target != null)
            {
                var index = this.model.getChildCount(target);
                this.cellsAdded(cells, target, index, null, null, true);
            }

            // Dispatches a move event
            this.fireEvent(new mxEventObject(mxEvent.MOVE_CELLS, 'cells', cells,
                'dx', dx, 'dy', dy, 'clone', clone, 'target', target, 'event', evt));
        }
        finally
        {
            this.model.endUpdate();
        }
    }

    return cells;
};


mxGraph.prototype.createEdge = function(parent, id, value, source, target, style, state)
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
        // if(numberOfOutEdges >= source.getAttribute('numberOfOutputs',1))
        //     return null;
        var indexLabel =findCurrLabel(source, state);
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

    }else if(source!=null && getshape(source.getStyle())=="startnode" ){
        var numberOfOutEdges = getNumOfOutEdges(source);
        if(numberOfOutEdges >= 1)
            return null;
    }
    return edge;
};



//repaint edges or shapes in black after they were painted in red

mxGraphModel.prototype.terminalForCellChanged = function(edge, terminal, isSource)
{
    var previous = this.getTerminal(edge, isSource);

    if (terminal != null)
    {
        terminal.insertEdge(edge, isSource);

        //	repaint eadge or shape in black
        if(terminal.repaint)
        {
            var new_style = mxUtils.setStyle(terminal.getStyle(), 'strokeColor', '#000000');
            //after fixing the cell it will repaint in black
            terminal.repaint = null;
            this.setStyle(terminal, new_style);
        }
        if(edge.repaint)
        {
            var new_style = mxUtils.setStyle(edge.getStyle(), 'strokeColor', '#000000');
            //after fixing the cell it will repaint in black
            edge.repaint = null;
            this.setStyle(edge, new_style);
        }

    }
    else if (previous != null)
    {
        previous.removeEdge(edge, isSource);
    }

    return previous;
};
