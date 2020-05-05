
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


mxGraphView.prototype.removeState = function(cell)
{
    var state = null;

    if (cell != null)
    {
        state = this.states.remove(cell);

        if (state != null)
        {
            this.graph.cellRenderer.destroy(state);
            state.invalid = true;
            state.destroy();
        }

        this.graph.connectionHandler.constraintHandler.destroyIconsByState(state);
    }

    return state;
};


mxGraphView.prototype.createState = function(cell)
{

    var state = new mxCellState(this, cell, this.graph.getCellStyle(cell));
    //initial special general node atributes
    if(getshape(cell.getStyle()) == "general"){
        cell.connection_points_labels = cell.connection_points_labels != null? cell.connection_points_labels : [] ;

    }
    return state;
};


function mxVertexHandlerBP(state){
    mxVertexHandler.call(this, state);
};

mxVertexHandlerBP.prototype = Object.create(mxVertexHandler.prototype);

//when resizing shape move her connection point
mxVertexHandlerBP.prototype.updateLivePreview = function(me) {
    // TODO: Apply child offset to children in live preview
    var scale = this.graph.view.scale;
    var tr = this.graph.view.translate;

    // Saves current state
    var tempState = this.state.clone();

    // Temporarily changes size and origin
    this.state.x = this.bounds.x;
    this.state.y = this.bounds.y;
    this.state.origin = new mxPoint(this.state.x / scale - tr.x, this.state.y / scale - tr.y);
    this.state.width = this.bounds.width;
    this.state.height = this.bounds.height;

    // Redraws cell and handles
    var off = this.state.absoluteOffset;
    off = new mxPoint(off.x, off.y);

    // Required to store and reset absolute offset for updating label position
    this.state.absoluteOffset.x = 0;
    this.state.absoluteOffset.y = 0;
    var geo = this.graph.getCellGeometry(this.state.cell);

    if (geo != null) {
        var offset = geo.offset || this.EMPTY_POINT;

        if (offset != null && !geo.relative) {
            this.state.absoluteOffset.x = this.state.view.scale * offset.x;
            this.state.absoluteOffset.y = this.state.view.scale * offset.y;
        }

        this.state.view.updateVertexLabelOffset(this.state);
    }

    // Draws the live preview
    this.state.view.graph.cellRenderer.redraw(this.state, true);


    // Redraws connected edges TODO: Include child edges
    this.state.view.invalidate(this.state.cell);
    this.state.invalid = false;
    this.state.view.validate();
    this.redrawHandles();

    // Hides folding icon
    if (this.state.control != null && this.state.control.node != null) {
        this.state.control.node.style.visibility = 'hidden';
    }

    //the only change
    // this.graph.connectionHandler.constraintHandler.showConstraint(this.state);
    // Restores current state
    this.state.setState(tempState);

    // adjustEdges(this.state.cell, null, this.graph.getModel());


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

//this is for change constraintHandler to mxConstraintHandlerBP
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
mxConnectionHandlerBP.prototype.connect = function(source, target, evt, dropTarget) {

    if (target != null || this.isCreateTarget(evt) || this.graph.allowDanglingEdges) {
        // Uses the common parent of source and target or
        // the default parent to insert the edge
        var model = this.graph.getModel();
        var terminalInserted = false;
        var edge = null;

        model.beginUpdate();
        try {
            if (source != null && target == null && !this.graph.isIgnoreTerminalEvent(evt) && this.isCreateTarget(evt)) {
                target = this.createTargetVertex(evt, source);

                if (target != null) {
                    dropTarget = this.graph.getDropTarget([target], evt, dropTarget);
                    terminalInserted = true;

                    // Disables edges as drop targets if the target cell was created
                    // FIXME: Should not shift if vertex was aligned (same in Java)
                    if (dropTarget == null || !this.graph.getModel().isEdge(dropTarget)) {
                        var pstate = this.graph.getView().getState(dropTarget);

                        if (pstate != null) {
                            var tmp = model.getGeometry(target);
                            tmp.x -= pstate.origin.x;
                            tmp.y -= pstate.origin.y;
                        }
                    }
                    else {
                        dropTarget = this.graph.getDefaultParent();
                    }

                    this.graph.addCell(target, dropTarget);
                }
            }

            var parent = this.graph.getDefaultParent();

            if (source != null && target != null &&
                model.getParent(source) == model.getParent(target) &&
                model.getParent(model.getParent(source)) != model.getRoot()) {
                parent = model.getParent(source);

                if ((source.geometry != null && source.geometry.relative) &&
                    (target.geometry != null && target.geometry.relative)) {
                    parent = model.getParent(parent);
                }
            }

            // Uses the value of the preview edge state for inserting
            // the new edge into the graph
            var value = null;
            var style = null;
            var state = null;

            if (this.edgeState != null) {
                value = this.edgeState.cell.value;
                style = this.edgeState.cell.style;
                state = this.edgeState.style;
            }

            edge = this.insertEdge(parent, null, value, source, target, style, state);

            if (edge != null) {
                // Updates the connection constraints
                this.graph.setConnectionConstraint(edge, source, true, this.sourceConstraint);
                this.graph.setConnectionConstraint(edge, target, false, this.constraintHandler.currentConstraint);
                this.checkAndFixBorder(edge);
                // Uses geometry of the preview edge state
                if (this.edgeState != null) {
                    model.setGeometry(edge, this.edgeState.cell.geometry);
                }

                var parent = model.getParent(source);

                // Inserts edge before source
                if (this.isInsertBefore(edge, source, target, evt, dropTarget)) {
                    var index = null;
                    var tmp = source;

                    while (tmp.parent != null && tmp.geometry != null &&
                    tmp.geometry.relative && tmp.parent != edge.parent) {
                        tmp = this.graph.model.getParent(tmp);
                    }

                    if (tmp != null && tmp.parent != null && tmp.parent == edge.parent) {
                        model.add(parent, edge, tmp.parent.getIndex(tmp));
                    }
                }

                // Makes sure the edge has a non-null, relative geometry
                var geo = model.getGeometry(edge);

                if (geo == null) {
                    geo = new mxGeometry();
                    geo.relative = true;

                    model.setGeometry(edge, geo);
                }

                // Uses scaled waypoints in geometry
                if (this.waypoints != null && this.waypoints.length > 0) {
                    var s = this.graph.view.scale;
                    var tr = this.graph.view.translate;
                    geo.points = [];

                    for (var i = 0; i < this.waypoints.length; i++) {
                        var pt = this.waypoints[i];
                        geo.points.push(new mxPoint(pt.x / s - tr.x, pt.y / s - tr.y));
                    }
                }

                if (target == null) {
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
        catch (e) {
            mxLog.show();
            mxLog.debug(e.message);
        }
        finally {
            model.endUpdate();
        }

        if (this.select) {
            this.selectCells(edge, (terminalInserted) ? target : null);
        }
    }
};


mxConnectionHandlerBP.prototype.destroyIcons = function()
{
    return;
};



function mxConstraintHandlerBP(graph){
    mxConstraintHandler.call(this, graph);
    this.focusIcons = {};

};


mxConstraintHandlerBP.prototype = Object.create(mxConstraintHandler.prototype);


mxConstraintHandlerBP.prototype.OutputPointImage = new mxImage(mxClient.imageBasePath + '/purple-point.png', 10, 10);


mxConstraintHandlerBP.prototype.InputPointImage = new mxImage(mxClient.imageBasePath + '/input-point.png', 10, 10);


mxConstraintHandlerBP.prototype.highlightColor = '#808080';


mxConstraintHandlerBP.prototype.getImageForConstraint = function(state, constraint, point)
{
    if(constraint == null || constraint.name == "O")
        return this.OutputPointImage;
    else
        return this.InputPointImage;
};


/**
 * Function: reset
 *
 * Resets the state of this handler.
 */
mxConstraintHandlerBP.prototype.reset = function()
{
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
    return;
};


mxConstraintHandlerBP.prototype.destroyIconsByState = function(state)
{
    var id = state.cell.id;

    if (this.focusIcons[id] != null)
    {
        for (var i = 0; i < this.focusIcons[id].length; i++)
        {
            this.focusIcons[id][i].destroy();
        }

        delete this.focusIcons[id];
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
                // this.reset();
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


        if (Object.values(this.focusIcons).length != 0 && this.constraints != null &&
            (state == null || this.currentFocus == state))
        {
            var cx = mouse.getCenterX();
            var cy = mouse.getCenterY();

            var allIcons = state == null ? Object.values(this.focusIcons).flat() : this.focusIcons[state.cell.id] ;

            for (var i = 0; i < allIcons.length; i++)
            {
                var dx = cx - allIcons[i].bounds.getCenterX();
                var dy = cy - allIcons[i].bounds.getCenterY();
                var tmp = dx * dx + dy * dy;

                if ((this.intersects(allIcons[i], mouse, source, existingEdge) || (point != null &&
                    this.intersects(allIcons[i], grid, source, existingEdge))) &&
                    (minDistSq == null || tmp < minDistSq))
                {
                    this.currentConstraint = this.constraints[i];
                    this.currentPoint = this.focusPoints != null?  this.focusPoints[i]: null;
                    minDistSq = tmp;

                    var tmp = allIcons[i].bounds.clone();
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
    if (this.currentFocus != null && this.constraints != null && this.focusIcons != null)
    {
        var state = this.graph.view.getState(this.currentFocus.cell);
        this.currentFocus = state;
        this.currentFocusArea = new mxRectangle(state.x, state.y, state.width, state.height);

        var allIcons = state == null || this.focusIcons[state.cell.id] == null ? Object.values(this.focusIcons).flat() : this.focusIcons[state.cell.id] ;

        for (var i = 0; i < this.allIcons.length; i++)
        {
            var cp = this.graph.getConnectionPoint(state, this.constraints[i]);
            var img = this.getImageForConstraint(state, this.constraints[i], cp);

            var bounds = new mxRectangle(Math.round(cp.x - img.width / 2),
                Math.round(cp.y - img.height / 2), img.width, img.height);
            allIcons[i].bounds = bounds;
            allIcons[i].redraw();
            this.currentFocusArea.add(allIcons[i].bounds);
            this.focusPoints[i] = cp;
        }
    }
};


mxConstraintHandlerBP.prototype.setFocus = function(me, state, source)
{
    var size = this.graph.view.scale;
    this.constraints = (state != null && !this.isStateIgnored(state, source) &&
        this.graph.isCellConnectable(state.cell)) ? ((this.isEnabled()) ?
        (this.graph.getAllConnectionConstraints(state, source) || []) : []) : null;

    // Only uses cells which have constraints
    if (this.constraints != null)
    {
        this.currentFocus = state;
        this.currentFocusArea = new mxRectangle(state.x, state.y, state.width, state.height);

        if (this.focusIcons[state.cell.id] != null)
        {
            for (var i = 0; i < this.focusIcons[state.cell.id].length; i++)
            {
                this.focusIcons[state.cell.id][i].destroy();
            }

            this.focusIcons[state.cell.id] = null;
            this.focusPoints = null;
        }

        this.focusPoints = [];
        this.focusIcons[state.cell.id] = [];

        for (var i = 0; i < this.constraints.length; i++)
        {
            var cp = this.graph.getConnectionPoint(state, this.constraints[i]);
            var img = this.getImageForConstraint(state, this.constraints[i], cp);

            var src = img.src;
            var bounds = new mxRectangle(Math.round(cp.x - (img.width * size) / 2),
                Math.round(cp.y - (img.height * size) / 2), img.width * size, img.height * size);
            var icon = new mxImageShape(bounds, src);
            icon.dialect = (this.graph.dialect != mxConstants.DIALECT_SVG) ?
                mxConstants.DIALECT_MIXEDHTML : mxConstants.DIALECT_SVG;
            icon.preserveImageAspect = false;
            icon.init(this.graph.getView().getDecoratorPane());

            //add connection attributes
            if(this.constraints[i].name == "O") {

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
                this.focusIcons[state.cell.id].push(icon);
                this.focusPoints.push(cp);
            }
            else {
                icon.redraw();
                this.focusIcons[state.cell.id].push(icon);
                this.focusPoints.push(cp);
            }
        }

        this.currentFocusArea.grow(this.getTolerance(me));
    }
};



//state is optional
mxConstraintHandlerBP.prototype.showConstraint = function(inputState)
{
    var size = this.graph.view.scale;
    // when state is null, get all states in graph
    var states = this.graph.view.getStates().getValues();
    states = inputState == null ? states : [inputState];

    for(var j = 0; j < states.length; j++) {
        var state = states[j];

        this.constraints = (state != null) ? this.graph.getAllConnectionConstraints(state, true) : null;

        // Only uses cells which have constraints
        if (this.constraints != null) {

            if (this.focusIcons[state.cell.id] != null) {
                for (var i = 0; i < this.focusIcons[state.cell.id].length; i++) {
                    this.focusIcons[state.cell.id][i].destroy();
                }

                // this.focusIcons.set( state.cell, null);
                // this.focusPoints = null;
            }

            // this.focusPoints = [];
            this.focusIcons[state.cell.id] = [];

            for (var i = 0; i < this.constraints.length; i++) {

                var cp = this.graph.getConnectionPoint(state, this.constraints[i]);
                var img = this.getImageForConstraint(state, this.constraints[i], cp);
                var src = img.src;
                var bounds = new mxRectangle(Math.round(cp.x - (img.width * size) / 2),
                    Math.round(cp.y - (img.height * size) / 2), img.width * size, img.height * size);
                var icon = new mxImageShape(bounds, src);
                icon.dialect = (this.graph.dialect != mxConstants.DIALECT_SVG) ?
                    mxConstants.DIALECT_MIXEDHTML : mxConstants.DIALECT_SVG;
                icon.preserveImageAspect = false;
                icon.init(this.graph.getView().getDecoratorPane());


                // Move the icon behind all other overlays
                if (icon.node.previousSibling != null) {
                    icon.node.parentNode.insertBefore(icon.node, icon.node.parentNode.firstChild);
                }

                var getState = mxUtils.bind(this, function () {
                    return (this.currentFocus != null) ? this.currentFocus : state;
                });

                icon.redraw();

                this.focusIcons[state.cell.id].push(icon);
            }
        }
    }

};


//duplicate this object for constraints and edges
function mxGraphHandlerBP(graph){
    mxGraphHandler.call(this, graph);

};


mxGraphHandlerBP.prototype = Object.create(mxGraphHandler.prototype);

//This is for preventing moving only an edge without its source and target
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


//when changing shape location relocate her connection point
mxGraphHandlerBP.prototype.updateLivePreview = function(dx, dy)
{
    if (!this.suspended)
    {
        var states = [];

        if (this.allCells != null)
        {
            this.allCells.visit(mxUtils.bind(this, function(key, state)
            {
                // Saves current state
                var tempState = state.clone();
                states.push([state, tempState]);

                // Makes transparent for events to detect drop targets
                if (state.shape != null)
                {
                    if (state.shape.originalPointerEvents == null)
                    {
                        state.shape.originalPointerEvents = state.shape.pointerEvents;
                    }

                    state.shape.pointerEvents = false;

                    if (state.text != null)
                    {
                        if (state.text.originalPointerEvents == null)
                        {
                            state.text.originalPointerEvents = state.text.pointerEvents;
                        }

                        state.text.pointerEvents = false;
                    }
                }

                // Temporarily changes position
                if (this.graph.model.isVertex(state.cell))
                {
                    state.x += dx;
                    state.y += dy;

                    // Draws the live preview
                    if (!this.cloning)
                    {
                        state.view.graph.cellRenderer.redraw(state, true);

                        // Forces redraw of connected edges after all states
                        // have been updated but avoids update of state
                        state.view.invalidate(state.cell);
                        state.invalid = false;

                        // Hides folding icon
                        if (state.control != null && state.control.node != null)
                        {
                            state.control.node.style.visibility = 'hidden';
                        }
                    }
                }
            }));
        }

        // Redraws connected edges
        var s = this.graph.view.scale;

        for (var i = 0; i < states.length; i++)
        {
            var state = states[i][0];

            if (this.graph.model.isEdge(state.cell))
            {
                var geometry = this.graph.getCellGeometry(state.cell);
                var points = [];

                if (geometry != null && geometry.points != null)
                {
                    for (var j = 0; j < geometry.points.length; j++)
                    {
                        if (geometry.points[j] != null)
                        {
                            points.push(new mxPoint(
                                geometry.points[j].x + dx / s,
                                geometry.points[j].y + dy / s));
                        }
                    }
                }

                var source = state.visibleSourceState;
                var target = state.visibleTargetState;
                var pts = states[i][1].absolutePoints;

                if (source == null || !this.isCellMoving(source.cell))
                {
                    var pt0 = pts[0];
                    state.setAbsoluteTerminalPoint(new mxPoint(pt0.x + dx, pt0.y + dy), true);
                    source = null;
                }
                else
                {
                    state.view.updateFixedTerminalPoint(state, source, true,
                        this.graph.getConnectionConstraint(state, source, true));
                }

                if (target == null || !this.isCellMoving(target.cell))
                {
                    var ptn = pts[pts.length - 1];
                    state.setAbsoluteTerminalPoint(new mxPoint(ptn.x + dx, ptn.y + dy), false);
                    target = null;
                }
                else
                {
                    state.view.updateFixedTerminalPoint(state, target, false,
                        this.graph.getConnectionConstraint(state, target, false));
                }

                state.view.updatePoints(state, points, source, target);
                state.view.updateFloatingTerminalPoints(state, source, target);
                state.view.updateEdgeLabelOffset(state);
                state.invalid = false;

                // Draws the live preview but avoids update of state
                if (!this.cloning)
                {
                    state.view.graph.cellRenderer.redraw(state, true);
                }
            }
        }

        this.graph.view.validate();
        this.redrawHandles(states);
        //the only change
        // this.graph.connectionHandler.constraintHandler.showConstraint(states[1]);
        this.resetPreviewStates(states);
    }
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
            delete terminal.repaint ;
            this.setStyle(terminal, new_style);
        }
        if(edge.repaint)
        {
            var new_style = mxUtils.setStyle(edge.getStyle(), 'strokeColor', '#000000');
            //after fixing the cell it will repaint in black
            delete edge.repaint;
            this.setStyle(edge, new_style);
        }

    }
    else if (previous != null)
    {
        previous.removeEdge(edge, isSource);
    }

    return previous;
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


mxGraph.prototype.resizeCell = function(cell, bounds, recurse)
{
    var output =  this.resizeCells([cell], [bounds], recurse)[0];
    fixConnectionPointsLabelLocation(this, cell);
    return output;
};


mxGraphView.prototype.validate = function(cell)
{
    var t0 = mxLog.enter('mxGraphView.validate');
    window.status = mxResources.get(this.updatingDocumentResource) ||
        this.updatingDocumentResource;

    this.resetValidationState();

    // Improves IE rendering speed by minimizing reflows
    var prevDisplay = null;

    if (this.optimizeVmlReflows && this.canvas != null && this.textDiv == null &&
        ((document.documentMode == 8 && !mxClient.IS_EM) || mxClient.IS_QUIRKS))
    {
        // Placeholder keeps scrollbar positions when canvas is hidden
        this.placeholder = document.createElement('div');
        this.placeholder.style.position = 'absolute';
        this.placeholder.style.width = this.canvas.clientWidth + 'px';
        this.placeholder.style.height = this.canvas.clientHeight + 'px';
        this.canvas.parentNode.appendChild(this.placeholder);

        prevDisplay = this.drawPane.style.display;
        this.canvas.style.display = 'none';

        // Creates temporary DIV used for text measuring in mxText.updateBoundingBox
        this.textDiv = document.createElement('div');
        this.textDiv.style.position = 'absolute';
        this.textDiv.style.whiteSpace = 'nowrap';
        this.textDiv.style.visibility = 'hidden';
        this.textDiv.style.display = (mxClient.IS_QUIRKS) ? 'inline' : 'inline-block';
        this.textDiv.style.zoom = '1';

        document.body.appendChild(this.textDiv);
    }

    var graphBounds = this.getBoundingBox(this.validateCellState(
        this.validateCell(cell || ((this.currentRoot != null) ?
            this.currentRoot : this.graph.getModel().getRoot()))));
    this.setGraphBounds((graphBounds != null) ? graphBounds : this.getEmptyBounds());
    this.validateBackground();

    if (prevDisplay != null)
    {
        this.canvas.style.display = prevDisplay;
        this.textDiv.parentNode.removeChild(this.textDiv);

        if (this.placeholder != null)
        {
            this.placeholder.parentNode.removeChild(this.placeholder);
        }

        // Textdiv cannot be reused
        this.textDiv = null;
    }

    this.resetValidationState();

    window.status = mxResources.get(this.doneResource) ||
        this.doneResource;
    mxLog.leave('mxGraphView.validate', t0);


    this.graph.connectionHandler.constraintHandler.showConstraint();
};
