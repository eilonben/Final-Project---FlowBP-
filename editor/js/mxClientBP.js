

// DELETE - do nothing
function mxVertexHandlerBP(state){
    mxVertexHandler.call(this, state);
};

mxVertexHandlerBP.prototype = Object.create(mxVertexHandler.prototype);


// DELETE (old objective: when resizing shape move her connection point)
mxVertexHandlerBP.prototype.updateLivePreview = function(me)
{
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

    // Restores current state
    this.state.setState(tempState);
};


/*
objectives:
1. set edges labels
2. connect are only from left side
3. connections can be made only between 2 bp cells
 */
function mxConnectionHandlerBP(graph, factoryMethod){
    mxConnectionHandler.call(this,graph, factoryMethod);
};

mxConnectionHandlerBP.defultOutputX = 1;

mxConnectionHandlerBP.defultOutputY = 0.5;

mxConnectionHandlerBP.defultInputX = -0.3;

mxConnectionHandlerBP.defultInputY = 0.5;

mxConnectionHandlerBP.prototype = Object.create(mxConnectionHandler.prototype);

// when adding new edge - set the edge label if needed
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

// change definition of constraintHandler to mxConstraintHandlerBP
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

// after connecting edge into vertex redefine the target connection point to the left side
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

// Not resolved yet - might help when you placing the mouse on the child to mark his parent
mxConnectionHandler.prototype.mouseMove = function(sender, me)
{
    if (!me.isConsumed() && (this.ignoreMouseDown || this.first != null || !this.graph.isMouseDown))
    {
        // Handles special case when handler is disabled during highlight
        if (!this.isEnabled() && this.currentState != null)
        {
            this.destroyIcons();
            this.currentState = null;
        }

        var view = this.graph.getView();
        var scale = view.scale;
        var tr = view.translate;
        var point = new mxPoint(me.getGraphX(), me.getGraphY());
        this.error = null;

        if (this.graph.isGridEnabledEvent(me.getEvent()))
        {
            point = new mxPoint((this.graph.snap(point.x / scale - tr.x) + tr.x) * scale,
                (this.graph.snap(point.y / scale - tr.y) + tr.y) * scale);
        }

        this.snapToPreview(me, point);
        this.currentPoint = point;

        if ((this.first != null || (this.isEnabled() && this.graph.isEnabled())) &&
            (this.shape != null || this.first == null ||
                Math.abs(me.getGraphX() - this.first.x) > this.graph.tolerance ||
                Math.abs(me.getGraphY() - this.first.y) > this.graph.tolerance))
        {
            this.updateCurrentState(me, point);
        }

        if (this.first != null)
        {
            var constraint = null;
            var current = point;

            // Uses the current point from the constraint handler if available
            if (this.constraintHandler.currentConstraint != null &&
                this.constraintHandler.currentFocus != null &&
                this.constraintHandler.currentPoint != null)
            {
                constraint = this.constraintHandler.currentConstraint;
                current = this.constraintHandler.currentPoint.clone();
            }
            else if (this.previous != null && !this.graph.isIgnoreTerminalEvent(me.getEvent()) &&
                mxEvent.isShiftDown(me.getEvent()))
            {
                if (Math.abs(this.previous.getCenterX() - point.x) <
                    Math.abs(this.previous.getCenterY() - point.y))
                {
                    point.x = this.previous.getCenterX();
                }
                else
                {
                    point.y = this.previous.getCenterY();
                }
            }

            var pt2 = this.first;

            // Moves the connect icon with the mouse
            if (this.selectedIcon != null)
            {
                var w = this.selectedIcon.bounds.width;
                var h = this.selectedIcon.bounds.height;

                if (this.currentState != null && this.targetConnectImage)
                {
                    var pos = this.getIconPosition(this.selectedIcon, this.currentState);
                    this.selectedIcon.bounds.x = pos.x;
                    this.selectedIcon.bounds.y = pos.y;
                }
                else
                {
                    var bounds = new mxRectangle(me.getGraphX() + this.connectIconOffset.x,
                        me.getGraphY() + this.connectIconOffset.y, w, h);
                    this.selectedIcon.bounds = bounds;
                }

                this.selectedIcon.redraw();
            }

            // Uses edge state to compute the terminal points
            if (this.edgeState != null)
            {
                this.updateEdgeState(current, constraint);
                current = this.edgeState.absolutePoints[this.edgeState.absolutePoints.length - 1];
                pt2 = this.edgeState.absolutePoints[0];
            }
            else
            {
                if (this.currentState != null)
                {
                    if (this.constraintHandler.currentConstraint == null)
                    {
                        var tmp = this.getTargetPerimeterPoint(this.currentState, me);

                        if (tmp != null)
                        {
                            current = tmp;
                        }
                    }
                }

                // Computes the source perimeter point
                if (this.sourceConstraint == null && this.previous != null)
                {
                    var next = (this.waypoints != null && this.waypoints.length > 0) ?
                        this.waypoints[0] : current;
                    var tmp = this.getSourcePerimeterPoint(this.previous, next, me);

                    if (tmp != null)
                    {
                        pt2 = tmp;
                    }
                }
            }

            // Makes sure the cell under the mousepointer can be detected
            // by moving the preview shape away from the mouse. This
            // makes sure the preview shape does not prevent the detection
            // of the cell under the mousepointer even for slow gestures.
            if (this.currentState == null && this.movePreviewAway)
            {
                var tmp = pt2;

                if (this.edgeState != null && this.edgeState.absolutePoints.length >= 2)
                {
                    var tmp2 = this.edgeState.absolutePoints[this.edgeState.absolutePoints.length - 2];

                    if (tmp2 != null)
                    {
                        tmp = tmp2;
                    }
                }

                var dx = current.x - tmp.x;
                var dy = current.y - tmp.y;

                var len = Math.sqrt(dx * dx + dy * dy);

                if (len == 0)
                {
                    return;
                }

                // Stores old point to reuse when creating edge
                this.originalPoint = current.clone();
                current.x -= dx * 4 / len;
                current.y -= dy * 4 / len;
            }
            else
            {
                this.originalPoint = null;
            }

            // Creates the preview shape (lazy)
            if (this.shape == null)
            {
                var dx = Math.abs(me.getGraphX() - this.first.x);
                var dy = Math.abs(me.getGraphY() - this.first.y);

                if (dx > this.graph.tolerance || dy > this.graph.tolerance)
                {
                    this.shape = this.createShape();

                    if (this.edgeState != null)
                    {
                        this.shape.apply(this.edgeState);
                    }

                    // Revalidates current connection
                    this.updateCurrentState(me, point);
                }
            }

            // Updates the points in the preview edge
            if (this.shape != null)
            {
                if (this.edgeState != null)
                {
                    this.shape.points = this.edgeState.absolutePoints;
                }
                else
                {
                    var pts = [pt2];

                    if (this.waypoints != null)
                    {
                        pts = pts.concat(this.waypoints);
                    }

                    pts.push(current);
                    this.shape.points = pts;
                }

                this.drawPreview();
            }

            // Makes sure endpoint of edge is visible during connect
            if (this.cursor != null)
            {
                this.graph.container.style.cursor = this.cursor;
            }

            mxEvent.consume(me.getEvent());
            me.consume();
        }
        else if (!this.isEnabled() || !this.graph.isEnabled())
        {
            this.constraintHandler.reset();
        }
        else if (this.previous != this.currentState && this.edgeState == null)
        {
            this.destroyIcons();

            // Sets the cursor on the current shape
            if (this.currentState != null && this.error == null && this.constraintHandler.currentConstraint == null)
            {
                this.icons = this.createIcons(this.currentState);

                if (this.icons == null)
                {
                    this.currentState.setCursor(mxConstants.CURSOR_CONNECT);
                    me.consume();
                }
            }

            this.previous = this.currentState;
        }
        else if (this.previous == this.currentState && this.currentState != null && this.icons == null &&
            !this.graph.isMouseDown)
        {
            // Makes sure that no cursors are changed
            me.consume();
        }

        if (!this.graph.isMouseDown && this.currentState != null && this.icons != null)
        {
            var hitsIcon = false;
            var target = me.getSource();

            for (var i = 0; i < this.icons.length && !hitsIcon; i++)
            {
                hitsIcon = target == this.icons[i].node || target.parentNode == this.icons[i].node;
            }

            if (!hitsIcon)
            {
                this.updateIcons(this.currentState, this.icons, me);
            }
        }
    }
    else
    {
        this.constraintHandler.reset();
    }
};

//
mxConnectionHandlerBP.prototype.isInnerChild = function(cell){
    return (cell != null && cell.bp_type != null && cell.bp_type == 'data');
};


// when connecting into child of bp -> connect to his parent
mxConnectionHandlerBP.prototype.connect = function(source, target, evt, dropTarget) {

    if (target != null || this.isCreateTarget(evt) || this.graph.allowDanglingEdges) {
        // Uses the common parent of source and target or
        // the default parent to insert the edge
        var model = this.graph.getModel();
        var terminalInserted = false;
        var edge = null;

        //If this is a bp child connect to his parent
        if (this.isInnerChild(target))
            target = target.parent;

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

// do not destroy connection icons
mxConnectionHandlerBP.prototype.destroyIcons = function()
{
    return;
};

/*
objectives:
1. set connection point always visible
 */
function mxConstraintHandlerBP(graph){
    mxConstraintHandler.call(this, graph);
    this.focusIcons = {};

};


mxConstraintHandlerBP.prototype = Object.create(mxConstraintHandler.prototype);


mxConstraintHandlerBP.prototype.OutputPointImage = new mxImage(mxClient.imageBasePath + '/output-onlinepngtools (1).png', 10, 10);


mxConstraintHandlerBP.prototype.InputPointImage = new mxImage(mxClient.imageBasePath + '/input2.png', 10, 10);


mxConstraintHandlerBP.prototype.highlightColor = '#808080';

// get diffrent images per diffrent types of constraints
mxConstraintHandlerBP.prototype.getImageForConstraint = function(state, constraint, point)
{
    if(constraint != null && constraint.name == "I")
        return this.InputPointImage;
    else
        return this.OutputPointImage;
};

// do not delete connection points icons
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

//  redraw all connection icons of all shapes after destroy focus shape
mxConstraintHandlerBP.prototype.destroyIcons = function()
{
    this.showConstraint();
    return;
};

// destroy shape icon (use when delete a shape)
mxConstraintHandlerBP.prototype.destroyIconsByState = function(state)
{
    if(state == null || state.cell == null)
        return;
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

// focus on shape when hover a shape connection points
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
        /*this.graph.getCellAt(x,y) - the change*/
        var state = this.graph.view.getState(this.graph.getCellAt(x,y));

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
            allIcons = allIcons != null ? allIcons : [];

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

// unused yet - may help setting focus on shape when mouse on the his child or connection points
mxConstraintHandlerBP.prototype.getCellForEvent = function(me, point)
{
    var cell = me.getCell();

    // Gets cell under actual point if different from event location
    if (cell == null && point != null && (me.getGraphX() != point.x || me.getGraphY() != point.y))
    {
        cell = this.graph.getCellAt(point.x, point.y);
    }

    // Uses connectable parent vertex if one exists
    if (cell != null && !this.graph.isCellConnectable(cell))
    {
        var parent = this.graph.getModel().getParent(cell);

        if (this.graph.getModel().isVertex(parent) && this.graph.isCellConnectable(parent))
        {
            cell = parent;
        }
    }


    cell = (this.graph.isCellLocked(cell)) ? null : cell;
    if(cell != null)
        return cell;
    return null;
};

// Adjust the function for changes in class
mxConstraintHandlerBP.prototype.redraw = function()
{
    var size = this.graph.view.scale;
    if (this.currentFocus != null && this.constraints != null && this.focusIcons != null)
    {
        var state = this.graph.view.getState(this.currentFocus.cell);
        this.currentFocus = state;
        this.currentFocusArea = new mxRectangle(state.x, state.y, state.width, state.height);

        var allIcons = state == null || this.focusIcons[state.cell.id] == null ? Object.values(this.focusIcons).flat() : this.focusIcons[state.cell.id] ;

        for (var i = 0; i < allIcons.length; i++)
        {
            var cp = this.graph.getConnectionPoint(state, this.constraints[i]);
            var img = this.getImageForConstraint(state, this.constraints[i], cp);

            var bounds = new mxRectangle(Math.round(cp.x - img.width * size),
                Math.round(cp.y - img.height * size / 2), img.width, img.height);
            allIcons[i].bounds = bounds;
            allIcons[i].redraw();
            this.currentFocusArea.add(allIcons[i].bounds);
            this.focusPoints[i] = cp;
        }
    }
};

// define the connection points location on the cell by the type of connection
mxConstraintHandlerBP.prototype.getConstraintLocation = function (state, constraints, size){
    var cp = this.graph.getConnectionPoint(state, constraints);
    var img = this.getImageForConstraint(state, constraints, cp);
    var cell = state.cell;
    var point  = new mxPoint();

    if( (cell.bp_type != null && cell.bp_type == 'startnode') || (constraints != null && constraints.name == 'I'))
        point.x = Math.round(cp.x - (img.width * size));
    else
        point.x = cp.x;
    point.y =  Math.round(cp.y - (img.height * size) / 2);
    return point;
};

// hide input connection points
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
            // when hover a shape hide input icon (if shape is the source).
            if(this.constraints[i].name == "I" && source)
                continue;
            var cp = this.graph.getConnectionPoint(state, this.constraints[i]);
            var img = this.getImageForConstraint(state, this.constraints[i], cp);

            var src = img.src;
            var imgPoint = this.getConstraintLocation(state, this.constraints[i], size);

            var bounds = new mxRectangle(imgPoint.x , imgPoint.y, img.width * size, img.height * size);

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
    else {
        this.destroyIcons();
        this.destroyFocusHighlight();
    }
};



//state is optional - draw all connection points for all shapes
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

                var imgPoint = this.getConstraintLocation(state, this.constraints[i], size);
                var bounds = new mxRectangle(imgPoint.x , imgPoint.y, img.width * size, img.height * size);


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


/*
Objectives
1. Prevent removal of data cell from bp cell
 */
function mxGraphHandlerBP(graph){
    mxGraphHandler.call(this, graph);

};

// do not remove any child from his parent
mxGraphHandler.prototype.isRemoveCellsFromParent = function(value)
{
    return false;
};


mxGraphHandlerBP.prototype = Object.create(mxGraphHandler.prototype);


mxGraphHandlerBP.prototype.getMovableCells= function(cells){
    //cells without lock or
    var unlockedCells = cells.filter(cell => !(cell.lock != null && cell.lock));
    var lockedCells = cells.filter(cell => cell.lock != null && cell.lock);
    //the locked cells that their parents also include
    var validCells = lockedCells.filter(cell => cell.parent != null && cells.includes(cell.parent))
    var tmp =  unlockedCells.concat(validCells);
    return tmp;
}

// This is for preventing moving only an edge without its source and target
// and preventing move locked cells
mxGraphHandlerBP.prototype.moveCells = function(cells, dx, dy, clone, target, evt) {

    cells = this.getMovableCells(cells);
    if (cells.length == 0)
        return ;
    // //this is new
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


// unused
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
        this.resetPreviewStates(states);
    }
};


/*
Objectives
1. repaint edges or shapes in black after they were painted in red
2. Prevent connect start node as a target
 */
function mxGraphModelBP(root){
    mxGraphModel.call(this, root);

};


mxGraphModelBP.prototype = Object.create(mxGraphModel.prototype);



//repaint edges or shapes in black after they were painted in red
// Prevent connect start node as a target
mxGraphModelBP.prototype.terminalForCellChanged = function(edge, terminal, isSource)
{

    var previous = this.getTerminal(edge, isSource);

    if (terminal != null)
    {
        //denny connect start node
        if (getshape(terminal.getStyle())=="startnode" && !isSource)
            return previous;

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


// change initial codec to mxGraphModelBP
mxCodecRegistry.register(function()
{
    /**
     * Class: mxModelCodec
     *
     * Codec for <mxGraphModel>s. This class is created and registered
     * dynamically at load time and used implicitely via <mxCodec>
     * and the <mxCodecRegistry>.
     */
    var codec = new mxObjectCodec(new mxGraphModelBP());

    /**
     * Function: encodeObject
     *
     * Encodes the given <mxGraphModel> by writing a (flat) XML sequence of
     * cell nodes as produced by the <mxCellCodec>. The sequence is
     * wrapped-up in a node with the name root.
     */
    codec.encodeObject = function(enc, obj, node)
    {
        var rootNode = enc.document.createElement('root');
        enc.encodeCell(obj.getRoot(), rootNode);
        node.appendChild(rootNode);
    };

    /**
     * Function: decodeChild
     *
     * Overrides decode child to handle special child nodes.
     */
    codec.decodeChild = function(dec, child, obj)
    {
        if (child.nodeName == 'root')
        {
            this.decodeRoot(dec, child, obj);
        }
        else
        {
            mxObjectCodec.prototype.decodeChild.apply(this, arguments);
        }
    };

    /**
     * Function: decodeRoot
     *
     * Reads the cells into the graph model. All cells
     * are children of the root element in the node.
     */
    codec.decodeRoot = function(dec, root, model)
    {
        var rootCell = null;
        var tmp = root.firstChild;

        while (tmp != null)
        {
            var cell = dec.decodeCell(tmp);

            if (cell != null && cell.getParent() == null)
            {
                rootCell = cell;
            }

            tmp = tmp.nextSibling;
        }

        // Sets the root on the model if one has been decoded
        if (rootCell != null)
        {
            model.setRoot(rootCell);
        }
    };

    // Returns the codec into the registry
    return codec;

}());



/*
Objectives:
1. delete connection points icons
2. draw connection points of all bp shapes (call show constraint)
 */
function mxGraphViewBP(graph){
    mxGraphView.call(this, graph);

};

// delete connection points icons
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
            this.graph.connectionHandler.constraintHandler.destroyIconsByState(state);
        }
    }

    return state;
};

mxGraphViewBP.prototype = Object.create(mxGraphView.prototype);

// drow connection points of all bp shapes (call show constraint)
mxGraphViewBP.prototype.validate = function(cell)
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


    console.log('validate');
    // the only change
    this.graph.connectionHandler.constraintHandler.showConstraint();

};

// initial codec to mxGraphViewBP
mxCodecRegistry.register(function()
{
    /**
     * Class: mxGraphViewCodec
     *
     * Custom encoder for <mxGraphView>s. This class is created
     * and registered dynamically at load time and used implicitely via
     * <mxCodec> and the <mxCodecRegistry>. This codec only writes views
     * into a XML format that can be used to create an image for
     * the graph, that is, it contains absolute coordinates with
     * computed perimeters, edge styles and cell styles.
     */
    var codec = new mxObjectCodec(new mxGraphViewBP());

    /**
     * Function: encode
     *
     * Encodes the given <mxGraphView> using <encodeCell>
     * starting at the model's root. This returns the
     * top-level graph node of the recursive encoding.
     */
    codec.encode = function(enc, view)
    {
        return this.encodeCell(enc, view,
            view.graph.getModel().getRoot());
    };

    /**
     * Function: encodeCell
     *
     * Recursively encodes the specifed cell. Uses layer
     * as the default nodename. If the cell's parent is
     * null, then graph is used for the nodename. If
     * <mxGraphModel.isEdge> returns true for the cell,
     * then edge is used for the nodename, else if
     * <mxGraphModel.isVertex> returns true for the cell,
     * then vertex is used for the nodename.
     *
     * <mxGraph.getLabel> is used to create the label
     * attribute for the cell. For graph nodes and vertices
     * the bounds are encoded into x, y, width and height.
     * For edges the points are encoded into a points
     * attribute as a space-separated list of comma-separated
     * coordinate pairs (eg. x0,y0 x1,y1 ... xn,yn). All
     * values from the cell style are added as attribute
     * values to the node.
     */
    codec.encodeCell = function(enc, view, cell)
    {
        var model = view.graph.getModel();
        var state = view.getState(cell);
        var parent = model.getParent(cell);

        if (parent == null || state != null)
        {
            var childCount = model.getChildCount(cell);
            var geo = view.graph.getCellGeometry(cell);
            var name = null;

            if (parent == model.getRoot())
            {
                name = 'layer';
            }
            else if (parent == null)
            {
                name = 'graph';
            }
            else if (model.isEdge(cell))
            {
                name = 'edge';
            }
            else if (childCount > 0 && geo != null)
            {
                name = 'group';
            }
            else if (model.isVertex(cell))
            {
                name = 'vertex';
            }

            if (name != null)
            {
                var node = enc.document.createElement(name);
                var lab = view.graph.getLabel(cell);

                if (lab != null)
                {
                    node.setAttribute('label', view.graph.getLabel(cell));

                    if (view.graph.isHtmlLabel(cell))
                    {
                        node.setAttribute('html', true);
                    }
                }

                if (parent == null)
                {
                    var bounds = view.getGraphBounds();

                    if (bounds != null)
                    {
                        node.setAttribute('x', Math.round(bounds.x));
                        node.setAttribute('y', Math.round(bounds.y));
                        node.setAttribute('width', Math.round(bounds.width));
                        node.setAttribute('height', Math.round(bounds.height));
                    }

                    node.setAttribute('scale', view.scale);
                }
                else if (state != null && geo != null)
                {
                    // Writes each key, value in the style pair to an attribute
                    for (var i in state.style)
                    {
                        var value = state.style[i];

                        // Tries to turn objects and functions into strings
                        if (typeof(value) == 'function' &&
                            typeof(value) == 'object')
                        {
                            value = mxStyleRegistry.getName(value);
                        }

                        if (value != null &&
                            typeof(value) != 'function' &&
                            typeof(value) != 'object')
                        {
                            node.setAttribute(i, value);
                        }
                    }

                    var abs = state.absolutePoints;

                    // Writes the list of points into one attribute
                    if (abs != null && abs.length > 0)
                    {
                        var pts = Math.round(abs[0].x) + ',' + Math.round(abs[0].y);

                        for (var i=1; i<abs.length; i++)
                        {
                            pts += ' ' + Math.round(abs[i].x) + ',' +
                                Math.round(abs[i].y);
                        }

                        node.setAttribute('points', pts);
                    }

                    // Writes the bounds into 4 attributes
                    else
                    {
                        node.setAttribute('x', Math.round(state.x));
                        node.setAttribute('y', Math.round(state.y));
                        node.setAttribute('width', Math.round(state.width));
                        node.setAttribute('height', Math.round(state.height));
                    }

                    var offset = state.absoluteOffset;

                    // Writes the offset into 2 attributes
                    if (offset != null)
                    {
                        if (offset.x != 0)
                        {
                            node.setAttribute('dx', Math.round(offset.x));
                        }

                        if (offset.y != 0)
                        {
                            node.setAttribute('dy', Math.round(offset.y));
                        }
                    }
                }

                for (var i=0; i<childCount; i++)
                {
                    var childNode = this.encodeCell(enc,
                        view, model.getChildAt(cell, i));

                    if (childNode != null)
                    {
                        node.appendChild(childNode);
                    }
                }
            }
        }

        return node;
    };

    // Returns the codec into the registry
    return codec;

}());


/*
Objectives
1. set edge label by his source connection point
2. Block connection to start node
3. after resizing cell fix his connection point label location
 */
mxGraph.prototype.isOutEdge = function(source,edge){
    return edge.source.getId()==source.getId();
};

mxGraph.prototype.getNumOfOutEdges = function(source){
    var result = 0 ;
    for(var i=0 ; i<source.getEdgeCount() ; i++){
        if (this.isOutEdge(source,source.edges[i]))
            result++;
    }
    return result;
};


mxGraph.prototype.findCurrLabel = function(source, state) {
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


mxGraph.prototype.getOutEdges = function(source) {
    var outEdges = [];
    for (let i = 0; i < source.getEdgeCount(); i++) {
        if (this.isOutEdge(source, source.edges[i]))
            outEdges.push(source.edges[i])
    }
    outEdges.sort((edge)=>edge.getAttribute('labelNum'));
    return outEdges;
}

// set edge label by his source connection point
mxGraph.prototype.insertEdge = function(parent, id, value, source, target, style, state)
{
    var edge = this.createEdge(parent, id, value, source, target, style, state);
    if (edge == null)
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

// Block connection to start node, and set edge label
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
        var numberOfOutEdges = this.getNumOfOutEdges(source);
        // if(numberOfOutEdges >= source.getAttribute('numberOfOutputs',1))
        //     return null;
        var indexLabel =this.findCurrLabel(source, state);
        var label = source.getAttribute('Outputnumber'+(indexLabel),' ');

        var doc = mxUtils.createXmlDocument();
        var obj = doc.createElement('object');
        obj.setAttribute('label','');
        var value = obj;

        value.setAttribute('labelNum',indexLabel);
        value.setAttribute('label',label);
        edge.setValue(value);

    }else
    if(source!=null && getshape(source.getStyle())=="bsync" ){
        var numberOfOutEdges = this.getNumOfOutEdges(source);
        if(numberOfOutEdges >= 1)
            return null;

    }else if(source!=null && getshape(source.getStyle())=="startnode" ){
        var numberOfOutEdges = this.getNumOfOutEdges(source);
        if(numberOfOutEdges >= 1)
            return null;
    }
    return edge;
};

// after resizing cell fix his connection point label location
mxGraph.prototype.resizeCell = function(cell, bounds, recurse)
{
    var output =  this.resizeCells([cell], [bounds], recurse)[0];
    fixConnectionPointsLabelLocation(this, cell, 0, 0);
    return output;
};

// use lock attribute
mxGraph.prototype.isCellLocked = function(cell)
{
    var geometry = this.model.getGeometry(cell);

    return this.isCellsLocked() || (geometry != null && this.model.isVertex(cell) && geometry.relative) ||
        (cell.lock != null && cell.lock);
};

// edge entry from left only
mxGraph.prototype.getConnectionConstraint = function(edge, terminal, source)
{

    var point = null;
    var x = edge.style[(source) ? mxConstants.STYLE_EXIT_X : mxConstants.STYLE_ENTRY_X];

    if (x != null)
    {
        var y = edge.style[(source) ? mxConstants.STYLE_EXIT_Y : mxConstants.STYLE_ENTRY_Y];

        if (y != null)
        {
            point = new mxPoint(parseFloat(x), parseFloat(y));
        }
    }

    var perimeter = false;
    var dx = 0, dy = 0;

    if (point != null)
    {
        perimeter = mxUtils.getValue(edge.style, (source) ? mxConstants.STYLE_EXIT_PERIMETER :
            mxConstants.STYLE_ENTRY_PERIMETER, true);

        //Add entry/exit offset
        dx = parseFloat(edge.style[(source) ? mxConstants.STYLE_EXIT_DX : mxConstants.STYLE_ENTRY_DX]);
        dy = parseFloat(edge.style[(source) ? mxConstants.STYLE_EXIT_DY : mxConstants.STYLE_ENTRY_DY]);

        dx = isFinite(dx)? dx : 0;
        dy = isFinite(dy)? dy : 0;
    }
    if (edge.cell.target!=null){
        edge.style.entryX=0;
        edge.style.entryY=0.5;
    }


    return new mxConnectionConstraint(point, perimeter, null, dx, dy);
};


// consider connection points as part of the shape when mouse is hover
mxGraph.prototype.intersects = function(state, x, y)
{
    if (state != null)
    {
        var pts = state.absolutePoints;

        if (pts != null)
        {
            var t2 = this.tolerance * this.tolerance;
            var pt = pts[0];

            for (var i = 1; i < pts.length; i++)
            {
                var next = pts[i];
                var dist = mxUtils.ptSegDistSq(pt.x, pt.y, next.x, next.y, x, y);

                if (dist <= t2)
                {
                    return true;
                }

                pt = next;
            }
        }
        else
        {
            var alpha = mxUtils.toRadians(mxUtils.getValue(state.style, mxConstants.STYLE_ROTATION) || 0);

            if (alpha != 0)
            {
                var cos = Math.cos(-alpha);
                var sin = Math.sin(-alpha);
                var cx = new mxPoint(state.getCenterX(), state.getCenterY());
                var pt = mxUtils.getRotatedPoint(new mxPoint(x, y), cos, sin, cx);
                x = pt.x;
                y = pt.y;
            }
            //if (state.cell.contains(state, x, y))
            //change if function
            if (this.shapeContains(state, x, y))
            {
                return true;
            }
        }
    }

    return false;
};

//
mxGraph.prototype.hitsSwimlaneContent = function(swimlane, x, y)
{
    return false;
};

// unsed -> may use to prevent connect start node as target
mxGraph.prototype.isValidConnection = function(source, target)
{
    // if(getshape(target.getStyle())=="startnode" || source == null || target == null)
    //     return false;
    return this.isValidSource(source) && this.isValidTarget(target);
};

mxGraph.prototype.isCellSelectable = function(cell)
{
    if(cell != null && cell.selectable != null && !cell.selectable)
        return false;
    return this.isCellsSelectable();
};

mxGraph.prototype.isCellEditable = function(cell)
{
    if(cell != null && cell.lock != null && cell.lock)
        return false;

    var state = this.view.getState(cell);
    var style = (state != null) ? state.style : this.getCellStyle(cell);

    return this.isCellsEditable() && !this.isCellLocked(cell) && style[mxConstants.STYLE_EDITABLE] != 0;
};

// set all cells in graph visitable
mxGraph.prototype.setAllCellsVisible = function(){
    var cells = [];
    if(this.getModel() != null && this.getModel().cells != null)
        cells = Object.values(this.getModel().cells);

    cells.map(cell => (cell != null && cell.visible != null) ? cell.visible = true : null);

}

// set the dividers and payloads cells invisible
mxGraph.prototype.setCellsUnvisible = function(){
    var cells = [];
    if(this.getModel() != null && this.getModel().cells != null)
        cells = Object.values(this.getModel().cells);

    for(var i=0; i <= cells.length ; i++){
        var cell = cells[i];
        if(cell.bp_type != null && (cell.bp_type == 'divider' || cell.bp_type == 'payloads'))
            cell.visible = false;
    }

}


mxGraph.prototype.createGraphView = function()
{
    return new mxGraphViewBP(this);
};

// when selecting child of bp shape select his parent
mxGraphSelectionModel.prototype.setCells = function(cells)
{
    if (cells != null)
    {
        if (this.singleSelection)
        {
            cells = [this.getFirstSelectableCell(cells)];
        }
        var tmp = [];

        for (var i = 0; i < cells.length; i++)
        {
            // if(cell[i].pa)
            if (this.graph.isCellSelectable(cells[i]))
            {
                tmp.push(cells[i]);
            }
        }

        this.changeSelection(tmp, this.cells);
    }
};
