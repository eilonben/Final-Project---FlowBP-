SidebarBP = function(editorUi, container)
{
    Sidebar.call(this,editorUi,container);
};

SidebarBP.prototype = Object.create(Sidebar.prototype);


SidebarBP.prototype.init = function()
{
    this.addSearchPalette(true);
    this.addFlowBPPalette();
};

// Specifies the width of the thumbnails.
SidebarBP.prototype.thumbWidth = 92;

// Specifies the height of the thumbnails.
SidebarBP.prototype.thumbHeight = 80;

// Specifies the width of the thumbnails.
SidebarBP.prototype.minThumbStrokeWidth = 0;

// Specifies the width of the thumbnails.
SidebarBP.prototype.thumbAntiAlias = false;

// Specifies the padding for the thumbnails. Default is 1.
SidebarBP.prototype.thumbPadding = 1;

// Specifies the delay for the tooltip. Default is 2 px.
SidebarBP.prototype.thumbBorder = 2;


SidebarBP.prototype.defaultImageWidth = 150;

// Specifies the height for clipart images. Default is 80.
SidebarBP.prototype.defaultImageHeight = 100;


//Duplication This function is designed to replace the call to Graph into GraphBP
SidebarBP.prototype.showTooltip = function(elt, cells, w, h, title, showLabel)
{
    if (this.enableTooltips && this.showTooltips)
    {
        if (this.currentElt != elt)
        {
            if (this.thread != null)
            {
                window.clearTimeout(this.thread);
                this.thread = null;
            }

            var show = mxUtils.bind(this, function()
            {
                // Lazy creation of the DOM nodes and graph instance
                if (this.tooltip == null)
                {
                    this.tooltip = document.createElement('div');
                    this.tooltip.className = 'geSidebarTooltip';
                    this.tooltip.style.zIndex = mxPopupMenu.prototype.zIndex - 1;
                    document.body.appendChild(this.tooltip);

                    this.graph2 = new GraphBP(this.tooltip, null, null, this.editorUi.editor.graph.getStylesheet());
                    this.graph2.resetViewOnRootChange = false;
                    this.graph2.foldingEnabled = false;
                    this.graph2.gridEnabled = false;
                    this.graph2.autoScroll = false;
                    this.graph2.setTooltips(false);
                    this.graph2.setConnectable(false);
                    this.graph2.setEnabled(false);

                    if (!mxClient.IS_SVG)
                    {
                        this.graph2.view.canvas.style.position = 'relative';
                    }
                }

                this.graph2.model.clear();
                this.graph2.view.setTranslate(this.tooltipBorder, this.tooltipBorder);

                if (w > this.maxTooltipWidth || h > this.maxTooltipHeight)
                {
                    this.graph2.view.scale = Math.round(Math.min(this.maxTooltipWidth / w, this.maxTooltipHeight / h) * 100) / 100;
                }
                else
                {
                    this.graph2.view.scale = 1;
                }

                this.tooltip.style.display = 'block';
                this.graph2.labelsVisible = (showLabel == null || showLabel);
                var fo = mxClient.NO_FO;
                mxClient.NO_FO = Editor.prototype.originalNoForeignObject;
                this.graph2.addCells(cells);
                mxClient.NO_FO = fo;

                var bounds = this.graph2.getGraphBounds();
                var width = bounds.width + 2 * this.tooltipBorder + 4;
                var height = bounds.height + 2 * this.tooltipBorder;

                if (mxClient.IS_QUIRKS)
                {
                    height += 4;
                    this.tooltip.style.overflow = 'hidden';
                }
                else
                {
                    this.tooltip.style.overflow = 'visible';
                }

                this.tooltip.style.width = width + 'px';
                var w2 = width;

                // Adds title for entry
                if (this.tooltipTitles && title != null && title.length > 0)
                {
                    if (this.tooltipTitle == null)
                    {
                        this.tooltipTitle = document.createElement('div');
                        this.tooltipTitle.style.borderTop = '1px solid gray';
                        this.tooltipTitle.style.textAlign = 'center';
                        this.tooltipTitle.style.width = '100%';
                        this.tooltipTitle.style.overflow = 'hidden';
                        this.tooltipTitle.style.position = 'absolute';
                        this.tooltipTitle.style.paddingTop = '6px';
                        this.tooltipTitle.style.bottom = '20px';

                        this.tooltip.appendChild(this.tooltipTitle);
                    }
                    else
                    {
                        this.tooltipTitle.innerHTML = '';
                    }

                    this.tooltipTitle.style.display = '';
                    mxUtils.write(this.tooltipTitle, title);

                    // Allows for wider labels
                    w2 = Math.min(this.maxTooltipWidth, Math.max(width, this.tooltipTitle.scrollWidth + 4));
                    var ddy = this.tooltipTitle.offsetHeight + 10;
                    height += ddy;

                    if (mxClient.IS_SVG)
                    {
                        this.tooltipTitle.style.marginTop = (2 - ddy) + 'px';
                    }
                    else
                    {
                        height -= 6;
                        this.tooltipTitle.style.top = (height - ddy) + 'px';
                    }
                }
                else if (this.tooltipTitle != null && this.tooltipTitle.parentNode != null)
                {
                    this.tooltipTitle.style.display = 'none';
                }

                // Updates width if label is wider
                if (w2 > width)
                {
                    this.tooltip.style.width = w2 + 'px';
                }

                this.tooltip.style.height = height + 'px';
                var x0 = -Math.round(bounds.x - this.tooltipBorder) + (w2 - width) / 2;
                var y0 = -Math.round(bounds.y - this.tooltipBorder);

                var b = document.body;
                var d = document.documentElement;
                var off = this.getTooltipOffset();
                var bottom = Math.max(b.clientHeight || 0, d.clientHeight);
                var left = this.container.clientWidth + this.editorUi.splitSize + 3 + this.editorUi.container.offsetLeft + off.x;
                var top = Math.min(bottom - height - 20 /*status bar*/, Math.max(0, (this.editorUi.container.offsetTop +
                    this.container.offsetTop + elt.offsetTop - this.container.scrollTop - height / 2 + 16))) + off.y;

                if (mxClient.IS_SVG)
                {
                    if (x0 != 0 || y0 != 0)
                    {
                        this.graph2.view.canvas.setAttribute('transform', 'translate(' + x0 + ',' + y0 + ')');
                    }
                    else
                    {
                        this.graph2.view.canvas.removeAttribute('transform');
                    }
                }
                else
                {
                    this.graph2.view.drawPane.style.left = x0 + 'px';
                    this.graph2.view.drawPane.style.top = y0 + 'px';
                }

                // Workaround for ignored position CSS style in IE9
                // (changes to relative without the following line)
                this.tooltip.style.position = 'absolute';
                this.tooltip.style.left = left + 'px';
                this.tooltip.style.top = top + 'px';
            });

            if (this.tooltip != null && this.tooltip.style.display != 'none')
            {
                show();
            }
            else
            {
                this.thread = window.setTimeout(show, this.tooltipDelay);
            }

            this.currentElt = elt;
        }
    }
};

//initial shape attributes
SidebarBP.prototype.setCellAttributes = function(value, geometry, style, type, bpCell, visible){
    let cell = new mxCell(value, geometry, style);
    cell.vertex = true;
    cell.bp_type = type;
    cell.selectable = bpCell;
    cell.bp_cell = bpCell;
    cell.visible = visible ;
    return cell;
};

// create bp shape
SidebarBP.prototype.createBPShape = function(name, shape)
{
    // data
    let textGeometry = new mxGeometry(0, mxGraph.headLineSize, 0, 0);
    let textStyle = 'text;fillColor=none;align=left;verticalAlign=top;overflow=hidden;rotatable=0;points=[];part=1;resizeParent=1;';
    let data = this.setCellAttributes('', textGeometry,textStyle,'data',false, true);

    // divider line
    let dividerGeometry = new mxGeometry(0, mxGraph.headLineSize * 0.7, 160, 8);
    let lineStyle = 'line;strokeWidth=1;fillColor=none;align=left;verticalAlign=middle;rotatable=0;points=[];part=1;resizeParent=1;connectable=0;';
    let divider = this.setCellAttributes('', dividerGeometry,lineStyle,'divider',false, true);

    // payload
    let payloadGeometry = new mxGeometry(0, mxGraph.headLineSize * 2, 160, 8);
    let payload = this.setCellAttributes('', payloadGeometry, textStyle,'payloads', false, false);

    // divider line 2
    let divider2Geometry = new mxGeometry(0, mxGraph.headLineSize * 2, 160, 8);
    let divider2 = this.setCellAttributes('', divider2Geometry, lineStyle, 'divider2', false, false);

    // shape
    let cellStyle = 'shape=' + shape + ';fontStyle=1;align=center;verticalAlign=top;horizontal=1;startSize=26;resizeParent=1;resizeLast=0;collapsible=1;rotatable=0;';
    let cellGeometry = new mxGeometry(0, 0, 160, 90);
    let cell = this.setCellAttributes(name, cellGeometry,cellStyle,name,true, true);

    cell.insert(divider);
    cell.insert(data);
    cell.insert(payload);
    cell.insert(divider2);

    return cell;
};

// Adds all bp shapes palette to the sidebar.
SidebarBP.prototype.addFlowBPPalette = function()
{
    var sb = this;

    var fns = [

        this.addEntry('start', function()
        {
            var cell = new mxCell(name, new mxGeometry(0, 0, 60, 60), 'shape=flow.startnode;whiteSpace=wrap;html=1;');
            cell.vertex = true;
            cell.bp_type = 'startnode';
            cell.bp_cell = true;
            return sb.createVertexTemplateFromCells([cell], cell.geometry.width, cell.geometry.height, 'Start Node');
        }),

               this.addEntry('bsync', function()
        {
            var cell = sb.createBPShape('BSync', 'flow.bsync');
            return sb.createVertexTemplateFromCells([cell], cell.geometry.width, cell.geometry.height, 'BSync');
        }),

        this.addEntry('general', function()
        {
            var cell = sb.createBPShape('General', 'flow.general');
            return sb.createVertexTemplateFromCells([cell], cell.geometry.width, cell.geometry.height, 'General');
        }),

        this.addEntry('console', function()
        {
            var cell = sb.createBPShape('Console', 'flow.console');
            return sb.createVertexTemplateFromCells([cell], cell.geometry.width, cell.geometry.height, 'Console');
        }),

    ];

    this.addPaletteFunctions('Flow', 'Flow',  false, fns);
};



// Limits drop style to non-transparent source shapes
Sidebar.prototype.isDropStyleEnabled = function(cells, firstVertex)
{
    return false;
};

SidebarBP.prototype.createDragSource = function(elt, dropHandler, preview, cells, bounds)
{
    // Checks if the cells contain any vertices
    var ui = this.editorUi;
    var graph = ui.editor.graph;
    var freeSourceEdge = null;
    var firstVertex = null;
    var sidebar = this;

    for (var i = 0; i < cells.length; i++)
    {
        if (firstVertex == null && this.editorUi.editor.graph.model.isVertex(cells[i]))
        {
            firstVertex = i;
        }
        else if (freeSourceEdge == null && this.editorUi.editor.graph.model.isEdge(cells[i]) &&
            this.editorUi.editor.graph.model.getTerminal(cells[i], true) == null)
        {
            freeSourceEdge = i;
        }

        if (firstVertex != null && freeSourceEdge != null)
        {
            break;
        }
    }

    var dropStyleEnabled = this.isDropStyleEnabled(cells, firstVertex);

    var dragSource = mxUtils.makeDraggable(elt, this.editorUi.editor.graph, mxUtils.bind(this, function(graph, evt, target, x, y)
    {
        if (this.updateThread != null)
        {
            window.clearTimeout(this.updateThread);
        }

        if (cells != null && currentStyleTarget != null && activeArrow == styleTarget)
        {
            var tmp = graph.isCellSelected(currentStyleTarget.cell) ? graph.getSelectionCells() : [currentStyleTarget.cell];
            var updatedCells = this.updateShapes((graph.model.isEdge(currentStyleTarget.cell)) ? cells[0] : cells[firstVertex], tmp);
            graph.setSelectionCells(updatedCells);
        }
        else if (cells != null && activeArrow != null && currentTargetState != null && activeArrow != styleTarget)
        {
            var index = (graph.model.isEdge(currentTargetState.cell) || freeSourceEdge == null) ? firstVertex : freeSourceEdge;
            graph.setSelectionCells(this.dropAndConnect(currentTargetState.cell, cells, direction, index, evt));
        }
        else
        {
            dropHandler.apply(this, arguments);
        }

        if (this.editorUi.hoverIcons != null)
        {
            this.editorUi.hoverIcons.update(graph.view.getState(graph.getSelectionCell()));
        }
    }), preview, 0, 0, graph.autoscroll, true, true);

    // Stops dragging if cancel is pressed
    graph.addListener(mxEvent.ESCAPE, function(sender, evt)
    {
        if (dragSource.isActive())
        {
            dragSource.reset();
        }
    });

    // Overrides mouseDown to ignore popup triggers
    var mouseDown = dragSource.mouseDown;

    dragSource.mouseDown = function(evt)
    {
        if (!mxEvent.isPopupTrigger(evt) && !mxEvent.isMultiTouchEvent(evt))
        {
            graph.stopEditing();
            mouseDown.apply(this, arguments);
        }
    };

    // Workaround for event redirection via image tag in quirks and IE8
    function createArrow(img, tooltip)
    {
        var arrow = null;

        if (mxClient.IS_IE && !mxClient.IS_SVG)
        {
            // Workaround for PNG images in IE6
            if (mxClient.IS_IE6 && document.compatMode != 'CSS1Compat')
            {
                arrow = document.createElement(mxClient.VML_PREFIX + ':image');
                arrow.setAttribute('src', img.src);
                arrow.style.borderStyle = 'none';
            }
            else
            {
                arrow = document.createElement('div');
                arrow.style.backgroundImage = 'url(' + img.src + ')';
                arrow.style.backgroundPosition = 'center';
                arrow.style.backgroundRepeat = 'no-repeat';
            }

            arrow.style.width = (img.width + 4) + 'px';
            arrow.style.height = (img.height + 4) + 'px';
            arrow.style.display = (mxClient.IS_QUIRKS) ? 'inline' : 'inline-block';
        }
        else
        {
            arrow = mxUtils.createImage(img.src);
            arrow.style.width = img.width + 'px';
            arrow.style.height = img.height + 'px';
        }

        if (tooltip != null)
        {
            arrow.setAttribute('title', tooltip);
        }

        mxUtils.setOpacity(arrow, (img == this.refreshTarget) ? 30 : 20);
        arrow.style.position = 'absolute';
        arrow.style.cursor = 'crosshair';

        return arrow;
    };

    var currentTargetState = null;
    var currentStateHandle = null;
    var currentStyleTarget = null;
    var activeTarget = false;

    var arrowUp = createArrow(this.triangleUp, mxResources.get('connect'));
    var arrowRight = createArrow(this.triangleRight, mxResources.get('connect'));
    var arrowDown = createArrow(this.triangleDown, mxResources.get('connect'));
    var arrowLeft = createArrow(this.triangleLeft, mxResources.get('connect'));
    var styleTarget = createArrow(this.refreshTarget, mxResources.get('replace'));
    // Workaround for actual parentNode not being updated in old IE
    var styleTargetParent = null;
    var roundSource = createArrow(this.roundDrop);
    var roundTarget = createArrow(this.roundDrop);
    var direction = mxConstants.DIRECTION_NORTH;
    var activeArrow = null;

    function checkArrow(x, y, bounds, arrow)
    {
        if (arrow.parentNode != null)
        {
            if (mxUtils.contains(bounds, x, y))
            {
                mxUtils.setOpacity(arrow, 100);
                activeArrow = arrow;
            }
            else
            {
                mxUtils.setOpacity(arrow, (arrow == styleTarget) ? 30 : 20);
            }
        }

        return bounds;
    };

    // Hides guides and preview if target is active
    var dsCreatePreviewElement = dragSource.createPreviewElement;

    // Stores initial size of preview element
    dragSource.createPreviewElement = function(graph)
    {
        var elt = dsCreatePreviewElement.apply(this, arguments);

        // Pass-through events required to tooltip on replace shape
        if (mxClient.IS_SVG)
        {
            elt.style.pointerEvents = 'none';
        }

        this.previewElementWidth = elt.style.width;
        this.previewElementHeight = elt.style.height;

        return elt;
    };

    // Shows/hides hover icons
    var dragEnter = dragSource.dragEnter;
    dragSource.dragEnter = function(graph, evt)
    {
        if (ui.hoverIcons != null)
        {
            ui.hoverIcons.setDisplay('none');
        }

        // dragEnter.apply(this, arguments);
    };

    var dragExit = dragSource.dragExit;
    dragSource.dragExit = function(graph, evt)
    {
        if (ui.hoverIcons != null)
        {
            ui.hoverIcons.setDisplay('');
        }

        dragExit.apply(this, arguments);
    };

    dragSource.dragOver = function(graph, evt)
    {
        mxDragSource.prototype.dragOver.apply(this, arguments);

        if (this.currentGuide != null && activeArrow != null)
        {
            this.currentGuide.hide();
        }

        if (this.previewElement != null)
        {
            var view = graph.view;

            if (currentStyleTarget != null && activeArrow == styleTarget)
            {
                this.previewElement.style.display = (graph.model.isEdge(currentStyleTarget.cell)) ? 'none' : '';

                this.previewElement.style.left = currentStyleTarget.x + 'px';
                this.previewElement.style.top = currentStyleTarget.y + 'px';
                this.previewElement.style.width = currentStyleTarget.width + 'px';
                this.previewElement.style.height = currentStyleTarget.height + 'px';
            }
            else
                if (currentTargetState != null && activeArrow != null)
            {
                var index = (graph.model.isEdge(currentTargetState.cell) || freeSourceEdge == null) ? firstVertex : freeSourceEdge;
                var geo = sidebar.getDropAndConnectGeometry(currentTargetState.cell, cells[index], direction, cells);
                var geo2 = (!graph.model.isEdge(currentTargetState.cell)) ? graph.getCellGeometry(currentTargetState.cell) : null;
                var geo3 = graph.getCellGeometry(cells[index]);
                var parent = graph.model.getParent(currentTargetState.cell);
                var dx = view.translate.x * view.scale;
                var dy = view.translate.y * view.scale;

                if (geo2 != null && !geo2.relative && graph.model.isVertex(parent) && parent != view.currentRoot)
                {
                    var pState = view.getState(parent);

                    dx = pState.x;
                    dy = pState.y;
                }

                var dx2 = geo3.x;
                var dy2 = geo3.y;

                // Ignores geometry of edges
                if (graph.model.isEdge(cells[index]))
                {
                    dx2 = 0;
                    dy2 = 0;
                }

                // Shows preview at drop location
                this.previewElement.style.left = ((geo.x - dx2) * view.scale + dx) + 'px';
                this.previewElement.style.top = ((geo.y - dy2) * view.scale + dy) + 'px';

                if (cells.length == 1)
                {
                    this.previewElement.style.width = (geo.width * view.scale) + 'px';
                    this.previewElement.style.height = (geo.height * view.scale) + 'px';
                }

                this.previewElement.style.display = '';
            }
            else if (dragSource.currentHighlight.state != null &&
                graph.model.isEdge(dragSource.currentHighlight.state.cell))
            {
                // Centers drop cells when splitting edges
                this.previewElement.style.left = Math.round(parseInt(this.previewElement.style.left) -
                    bounds.width * view.scale / 2) + 'px';
                this.previewElement.style.top = Math.round(parseInt(this.previewElement.style.top) -
                    bounds.height * view.scale / 2) + 'px';
            }
            else
            {
                this.previewElement.style.width = this.previewElementWidth;
                this.previewElement.style.height = this.previewElementHeight;
                this.previewElement.style.display = '';
            }
        }
    };

    var startTime = new Date().getTime();
    var timeOnTarget = 0;
    var prev = null;

    // Gets source cell style to compare shape below
    var sourceCellStyle = this.editorUi.editor.graph.getCellStyle(cells[0]);

    // Allows drop into cell only if target is a valid root
    dragSource.getDropTarget = mxUtils.bind(this, function(graph, x, y, evt)
    {
        // Alt means no targets at all
        // LATER: Show preview where result will go
        var cell = (!mxEvent.isAltDown(evt) && cells != null) ? graph.getCellAt(x, y) : null;

        // Uses connectable parent vertex if one exists
        if (cell != null && !this.graph.isCellConnectable(cell))
        {
            var parent = this.graph.getModel().getParent(cell);

            if (this.graph.getModel().isVertex(parent) && this.graph.isCellConnectable(parent))
            {
                cell = parent;
            }
        }

        // Ignores locked cells
        if (graph.isCellLocked(cell))
        {
            cell = null;
        }

        var state = graph.view.getState(cell);
        activeArrow = null;
        var bbox = null;

        // Time on target
        if (prev != state)
        {
            prev = state;
            startTime = new Date().getTime();
            timeOnTarget = 0;

            if (this.updateThread != null)
            {
                window.clearTimeout(this.updateThread);
            }

            if (state != null)
            {
                this.updateThread = window.setTimeout(function()
                {
                    if (activeArrow == null)
                    {
                        prev = state;
                        dragSource.getDropTarget(graph, x, y, evt);
                    }
                }, this.dropTargetDelay + 10);
            }
        }
        else
        {
            timeOnTarget = new Date().getTime() - startTime;
        }

        // Shift means disabled, delayed on cells with children, shows after this.dropTargetDelay, hides after 2500ms
        if (dropStyleEnabled && (timeOnTarget < 2500) && state != null && !mxEvent.isShiftDown(evt) &&
            // If shape is equal or target has no stroke, fill and gradient then use longer delay except for images
            (((mxUtils.getValue(state.style, mxConstants.STYLE_SHAPE) != mxUtils.getValue(sourceCellStyle, mxConstants.STYLE_SHAPE) &&
                (mxUtils.getValue(state.style, mxConstants.STYLE_STROKECOLOR, mxConstants.NONE) != mxConstants.NONE ||
                    mxUtils.getValue(state.style, mxConstants.STYLE_FILLCOLOR, mxConstants.NONE) != mxConstants.NONE ||
                    mxUtils.getValue(state.style, mxConstants.STYLE_GRADIENTCOLOR, mxConstants.NONE) != mxConstants.NONE)) ||
                mxUtils.getValue(sourceCellStyle, mxConstants.STYLE_SHAPE) == 'image') ||
                timeOnTarget > 1500 || graph.model.isEdge(state.cell)) && (timeOnTarget > this.dropTargetDelay) &&
            !this.isDropStyleTargetIgnored(state) && ((graph.model.isVertex(state.cell) && firstVertex != null) ||
                (graph.model.isEdge(state.cell) && graph.model.isEdge(cells[0]))))
        {
            currentStyleTarget = state;
            var tmp = (graph.model.isEdge(state.cell)) ? graph.view.getPoint(state) :
                new mxPoint(state.getCenterX(), state.getCenterY());
            tmp = new mxRectangle(tmp.x - this.refreshTarget.width / 2, tmp.y - this.refreshTarget.height / 2,
                this.refreshTarget.width, this.refreshTarget.height);

            styleTarget.style.left = Math.floor(tmp.x) + 'px';
            styleTarget.style.top = Math.floor(tmp.y) + 'px';

            if (styleTargetParent == null)
            {
                graph.container.appendChild(styleTarget);
                styleTargetParent = styleTarget.parentNode;
            }

            checkArrow(x, y, tmp, styleTarget);
        }
        // Does not reset on ignored edges
        // else if (currentStyleTarget == null || !mxUtils.contains(currentStyleTarget, x, y) ||
        //     (timeOnTarget > 1500 && !mxEvent.isShiftDown(evt)))
        // {
        //     currentStyleTarget = null;
        //
        //     if (styleTargetParent != null)
        //     {
        //         styleTarget.parentNode.removeChild(styleTarget);
        //         styleTargetParent = null;
        //     }
        // }
        // else if (currentStyleTarget != null && styleTargetParent != null)
        // {
        //     // Sets active Arrow as side effect
        //     var tmp = (graph.model.isEdge(currentStyleTarget.cell)) ? graph.view.getPoint(currentStyleTarget) : new mxPoint(currentStyleTarget.getCenterX(), currentStyleTarget.getCenterY());
        //     tmp = new mxRectangle(tmp.x - this.refreshTarget.width / 2, tmp.y - this.refreshTarget.height / 2,
        //         this.refreshTarget.width, this.refreshTarget.height);
        //     checkArrow(x, y, tmp, styleTarget);
        // }

        // Checks if inside bounds
        if (activeTarget && currentTargetState != null && !mxEvent.isAltDown(evt) && activeArrow == null)
        {
            // LATER: Use hit-detection for edges
            bbox = mxRectangle.fromRectangle(currentTargetState);

            if (graph.model.isEdge(currentTargetState.cell))
            {
                var pts = currentTargetState.absolutePoints;

                if (roundSource.parentNode != null)
                {
                    var p0 = pts[0];
                    bbox.add(checkArrow(x, y, new mxRectangle(p0.x - this.roundDrop.width / 2,
                        p0.y - this.roundDrop.height / 2, this.roundDrop.width, this.roundDrop.height), roundSource));
                }

                if (roundTarget.parentNode != null)
                {
                    var pe = pts[pts.length - 1];
                    bbox.add(checkArrow(x, y, new mxRectangle(pe.x - this.roundDrop.width / 2,
                        pe.y - this.roundDrop.height / 2,
                        this.roundDrop.width, this.roundDrop.height), roundTarget));
                }
            }
            else
            {
                var bds = mxRectangle.fromRectangle(currentTargetState);

                // Uses outer bounding box to take rotation into account
                if (currentTargetState.shape != null && currentTargetState.shape.boundingBox != null)
                {
                    bds = mxRectangle.fromRectangle(currentTargetState.shape.boundingBox);
                }

                bds.grow(this.graph.tolerance);
                bds.grow(HoverIcons.prototype.arrowSpacing);

                var handler = this.graph.selectionCellsHandler.getHandler(currentTargetState.cell);

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
                        bds.add(handler.rotationShape.boundingBox);
                    }
                }

                bbox.add(checkArrow(x, y, new mxRectangle(currentTargetState.getCenterX() - this.triangleUp.width / 2,
                    bds.y - this.triangleUp.height, this.triangleUp.width, this.triangleUp.height), arrowUp));
                bbox.add(checkArrow(x, y, new mxRectangle(bds.x + bds.width,
                    currentTargetState.getCenterY() - this.triangleRight.height / 2,
                    this.triangleRight.width, this.triangleRight.height), arrowRight));
                bbox.add(checkArrow(x, y, new mxRectangle(currentTargetState.getCenterX() - this.triangleDown.width / 2,
                    bds.y + bds.height, this.triangleDown.width, this.triangleDown.height), arrowDown));
                bbox.add(checkArrow(x, y, new mxRectangle(bds.x - this.triangleLeft.width,
                    currentTargetState.getCenterY() - this.triangleLeft.height / 2,
                    this.triangleLeft.width, this.triangleLeft.height), arrowLeft));
            }

            // Adds tolerance
            if (bbox != null)
            {
                bbox.grow(10);
            }
        }

        direction = mxConstants.DIRECTION_NORTH;

        if (activeArrow == arrowRight)
        {
            direction = mxConstants.DIRECTION_EAST;
        }
        else if (activeArrow == arrowDown || activeArrow == roundTarget)
        {
            direction = mxConstants.DIRECTION_SOUTH;
        }
        else if (activeArrow == arrowLeft)
        {
            direction = mxConstants.DIRECTION_WEST;
        }

        if (currentStyleTarget != null && activeArrow == styleTarget)
        {
            state = currentStyleTarget;
        }

        var validTarget = (firstVertex == null || graph.isCellConnectable(cells[firstVertex])) &&
            ((graph.model.isEdge(cell) && firstVertex != null) ||
                (graph.model.isVertex(cell) && graph.isCellConnectable(cell)));

        // Drop arrows shown after this.dropTargetDelay, hidden after 5 secs, switches arrows after 500ms
        if ((currentTargetState != null && timeOnTarget >= 5000) ||
            (currentTargetState != state &&
                (bbox == null || !mxUtils.contains(bbox, x, y) ||
                    (timeOnTarget > 500 && activeArrow == null && validTarget))))
        {
            activeTarget = false;
            currentTargetState = ((timeOnTarget < 5000 && timeOnTarget > this.dropTargetDelay) || graph.model.isEdge(cell)) ? state : null;

            if (currentTargetState != null && validTarget)
            {
                var elts = [roundSource, roundTarget, arrowUp, arrowRight, arrowDown, arrowLeft];

                for (var i = 0; i < elts.length; i++)
                {
                    if (elts[i].parentNode != null)
                    {
                        elts[i].parentNode.removeChild(elts[i]);
                    }
                }

                if (graph.model.isEdge(cell))
                {
                    var pts = state.absolutePoints;

                    if (pts != null)
                    {
                        var p0 = pts[0];
                        var pe = pts[pts.length - 1];
                        var tol = graph.tolerance;
                        var box = new mxRectangle(x - tol, y - tol, 2 * tol, 2 * tol);

                        roundSource.style.left = Math.floor(p0.x - this.roundDrop.width / 2) + 'px';
                        roundSource.style.top = Math.floor(p0.y - this.roundDrop.height / 2) + 'px';

                        roundTarget.style.left = Math.floor(pe.x - this.roundDrop.width / 2) + 'px';
                        roundTarget.style.top = Math.floor(pe.y - this.roundDrop.height / 2) + 'px';

                        if (graph.model.getTerminal(cell, true) == null)
                        {
                            graph.container.appendChild(roundSource);
                        }

                        if (graph.model.getTerminal(cell, false) == null)
                        {
                            graph.container.appendChild(roundTarget);
                        }
                    }
                }
                else
                {
                    var bds = mxRectangle.fromRectangle(state);

                    // Uses outer bounding box to take rotation into account
                    if (state.shape != null && state.shape.boundingBox != null)
                    {
                        bds = mxRectangle.fromRectangle(state.shape.boundingBox);
                    }

                    bds.grow(this.graph.tolerance);
                    bds.grow(HoverIcons.prototype.arrowSpacing);

                    var handler = this.graph.selectionCellsHandler.getHandler(state.cell);

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
                            bds.add(handler.rotationShape.boundingBox);
                        }
                    }

                    arrowUp.style.left = Math.floor(state.getCenterX() - this.triangleUp.width / 2) + 'px';
                    arrowUp.style.top = Math.floor(bds.y - this.triangleUp.height) + 'px';

                    arrowRight.style.left = Math.floor(bds.x + bds.width) + 'px';
                    arrowRight.style.top = Math.floor(state.getCenterY() - this.triangleRight.height / 2) + 'px';

                    arrowDown.style.left = arrowUp.style.left
                    arrowDown.style.top = Math.floor(bds.y + bds.height) + 'px';

                    arrowLeft.style.left = Math.floor(bds.x - this.triangleLeft.width) + 'px';
                    arrowLeft.style.top = arrowRight.style.top;

                    if (state.style['portConstraint'] != 'eastwest')
                    {
                        graph.container.appendChild(arrowUp);
                        graph.container.appendChild(arrowDown);
                    }

                    graph.container.appendChild(arrowRight);
                    graph.container.appendChild(arrowLeft);
                }

                // Hides handle for cell under mouse
                if (state != null)
                {
                    currentStateHandle = graph.selectionCellsHandler.getHandler(state.cell);

                    if (currentStateHandle != null && currentStateHandle.setHandlesVisible != null)
                    {
                        currentStateHandle.setHandlesVisible(false);
                    }
                }

                activeTarget = true;
            }
            else
            {
                var elts = [roundSource, roundTarget, arrowUp, arrowRight, arrowDown, arrowLeft];

                for (var i = 0; i < elts.length; i++)
                {
                    if (elts[i].parentNode != null)
                    {
                        elts[i].parentNode.removeChild(elts[i]);
                    }
                }
            }
        }

        if (!activeTarget && currentStateHandle != null)
        {
            currentStateHandle.setHandlesVisible(true);
        }

        // Handles drop target
        var target = ((!mxEvent.isAltDown(evt) || mxEvent.isShiftDown(evt)) &&
            !(currentStyleTarget != null && activeArrow == styleTarget)) ?
            mxDragSource.prototype.getDropTarget.apply(this, arguments) : null;
        var model = graph.getModel();

        if (target != null)
        {
            if (activeArrow != null || !graph.isSplitTarget(target, cells, evt))
            {
                // Selects parent group as drop target
                while (target != null && !graph.isValidDropTarget(target, cells, evt) && model.isVertex(model.getParent(target)))
                {
                    target = model.getParent(target);
                }

                if (graph.view.currentRoot == target || (!graph.isValidRoot(target) &&
                    graph.getModel().getChildCount(target) == 0) ||
                    graph.isCellLocked(target) || model.isEdge(target))
                {
                    target = null;
                }
            }
        }

        return target;
    });

    dragSource.stopDrag = function()
    {
        mxDragSource.prototype.stopDrag.apply(this, arguments);

        var elts = [roundSource, roundTarget, styleTarget, arrowUp, arrowRight, arrowDown, arrowLeft];

        for (var i = 0; i < elts.length; i++)
        {
            if (elts[i].parentNode != null)
            {
                elts[i].parentNode.removeChild(elts[i]);
            }
        }

        if (currentTargetState != null && currentStateHandle != null)
        {
            currentStateHandle.reset();
        }

        currentStateHandle = null;
        currentTargetState = null;
        currentStyleTarget = null;
        styleTargetParent = null;
        activeArrow = null;
    };

    return dragSource;
};