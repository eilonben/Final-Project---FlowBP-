/*
objectives:
1. set edges labels
2. input edges connect to the left side of the cell
3. edges connecting only two bp cells
 */
function mxConnectionHandlerBP(graph, factoryMethod){
    mxConnectionHandler.call(this,graph, factoryMethod);
};

mxConnectionHandlerBP.defultOutputX = 1;

mxConnectionHandlerBP.defultOutputY = 0.5;

mxConnectionHandlerBP.defultInputX = -0.3;

mxConnectionHandlerBP.defultInputY = 0.5;

mxConnectionHandlerBP.prototype = Object.create(mxConnectionHandler.prototype);

/** Override
 * set the edge label if exist
 * */
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

/** Override
 * change the call from constraintHandler to mxConstraintHandlerBP
 */
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

/** Override
 *  relocate input edge to the left side of the cell
*/
mxConnectionHandlerBP.prototype.checkAndFixBorder = function(edge)
{
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

};


/** Override
 * when connecting into inner child of bp connect to his parent (bp cell) instead
 * */
mxConnectionHandlerBP.prototype.connect = function(source, target, evt, dropTarget)
{

    if (target != null || this.isCreateTarget(evt) || this.graph.allowDanglingEdges) {
        // Uses the common parent of source and target or
        // the default parent to insert the edge
        var model = this.graph.getModel();
        var terminalInserted = false;
        var edge = null;

        //If this is a bp child connect to his parent
        // if (target!= null && target.isInnerChild())
        //     target = target.parent;

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

/** Override
 * do not destroy connection points icons
 * */
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
    //{key: cell id; value: connection point image}
    this.focusIcons = {};

};

mxConstraintHandlerBP.prototype = Object.create(mxConstraintHandler.prototype);

mxConstraintHandlerBP.prototype.OutputPointImage = new mxImage(mxClient.imageBasePath + '/output.png', 10, 10);

mxConstraintHandlerBP.prototype.InputPointImage = new mxImage(mxClient.imageBasePath + '/input.png', 10, 10);

mxConstraintHandlerBP.prototype.highlightColor = '#808080';

/** Override
 * returns different image depending on constraint type
  */
mxConstraintHandlerBP.prototype.getImageForConstraint = function(state, constraint, point)
{
    if(constraint != null && constraint.name == "I")
        return this.InputPointImage;
    else
        return this.OutputPointImage;
};

/** Override
 * do not delete connection points icons
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

/** Override
 * do not delete connection points icons
 */
mxConstraintHandlerBP.prototype.destroyIcons = function()
{
    return;
};

/** Override
 *  destroy shape connection points icons (use when deleting a shape)
 */
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

/** Override
 * focus on shape when also hover a shape connection points
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
        /*this.graph.getCellAt(x,y) - the change*/
        var state = this.graph.view.getState(this.graph.getCellAt(x, y));

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

/** Override
 * define the connection points location on the cell by the type of connection
 */
mxConstraintHandlerBP.prototype.getConstraintLocation = function (state, constraints, zoomSize)
{
    var cp = this.graph.getConnectionPoint(state, constraints);
    var img = this.getImageForConstraint(state, constraints, cp);
    var cell = state.cell;
    var point  = new mxPoint();

    if( (cell.bp_type != null && cell.bp_type == 'startnode') || (constraints != null && constraints.name == 'I'))
        point.x = Math.round(cp.x - (img.width * zoomSize));
    else
        point.x = cp.x;
    point.y =  Math.round(cp.y - (img.height * zoomSize) / 2);
    return point;
};


/** Override
 * Adjust the function for the class changes
 */
mxConstraintHandlerBP.prototype.redraw = function()
{
    var zoomSize = this.graph.view.scale;
    if (this.currentFocus != null && this.constraints != null && this.focusIcons != null)
    {
        var state = this.graph.view.getState(this.currentFocus.cell);
        this.currentFocus = state;
        this.currentFocusArea = new mxRectangle(state.x, state.y, state.width, state.height);

        var allIcons = (state == null || this.focusIcons[state.cell.id] == null) ? Object.values(this.focusIcons).flat() : this.focusIcons[state.cell.id] ;

        for (var i = 0; i < allIcons.length && i < this.constraints.length; i++)
        {
            var cp = this.graph.getConnectionPoint(state, this.constraints[i]);
            var img = this.getImageForConstraint(state, this.constraints[i], cp);

            var imgPoint = this.getConstraintLocation(state, this.constraints[i], zoomSize);
            var bounds = new mxRectangle(imgPoint.x , imgPoint.y, img.width * zoomSize, img.height * zoomSize);

            allIcons[i].bounds = bounds;
            allIcons[i].redraw();
            this.currentFocusArea.add(allIcons[i].bounds);
            this.focusPoints[i] = cp;
        }
    }
};

/** Override
 * hide input connection points when focus a cell
 */
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
        this.currentFocusArea = new mxRectangle(state.x, state.y, state.width + 10, state.height);

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
            var t = 0;
            if(!source)
                t=1;
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
        this.showConstraint();
        this.destroyFocusHighlight();
    }
};


/** Override
 * draw for a shape or for all shapes the connection points
  */
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
1. prevent move an edge without its source and target cells
 */
function mxGraphHandlerBP(graph){
    mxGraphHandler.call(this, graph);

};

mxGraphHandlerBP.prototype = Object.create(mxGraphHandler.prototype);

/** Override
 *  prevent move an edge without its source and target cells
 */
mxGraphHandlerBP.prototype.moveCells = function(cells, dx, dy, clone, target, evt)
{
    //this is new
    let edges = cells.filter(cell => cell.isEdge());
    let shapes = cells.filter(cell => cell.bp_type != null);
    let noneShapeOrEdge = cells.filter(cell => !cell.isEdge() && cell.bp_type == null);
    let validEdges = edges.filter(edge => (cells.includes(edge.target) && cells.includes(edge.source)));
    cells = shapes.concat(validEdges).concat(noneShapeOrEdge);


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


/*
Objectives
1. repaint edges or shapes in black after they were painted in red
 */
function mxGraphModelBP(root){
    mxGraphModel.call(this, root);

};

mxGraphModelBP.prototype = Object.create(mxGraphModel.prototype);

/** Override
 * repaint edges or shapes in black after they were painted in red
 */
mxGraphModel.prototype.terminalForCellChanged = function(edge, terminal, isSource)
{

    var previous = this.getTerminal(edge, isSource);

    if (terminal != null)
    {

        if(terminal.isInnerChild())
            terminal = terminal.parent;

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


/** Override
 * change initial codec to mxGraphModelBP
  */
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
1. when deleting a cell, delete the connection points icons
2. when graph change, draw connection points of all bp shapes (call show constraint)
 */
function mxGraphViewBP(graph){
    mxGraphView.call(this, graph);

};

mxGraphViewBP.prototype = Object.create(mxGraphView.prototype);

/** Override
 * when connection an existing edge to inner child of bp cell, reconnect the edge to the cell parent (bp cell)
 */
mxGraphView.prototype.updateEdgeState = function(state, geo)
{
    var source = state.getVisibleTerminalState(true);
    var target = state.getVisibleTerminalState(false);


    // This will remove edges with no terminals and no terminal points
    // as such edges are invalid and produce NPEs in the edge styles.
    // Also removes connected edges that have no visible terminals.
    if ((this.graph.model.getTerminal(state.cell, true) != null && source == null) ||
        (source == null && geo.getTerminalPoint(true) == null) ||
        (this.graph.model.getTerminal(state.cell, false) != null && target == null) ||
        (target == null && geo.getTerminalPoint(false) == null))
    {
        this.clear(state.cell, true);
    }
    else
    {
        this.updateFixedTerminalPoints(state, source, target);
        this.updatePoints(state, geo.points, source, target);
        this.updateFloatingTerminalPoints(state, source, target);

        var pts = state.absolutePoints;

        if (state.cell != this.currentRoot && (pts == null || pts.length < 2 ||
            pts[0] == null || pts[pts.length - 1] == null))
        {
            // This will remove edges with invalid points from the list of states in the view.
            // Happens if the one of the terminals and the corresponding terminal point is null.
            this.clear(state.cell, true);
        }
        else
        {
            this.updateEdgeBounds(state);
            this.updateEdgeLabelOffset(state);
        }
    }

};


/** Override
 * delete also the connection points icons
 */
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


/** Override
 * when graph changes , draw all shapes connection points (call showConstrains)
 */
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


    // the only change
    this.graph.connectionHandler.constraintHandler.showConstraint();

};

/** Override
 * change the call from mxGraphView to mxGraphViewBP
 */
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
2. Block input edge to start node
3. after resizing cell fix his connection point label location
 */
mxGraph.headLineSize = 23;

mxGraph.prototype.cellsEditable = true;

mxGraph.prototype.vertexLabelsMovable = false;

/**
 * check if the given source is the edge source
 * @param source - <mxCell>
 * @param edge - <mxCell> to check his source
 * @returns {boolean}
 */
mxGraph.prototype.isOutEdge = function(source,edge) {
    return edge.source.getId() == source.getId();
};

/**
 * count out edges of the cell
 * @param source - <mxCell> to count his out edges
 * @returns {number}
 */
mxGraph.prototype.getNumOfOutEdges = function(source){
    var result = 0 ;
    for(var i=0 ; i<source.getEdgeCount() ; i++){
        if (this.isOutEdge(source,source.edges[i]))
            result++;
    }
    return result;
};

/**
 * get bp cell child by his type
 * @param cell - <mxCell> parent cell
 * @param type - <string> wanted type of the child
 * @returns {mxCell}
 */
mxGraph.prototype.getChildByType = function(cell, type)
{
    var child = null;
    if(cell.children != null) {
        var filterd = cell.children.filter(x => x.bp_type != null && x.bp_type == type);
        child = filterd.length == 0 ? null : filterd[0];
    }
    return child;
};

/**
 * Adjust sizes of the inner cells
 * @param cell - <mxCell> who his inner cells need to be adjusted
 * @param oldDividerGeometry - <mxGeometry> of divider before the change
 */
mxGraph.prototype.fixBPChildren = function(cell, oldDividerGeometry){
    if(cell == null || !cell.bp_cell)
        return
    // restore divider y location and height
    var divider = this.getChildByType(cell, 'divider');
    if(divider != null) {
        divider.geometry.y = mxGraph.headLineSize * 0.7;
        divider.geometry.height =  oldDividerGeometry != null ?oldDividerGeometry.height : divider.geometry.height;
    }
    // restore data y location and height
    var cellHeight = cell.geometry.height;
    var data = this.getChildByType(cell, 'data');
    if(data != null) {
        data.geometry.height = cellHeight - mxGraph.headLineSize;
        data.geometry.y = mxGraph.headLineSize;
    }

};

/**
 * get the output label index
 * @param source - <mxCell> source of the edge
 * @param edgeState - <Object> details of the edge
 * @returns {number}
 */
mxGraph.prototype.findCurrLabel = function(source, edgeState) {
    //there is only one constraint point
    if(source.new_constraints == null)
        return 1;
    //search for the source constraint of the edge
    var index = 0;
    for(; index <= source.new_constraints.length; index++){
        var constraint = source.new_constraints[index];
        if(constraint.point.x == edgeState.exitX && constraint.point.y == edgeState.exitY)
            break;
    }
    return index+1;
}

/**
 * get all the out edges of the source node
 * @param source - <mxCell>
 * @returns {Array}
 */
mxGraph.prototype.getOutEdges = function(source) {
    var outEdges = [];
    for (let i = 0; i < source.getEdgeCount(); i++) {
        if (this.isOutEdge(source, source.edges[i]))
            outEdges.push(source.edges[i])
    }
    outEdges.sort((edge)=>edge.getAttribute('labelNum'));
    return outEdges;
}

/** Override
 * set edge label by his source connection point
 */
mxGraph.prototype.insertEdge = function(parent, id, value, source, target, style, state)
{
    var edge = this.createEdge(parent, id, value, source, target, style, state);
    if (edge == null)
        return null;
    return this.addEdge(edge, parent, source, target);
};

/** Override
 * change the call from mxGraphHandler to mxGraphHandlerBP
 */
mxGraph.prototype.createGraphHandler = function()
{
    return new mxGraphHandlerBP(this);
};

/** Override
 * change the call from mxConnectionHandler to mxConnectionHandlerBP
 */
mxGraph.prototype.createConnectionHandler = function()
{
    return new mxConnectionHandlerBP(this);
};

/** Override
 * set edge label and prevents creation of new invalid edge
 */
mxGraph.prototype.createEdge = function(parent, id, value, source, target, style, state)
{
    // Creates the edge
    var edge = new mxCell(value, new mxGeometry(), style);
    edge.setId(id);
    edge.setEdge(true);
    edge.geometry.relative = true;

    // edge must have a target
    if(source != null && target == null)
        return null;

    //cases by nodes
    if(source!=null && getshape(source.getStyle())=="general" ){
        var numberOfOutEdges = this.getNumOfOutEdges(source);
        // if(numberOfOutEdges >= source.getAttribute('numberOfOutputs',1))
        //     return null;
        var indexLabel = this.findCurrLabel(source, state);
        var label = source.getAttribute('Outputnumber' + (indexLabel), ' ');

        var doc = mxUtils.createXmlDocument();
        var obj = doc.createElement('object');
        obj.setAttribute('label', '');
        var value = obj;

        value.setAttribute('labelNum', indexLabel.toString());
        value.setAttribute('label', label);
        edge.setValue(value);
    }
   /* else if(source!=null && getshape(source.getStyle())=="bsync" ){
        var numberOfOutEdges = this.getNumOfOutEdges(source);

    }else if(source!=null && getshape(source.getStyle())=="startnode" ){
        var numberOfOutEdges = this.getNumOfOutEdges(source);
    }*/
    return edge;
};


/** Override
 *  after resizing cell fix output labels and inner cells appearance
 */
mxGraph.prototype.resizeCell = function(cell, bounds, recurse)
{
    var dividerGeomtry;
    if(cell != null && cell.isBPCell())
        dividerGeomtry = this.getChildByType(cell, 'divider').geometry;
    var output =  this.resizeCells([cell], [bounds], recurse)[0];
    this.fixConnectionPointsLabelLocation(cell);
    this.fixBPChildren(cell, dividerGeomtry);
    return output;
};

/** Override
 * lock inner cells of bp cell
 */
mxGraph.prototype.isCellLocked = function(cell)
{
    if (cell.bp_cell != null && !cell.bp_cell)
        return true;

    var geometry = this.model.getGeometry(cell);

    return this.isCellsLocked() || (geometry != null && this.model.isVertex(cell) && geometry.relative) ||
        (cell.lock != null && cell.lock);
};

/** Override
 * relocate input edge to the left side of the cell
 */
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


/** Override
 * hover bp cell consider also his connection points as part of the shape
 */
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
            // check if (x,y) contains cell or his connection points
            if (this.shapeContains(state, x, y))
            {
                return true;
            }
        }
    }

    return false;
};


/** Override
 * edges validation rules
 */
mxGraph.prototype.isValidConnection = function(source, target)
{
    //edge must have source and target
    if(source == null || target == null)
        return false;
    // start node could not be a target
    if(target.isStartNode())
        return false;
    return this.isValidSource(source) && this.isValidTarget(target);
};

/** Override
 * use selectable field of mxCell
  */
mxGraph.prototype.isCellSelectable = function(cell)
{
    if(cell != null && cell.selectable != null && !cell.selectable)
        return false;
    return this.isCellsSelectable();
};

/** Override
 * set bp related shapes and edges uneditable
  */
mxGraph.prototype.isCellEditable = function(cell)
{
    if(cell != null && cell.bp_type != null || cell.isEdge())
        return false;

    var state = this.view.getState(cell);
    var style = (state != null) ? state.style : this.getCellStyle(cell);

    return this.isCellsEditable() && !this.isCellLocked(cell) && style[mxConstants.STYLE_EDITABLE] != 0;
};

/** Override
 *
 */
mxGraph.prototype.createGraphView = function()
{
    return new mxGraphViewBP(this);
};


/**
 * relocate connection points labels according to connection points locations
 * @param cell - <mxCell> to fix his connection points location
 */
mxGraph.prototype.fixConnectionPointsLabelLocation = function(cell) {
    if (cell == null || cell.children == null)
        return;

    var labels = cell.getOutputLabels();

    for (var i = 0; i < labels.length; i++) {
        var ConnectionPointLabelCell = labels[i];

        var constraint_img_height = this.connectionHandler.constraintHandler.getImageForConstraint().height;
        var cp = cell.new_constraints[i].point;

        var newY = cp.y * cell.getGeometry().height - constraint_img_height;
        var geo = ConnectionPointLabelCell.getGeometry().clone();
        geo.y = newY;
        var newX = cp.x * cell.getGeometry().width;
        geo.x = newX;
        this.getModel().setGeometry(ConnectionPointLabelCell, geo);
    }

};

/**
* initial new_constraints filed of cell
* @param cell - <mxCell> to initial his new_constraint field if needed
*/
mxGraph.prototype.validateConstraints = function (cell){
    if(cell != null && cell.new_constraints == null){
        var state = this.view.getState(cell, false);
        cell.new_constraints = this.getAllConnectionConstraints(state, true);
    }
};


/**
 * deny the option that a bp related shapes will be another bp related shape parent
 */
mxGraphModel.prototype.parentForCellChanged = function(cell, parent, index)
{
    var previous = this.getParent(cell);

    if (parent != null)
    {
        if((parent.bp_cell != null || parent.edge) && (cell.bp_cell != null))
            return previous;
        if (parent != previous || previous.getIndex(cell) != index)
        {
            parent.insert(cell, index);
        }
    }
    else if (previous != null)
    {
        var oldIndex = previous.getIndex(cell);
        previous.remove(oldIndex);
    }

    // Adds or removes the cell from the model
    var par = this.contains(parent);
    var pre = this.contains(previous);

    if (par && !pre)
    {
        this.cellAdded(cell);
    }
    else if (pre && !par)
    {
        this.cellRemoved(cell);
    }

    return previous;
};

//
/**
 * return all output labels
 * @returns {Array} sorted(by label index)
 */
mxCell.prototype.getOutputLabels = function(){
    let children = this.children || [];
    let labels = children.filter(x => x.label_index != null);
    return labels.sort(function(a, b) {return a.label_index - b.label_index});
};

/**
 * check if cell is label
 * @returns {boolean}
 */
mxCell.prototype.isLabel = function(){
    return this.style.search('label') != -1;
};

/**
 * check if cell is bp cell and not start node
 * @returns {boolean}
 */
mxCell.prototype.isBPCell = function() {return this.bp_cell != null && this.bp_cell && this.bp_type != 'startnode'; };

/**
 * check if cell is inner cell of bp cell
 * @returns {boolean}
 */
mxCell.prototype.isInnerChild = function(){
    return (this.bp_type != null && (this.bp_type == 'data' || this.bp_type== 'divider'));
};

/**
 * check if cell is is start node
 * @returns {boolean}
 */
mxCell.prototype.isStartNode = function(){
    return (this.bp_type != null && this.bp_type =='startnode');
};

/**
 * check if cell is is bsync node
 * @returns {boolean}
 */
mxCell.prototype.isBsyncNode = function(){
    return (this.bp_type != null && this.bp_type =='BSync');
};

/**
 * check if cell is is general node
 * @returns {boolean}
 */
mxCell.prototype.isGeneralNode = function(){
    return (this.bp_type != null && this.bp_type =='General');
};

/**
 * check if cell is is console node
 * @returns {boolean}
 */
mxCell.prototype.isConsoleNode = function(){
    return (this.bp_type != null && this.bp_type =='Console');
};