// Duplicate HoverIconsBP is designed to erase the "Connect and Duplicate" arrows

HoverIconsBP = function(graph)
{
    HoverIcons.call(this,graph);
};
HoverIconsBP.prototype = Object.create(HoverIcons.prototype);

HoverIconsBP.prototype.repaint = function()
{
    this.bbox = null;

    if (this.currentState != null)
    {
        // Checks if cell was deleted
        this.currentState = this.getState(this.currentState);

        // Cell was deleted
        if (this.currentState != null &&
            this.graph.model.isVertex(this.currentState.cell) &&
            this.graph.isCellConnectable(this.currentState.cell))
        {
            var bds = mxRectangle.fromRectangle(this.currentState);

            // Uses outer bounding box to take rotation into account
            if (this.currentState.shape != null && this.currentState.shape.boundingBox != null)
            {
                bds = mxRectangle.fromRectangle(this.currentState.shape.boundingBox);
            }

            bds.grow(this.graph.tolerance);
            bds.grow(this.arrowSpacing);

            var handler = this.graph.selectionCellsHandler.getHandler(this.currentState.cell);
            var rotationBbox = null;

            if (handler != null)
            {
                bds.x -= handler.horizontalOffset / 2;
                bds.y -= handler.verticalOffset / 2;
                bds.width += handler.horizontalOffset;
                bds.height += handler.verticalOffset;

                // Adds bounding box of rotation handle to avoid overlap
                if (handler.rotationShape != null && handler.rotationShape.node != null &&
                    handler.rotationShape.node.style.visibility != 'hidden' &&
                    handler.rotationShape.node.style.display != 'none' &&
                    handler.rotationShape.boundingBox != null)
                {
                    rotationBbox = handler.rotationShape.boundingBox;
                }
            }

            // Positions arrows avoid collisions with rotation handle
            // var positionArrow = mxUtils.bind(this, function(arrow, x, y)
            // {
            //     if (rotationBbox != null)
            //     {
            //         var bbox = new mxRectangle(x, y, arrow.clientWidth, arrow.clientHeight);
            //
            //         if (mxUtils.intersects(bbox, rotationBbox)) {
            //             if (arrow == this.arrowRight) {
            //                 x += rotationBbox.x + rotationBbox.width - bbox.x;
            //             }
            //
            //         }
            //     }
            //
            //     arrow.style.left = x + 'px';
            //     arrow.style.top = y + 'px';
            //     mxUtils.setOpacity(arrow, this.inactiveOpacity);
            // });
            //
            // positionArrow(this.arrowRight, Math.round(bds.x + bds.width - this.tolerance),
            //     Math.round(this.currentState.getCenterY() - this.triangleRight.height / 2 - this.tolerance));
            //

            // if (this.checkCollisions)
            // {
            //     var right = this.graph.getCellAt(bds.x + bds.width +
            //         this.triangleRight.width / 2, this.currentState.getCenterY());
            //     var left = this.graph.getCellAt(bds.x - this.triangleLeft.width / 2, this.currentState.getCenterY());
            //     var top = this.graph.getCellAt(this.currentState.getCenterX(), bds.y - this.triangleUp.height / 2);
            //     var bottom = this.graph.getCellAt(this.currentState.getCenterX(), bds.y + bds.height + this.triangleDown.height / 2);
            //
            //     // Shows hover icons large cell is behind all directions of current cell
            //     if (right != null && right == left && left == top && top == bottom)
            //     {
            //         right = null;
            //         left = null;
            //         top = null;
            //         bottom = null;
            //     }
            //
            //     var currentGeo = this.graph.getCellGeometry(this.currentState.cell);
            //
            //     var checkCollision = mxUtils.bind(this, function(cell, arrow)
            //     {
            //         var geo = this.graph.model.isVertex(cell) && this.graph.getCellGeometry(cell);
            //
            //         // Ignores collision if vertex is more than 3 times the size of this vertex
            //         if (cell != null && !this.graph.model.isAncestor(cell, this.currentState.cell) &&
            //             !this.graph.isSwimlane(cell) && (geo == null || currentGeo == null ||
            //                 (geo.height < 3 * currentGeo.height && geo.width < 3 * currentGeo.width)))
            //         {
            //             arrow.style.visibility = 'hidden';
            //         }
            //         else
            //         {
            //             arrow.style.visibility = 'visible';
            //         }
            //     });
            //
            //     checkCollision(right, this.arrowRight);
            // }
            // else
            // {
            //     this.arrowRight.style.visibility = 'visible';
            // }

            // if (this.graph.tooltipHandler.isEnabled())
            // {
            //     this.arrowRight.setAttribute('title', mxResources.get('plusTooltip'));
            // }
            // else
            // {
            //     this.arrowRight.removeAttribute('title');
            // }
        }
        else
        {
            this.reset();
        }

        // Updates bounding box
        if (this.currentState != null)
        {
            this.bbox = this.computeBoundingBox();

            // Adds tolerance for hover
            if (this.bbox != null)
            {
                this.bbox.grow(10);
            }
        }
    }
};



// Duplicate GraphBP is designed to adjust connections point According to the number of outgoing arrows.

GraphBP = function(container, model, renderHint, stylesheet, themes, standalone)
{
    Graph.call(this, container, model, renderHint, stylesheet, themes, standalone);
};

GraphBP.prototype = Object.create(Graph.prototype);


GraphBP.prototype.getAllConnectionConstraints = function(terminal, source){
     if (terminal != null && terminal.cell != null && terminal.cell.new_constraints != null)
     {
             return terminal.cell.new_constraints;
     }
     return Graph.prototype.getAllConnectionConstraints(terminal, source)
}

GraphBP.prototype.lockLayers = function(lock) {

    var mod = this.getModel()
    mod.beginUpdate();

    var locker;
    lock ? locker = '1' : locker = '0';

    mod.root.children.forEach(layer => {
        if(mod.isLayer(layer)) {
            var style = layer.getStyle()
            var value = (mxUtils.getValue(style, 'locked', locker) == '1') ? locker : !locker;
            this.setCellStyles('locked', value, [layer]);
        }
    });

    mod.endUpdate();

}

GraphBP.prototype.fixValue = function(cell) {
    let value = cell.getValue();

    // Converts the value to an XML node
    if (value == "") {
        var doc = mxUtils.createXmlDocument();
        var obj = doc.createElement('object');
        obj.setAttribute('label', value || '');
        value = obj;
    }

    cell.setValue(value);
}

GraphBP.prototype.shapeContains = function(state, x, y) {
    var size = this.view.scale;
    var contains = state.x <= x && state.x + state.width >= x &&
        state.y <= y && state.y + state.height >= y;
    if (!contains) {
        var constraints = this.getAllConnectionConstraints(state, true) || [];
        for (var i = 0; i < constraints.length && !contains; i++) {
            var constraint = constraints[i];
            if (constraint.name == "I")
                continue;
            var constraintPoint = constraint.point;
            var constraintPointX = state.x + constraintPoint.x * state.width;
            var constraintPointY = state.y + constraintPoint.y * state.height;
            var constaintImg = this.connectionHandler.constraintHandler.getImageForConstraint(state, constraint, constraintPoint);
            var constraintWidth = constaintImg.width  * size;
            var constraintHeight = constaintImg.height  * size;
            contains = constraintPointX - constraintWidth <= x && constraintPointX + constraintWidth*1.5 >= x &&
                constraintPointY - constraintHeight <= y && constraintPointY + constraintHeight >= y;
            if(contains)
                return true;

        }
    }
    return contains;
};

Graph.prototype.selectAllForDebugging = function() {
    mxGraph.prototype.selectAll.apply(this, arguments);
};

// get the bp cell in (x,y) cordinate
Graph.prototype.getScaledCellAt = function(x, y, parent, vertices, edges, ignoreFn)
{
    vertices = (vertices != null) ? vertices : true;
    edges = (edges != null) ? edges : true;

    if (parent == null)
    {
        parent = this.getCurrentRoot();

        if (parent == null)
        {
            parent = this.getModel().getRoot();
        }
    }

    if (parent != null)
    {
        var childCount = this.model.getChildCount(parent);

        for (var i = childCount - 1; i >= 0; i--)
        {
            var cell = this.model.getChildAt(parent, i);
            var result = this.getScaledCellAt(x, y, cell, vertices, edges, ignoreFn);

            if (result != null)
            {
                return result;
            }
            else if (this.isCellVisible(cell) && (edges && this.model.isEdge(cell) ||
                vertices && this.model.isVertex(cell)))
            {
                var state = this.view.getState(cell);

                if (state != null && (ignoreFn == null || !ignoreFn(state, x, y)) &&
                    this.intersects(state, x, y))
                {
                    if(cell.bp_cell == null || (cell.bp_cell != null && cell.bp_cell))
                        return cell;
                }
            }
        }
    }

    return null;
};

// GraphBP.prototype = Object.create(Graph.prototype);