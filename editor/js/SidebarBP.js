SidebarBP = function(editorUi, container)
{
    Sidebar.call(this,editorUi,container);
};

SidebarBP.prototype = Object.create(Sidebar.prototype);

/**
 * Adds all palettes to the sidebar.
 */

SidebarBP.prototype.init = function()
{
    var dir = STENCIL_PATH;

    this.addSearchPalette(true);

    this.addFlowBPPalette();

};


/**
 * Specifies the width of the thumbnails.
 */
SidebarBP.prototype.thumbWidth = 92;

/**
 * Specifies the height of the thumbnails.
 */
SidebarBP.prototype.thumbHeight = 92;

/**
 * Specifies the width of the thumbnails.
 */
SidebarBP.prototype.minThumbStrokeWidth = 0;

/**
 * Specifies the width of the thumbnails.
 */
SidebarBP.prototype.thumbAntiAlias = false;

/**
 * Specifies the padding for the thumbnails. Default is 3.
 */
SidebarBP.prototype.thumbPadding = 1;

/**
 * Specifies the delay for the tooltip. Default is 2 px.
 */
SidebarBP.prototype.thumbBorder = 2;


SidebarBP.prototype.defaultImageWidth = 150;

/**
 * Specifies the height for clipart images. Default is 80.
 */
SidebarBP.prototype.defaultImageHeight = 100;

/**
 * Adds all palettes to the SidebarBP.
 */
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

// create bp shape
SidebarBP.prototype.createBPShape = function(name, shape)
{
    //initial cells
    var data = new mxCell('empty', new mxGeometry(0, 25, 160, 90), 'text;fillColor=none;align=left;verticalAlign=top;overflow=hidden;rotatable=0;points=[];part=1;connectable=0;');
    data.vertex = true;
    data.selectable = false;
    data.bp_type = 'data';
    data.bp_cell = false;
    // data.connectable = false;

    // divider line
    var divider = new mxCell('', new mxGeometry(0, 50, 160, 8), 'line;strokeWidth=1;fillColor=none;align=left;verticalAlign=middle;rotatable=0;points=[];part=1;connectable=0;');
    divider.vertex = true;
    divider.selectable = false;
    divider.bp_type = 'divider';
    divider.visible = false;
    divider.bp_cell = false;
    // divider.connectable = false;

    var payload = this.cloneCell(data, 'payloads');
    payload.geometry.y = 55;
    payload.bp_type = 'payloads';
    payload.visible = false;
    payload.bp_cell = false;
    // payload.connectable = false;


    var cellStyle = 'shape=' + shape + ';swimlane;fontStyle=1;align=center;verticalAlign=top;horizontal=1;startSize=26;horizontalStack=0;resizeParent=1;resizeLast=0;collapsible=1;marginBottom=0;rotatable=0;';

    // shape
    var cell = new mxCell(name, new mxGeometry(0, 0, 160, 90), cellStyle);
    cell.vertex = true;
    cell.bp_cell = true;
    cell.bp_type = name;

    cell.insert(data);
    cell.insert(divider);
    cell.insert(payload);

    return cell;

};

/**
 * Adds the general palette to the sidebar.
 */
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
