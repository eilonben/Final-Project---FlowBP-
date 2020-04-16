SidebarBP = function(editorUi, container)
{
    Sidebar.call(this,editorUi,container);
};

SidebarBP.prototype = Object.create(Sidebar.prototype);
SidebarBP.prototype.init = function(){
        var dir = STENCIL_PATH;

        this.addSearchPalette(true);
        // this.addGeneralPalette(true);
        // this.addMiscPalette(false);
// this.addAdvancedPalette(false);

// this.addBasicPalette(dir);
        // this.addStencilPalette('arrows', mxResources.get('arrows'), dir +
        // '/arrows.xml',
        // ';whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=2');
        // this.addUmlPalette(false);
// this.addBpmnPalette(dir, false);

        this.addStencilPalette('flow', 'Flow', dir + '/flow.xml',
            ';whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=2');
        /*	this.addStencilPalette('flowchart', 'Flowchart', dir + '/flowchart.xml',
            ';whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=2');*/

// this.addImagePalette('clipart', mxResources.get('clipart'), dir +
// '/clipart/', '_128x128.png',
// ['Earth_globe', 'Empty_Folder', 'Full_Folder', 'Gear', 'Lock', 'Software',
// 'Virus', 'Email',
// 'Database', 'Router_Icon', 'iPad', 'iMac', 'Laptop', 'MacBook',
// 'Monitor_Tower', 'Printer',
// 'Server_Tower', 'Workstation', 'Firewall_02', 'Wireless_Router_N',
// 'Credit_Card',
// 'Piggy_Bank', 'Graph', 'Safe', 'Shopping_Cart', 'Suit1', 'Suit2', 'Suit3',
// 'Pilot1',
// 'Worker1', 'Soldier1', 'Doctor1', 'Tech1', 'Security1', 'Telesales1'], null,
// {'Wireless_Router_N': 'wireless router switch wap wifi access point wlan',
// 'Router_Icon': 'router switch'});
};


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
                        this.tooltipTitle.style.bottom = '6px';

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


// SidebarBP.prototype.constructor = Sidebar;