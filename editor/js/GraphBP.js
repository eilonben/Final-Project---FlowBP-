
HoverIconsBP = function(graph)
{
    HoverIcons.call(this,graph);
};
HoverIconsBP.prototype = Object.create(HoverIcons.prototype);

// HoverIconsBP.prototype = new HoverIcons();
// HoverIconsBP.prototype.constructor = HoverIconsBP;
//
// mxRectangle.prototype = new mxPoint();
// mxRectangle.prototype.constructor = mxRectangle;


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
            var positionArrow = mxUtils.bind(this, function(arrow, x, y)
            {
                if (rotationBbox != null)
                {
                    var bbox = new mxRectangle(x, y, arrow.clientWidth, arrow.clientHeight);

                    if (mxUtils.intersects(bbox, rotationBbox)) {
                        if (arrow == this.arrowRight) {
                            x += rotationBbox.x + rotationBbox.width - bbox.x;
                        }

                    }
                }

                arrow.style.left = x + 'px';
                arrow.style.top = y + 'px';
                mxUtils.setOpacity(arrow, this.inactiveOpacity);
            });

            positionArrow(this.arrowRight, Math.round(bds.x + bds.width - this.tolerance),
                Math.round(this.currentState.getCenterY() - this.triangleRight.height / 2 - this.tolerance));


            if (this.checkCollisions)
            {
                var right = this.graph.getCellAt(bds.x + bds.width +
                    this.triangleRight.width / 2, this.currentState.getCenterY());
                var left = this.graph.getCellAt(bds.x - this.triangleLeft.width / 2, this.currentState.getCenterY());
                var top = this.graph.getCellAt(this.currentState.getCenterX(), bds.y - this.triangleUp.height / 2);
                var bottom = this.graph.getCellAt(this.currentState.getCenterX(), bds.y + bds.height + this.triangleDown.height / 2);

                // Shows hover icons large cell is behind all directions of current cell
                if (right != null && right == left && left == top && top == bottom)
                {
                    right = null;
                    left = null;
                    top = null;
                    bottom = null;
                }

                var currentGeo = this.graph.getCellGeometry(this.currentState.cell);

                var checkCollision = mxUtils.bind(this, function(cell, arrow)
                {
                    var geo = this.graph.model.isVertex(cell) && this.graph.getCellGeometry(cell);

                    // Ignores collision if vertex is more than 3 times the size of this vertex
                    if (cell != null && !this.graph.model.isAncestor(cell, this.currentState.cell) &&
                        !this.graph.isSwimlane(cell) && (geo == null || currentGeo == null ||
                            (geo.height < 3 * currentGeo.height && geo.width < 3 * currentGeo.width)))
                    {
                        arrow.style.visibility = 'hidden';
                    }
                    else
                    {
                        arrow.style.visibility = 'visible';
                    }
                });

                checkCollision(right, this.arrowRight);
            }
            else
            {
                this.arrowRight.style.visibility = 'visible';
            }

            if (this.graph.tooltipHandler.isEnabled())
            {
                this.arrowRight.setAttribute('title', mxResources.get('plusTooltip'));
            }
            else
            {
                this.arrowRight.removeAttribute('title');
            }
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



// HoverIcons.prototype.init = function()
// {
//     // this.arrowUp = this.createArrow(this.triangleUp, mxResources.get('plusTooltip'));
//     this.arrowRight = this.createArrow(this.triangleRight, mxResources.get('plusTooltip'));
//     // this.arrowDown = this.createArrow(this.triangleDown, mxResources.get('plusTooltip'));
//     // this.arrowLeft = this.createArrow(this.triangleLeft, mxResources.get('plusTooltip'));
//
//     this.elts = [this.arrowRight];
//     // this.elts = [this.arrowUp, this.arrowRight, this.arrowDown, this.arrowLeft];
//
//     this.resetHandler = mxUtils.bind(this, function()
//     {
//         this.reset();
//     });
//
//     this.repaintHandler = mxUtils.bind(this, function()
//     {
//         this.repaint();
//     });
//
//     this.graph.selectionModel.addListener(mxEvent.CHANGE, this.resetHandler);
//     this.graph.model.addListener(mxEvent.CHANGE, this.repaintHandler);
//     this.graph.view.addListener(mxEvent.SCALE_AND_TRANSLATE, this.repaintHandler);
//     this.graph.view.addListener(mxEvent.TRANSLATE, this.repaintHandler);
//     this.graph.view.addListener(mxEvent.SCALE, this.repaintHandler);
//     this.graph.view.addListener(mxEvent.DOWN, this.repaintHandler);
//     this.graph.view.addListener(mxEvent.UP, this.repaintHandler);
//     this.graph.addListener(mxEvent.ROOT, this.repaintHandler);
//     this.graph.addListener(mxEvent.ESCAPE, this.resetHandler);
//     mxEvent.addListener(this.graph.container, 'scroll', this.resetHandler);
//
//     // Resets the mouse point on escape
//     this.graph.addListener(mxEvent.ESCAPE, mxUtils.bind(this, function()
//     {
//         this.mouseDownPoint = null;
//     }));
//
//     // Removes hover icons if mouse leaves the container
//     mxEvent.addListener(this.graph.container, 'mouseleave',  mxUtils.bind(this, function(evt)
//     {
//         // Workaround for IE11 firing mouseleave for touch in diagram
//         if (evt.relatedTarget != null && mxEvent.getSource(evt) == this.graph.container)
//         {
//             this.setDisplay('none');
//         }
//     }));
//
//     // Resets current state when in-place editor starts
//     this.graph.addListener(mxEvent.START_EDITING, mxUtils.bind(this, function(evt)
//     {
//         this.reset();
//     }));
//
//     // Resets current state after update of selection state for touch events
//     var graphClick = this.graph.click;
//     this.graph.click = mxUtils.bind(this, function(me)
//     {
//         graphClick.apply(this.graph, arguments);
//
//         if (this.currentState != null && !this.graph.isCellSelected(this.currentState.cell) &&
//             mxEvent.isTouchEvent(me.getEvent()) && !this.graph.model.isVertex(me.getCell()))
//         {
//             this.reset();
//         }
//     });
//
//     // Checks if connection handler was active in mouse move
//     // as workaround for possible double connection inserted
//     var connectionHandlerActive = false;
//
//     // Implements a listener for hover and click handling
//     this.graph.addMouseListener(
//         {
//             mouseDown: mxUtils.bind(this, function(sender, me)
//             {
//                 connectionHandlerActive = false;
//                 var evt = me.getEvent();
//
//                 if (this.isResetEvent(evt))
//                 {
//                     this.reset();
//                 }
//                 else if (!this.isActive())
//                 {
//                     var state = this.getState(me.getState());
//
//                     if (state != null || !mxEvent.isTouchEvent(evt))
//                     {
//                         this.update(state);
//                     }
//                 }
//
//                 this.setDisplay('none');
//             }),
//             mouseMove: mxUtils.bind(this, function(sender, me)
//             {
//                 var evt = me.getEvent();
//
//                 if (this.isResetEvent(evt))
//                 {
//                     this.reset();
//                 }
//                 else if (!this.graph.isMouseDown && !mxEvent.isTouchEvent(evt))
//                 {
//                     this.update(this.getState(me.getState()),
//                         me.getGraphX(), me.getGraphY());
//                 }
//
//                 if (this.graph.connectionHandler != null &&
//                     this.graph.connectionHandler.shape != null)
//                 {
//                     connectionHandlerActive = true;
//                 }
//             }),
//             mouseUp: mxUtils.bind(this, function(sender, me)
//             {
//                 var evt = me.getEvent();
//                 var pt = mxUtils.convertPoint(this.graph.container,
//                     mxEvent.getClientX(evt), mxEvent.getClientY(evt))
//
//                 if (this.isResetEvent(evt))
//                 {
//                     this.reset();
//                 }
//                 else if (this.isActive() && !connectionHandlerActive &&
//                     this.mouseDownPoint != null)
//                 {
//                     this.click(this.currentState, this.getDirection(), me);
//                 }
//                 else if (this.isActive())
//                 {
//                     // Selects target vertex after drag and clone if not only new edge was inserted
//                     if (this.graph.getSelectionCount() != 1 || !this.graph.model.isEdge(
//                         this.graph.getSelectionCell()))
//                     {
//                         this.update(this.getState(this.graph.view.getState(
//                             this.graph.getCellAt(me.getGraphX(), me.getGraphY()))));
//                     }
//                     else
//                     {
//                         this.reset();
//                     }
//                 }
//                 else if (mxEvent.isTouchEvent(evt) || (this.bbox != null &&
//                     mxUtils.contains(this.bbox, me.getGraphX(), me.getGraphY())))
//                 {
//                     // Shows existing hover icons if inside bounding box
//                     this.setDisplay('');
//                     this.repaint();
//                 }
//                 else if (!mxEvent.isTouchEvent(evt))
//                 {
//                     this.reset();
//                 }
//
//                 connectionHandlerActive = false;
//                 this.resetActiveArrow();
//             })
//         });
// };