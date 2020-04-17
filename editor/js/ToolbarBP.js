ToolbarBP = function (editorUi, container) {
    Toolbar.call(this, editorUi, container);
};

ToolbarBP.prototype = Object.create(Toolbar.prototype);
ToolbarBP.prototype.init = function () {

    var sw = screen.width;
    // Takes into account initial compact mode
    sw -= (screen.height > 740) ? 56 : 0;

    if (sw >= 700) {
        var formatMenu = this.addMenu('', mxResources.get('view') + ' (' + mxResources.get('panTooltip') + ')', true, 'viewPanels', null, true);
        this.addDropDownArrow(formatMenu, 'geSprite-formatpanel', 38, 50, -4, -3, 36, -8);
        this.addSeparator();
    }

    var viewMenu = this.addMenu('', mxResources.get('zoom') + ' (Alt+Mousewheel)', true, 'viewZoom', null, true);
    viewMenu.showDisabled = true;
    viewMenu.style.whiteSpace = 'nowrap';
    viewMenu.style.position = 'relative';
    viewMenu.style.overflow = 'hidden';

    if (EditorUi.compactUi) {
        viewMenu.style.width = (mxClient.IS_QUIRKS) ? '58px' : '50px';
    }
    else {
        viewMenu.style.width = (mxClient.IS_QUIRKS) ? '62px' : '36px';
    }

    if (sw >= 420) {
        this.addSeparator();
        var elts = this.addItems(['zoomIn', 'zoomOut']);
        elts[0].setAttribute('title', mxResources.get('zoomIn') + ' (' + this.editorUi.actions.get('zoomIn').shortcut + ')');
        elts[1].setAttribute('title', mxResources.get('zoomOut') + ' (' + this.editorUi.actions.get('zoomOut').shortcut + ')');
    }

    // Updates the label if the scale changes
    this.updateZoom = mxUtils.bind(this, function () {
        viewMenu.innerHTML = Math.round(this.editorUi.editor.graph.view.scale * 100) + '%' +
            this.dropdownImageHtml;

        if (EditorUi.compactUi) {
            viewMenu.getElementsByTagName('img')[0].style.right = '1px';
            viewMenu.getElementsByTagName('img')[0].style.top = '5px';
        }
    });

    this.editorUi.editor.graph.view.addListener(mxEvent.EVENT_SCALE, this.updateZoom);
    this.editorUi.editor.addListener('resetGraphView', this.updateZoom);

    var elts = this.addItems(['-', 'undo', 'redo']);
    elts[1].setAttribute('title', mxResources.get('undo') + ' (' + this.editorUi.actions.get('undo').shortcut + ')');
    elts[2].setAttribute('title', mxResources.get('redo') + ' (' + this.editorUi.actions.get('redo').shortcut + ')');

    if (sw >= 320) {
        var elts = this.addItems(['-', 'delete','runModel']);
        elts[1].setAttribute('title', mxResources.get('delete') + ' (' + this.editorUi.actions.get('delete').shortcut + ')');
        elts[2].setAttribute('title', mxResources.get('delete') + ' (' + this.editorUi.actions.get('runModel').shortcut + ')');
    }

    if (sw >= 550) {
        this.addItems(['-', 'toFront', 'toBack']);
    }

    if (sw >= 740) {
        this.addItems(['-', 'fillColor']);

        if (sw >= 780) {
            this.addItems(['strokeColor']);

            if (sw >= 820) {
                this.addItems(['shadow']);
            }
        }
    }

    if (sw >= 400) {
        this.addSeparator();

        if (sw >= 440) {
            this.edgeShapeMenu = this.addMenuFunction('', mxResources.get('connection'), false, mxUtils.bind(this, function (menu) {
                this.editorUi.menus.edgeStyleChange(menu, '', [mxConstants.STYLE_SHAPE, 'width'], [null, null], 'geIcon geSprite geSprite-connection', null, true).setAttribute('title', mxResources.get('line'));
                this.editorUi.menus.edgeStyleChange(menu, '', [mxConstants.STYLE_SHAPE, 'width'], ['link', null], 'geIcon geSprite geSprite-linkedge', null, true).setAttribute('title', mxResources.get('link'));
                this.editorUi.menus.edgeStyleChange(menu, '', [mxConstants.STYLE_SHAPE, 'width'], ['flexArrow', null], 'geIcon geSprite geSprite-arrow', null, true).setAttribute('title', mxResources.get('arrow'));
                this.editorUi.menus.edgeStyleChange(menu, '', [mxConstants.STYLE_SHAPE, 'width'], ['arrow', null], 'geIcon geSprite geSprite-simplearrow', null, true).setAttribute('title', mxResources.get('simpleArrow'));
            }));

            this.addDropDownArrow(this.edgeShapeMenu, 'geSprite-connection', 44, 50, 0, 0, 22, -4);
        }

        this.edgeStyleMenu = this.addMenuFunction('geSprite-orthogonal', mxResources.get('waypoints'), false, mxUtils.bind(this, function (menu) {
            this.editorUi.menus.edgeStyleChange(menu, '', [mxConstants.STYLE_EDGE, mxConstants.STYLE_CURVED, mxConstants.STYLE_NOEDGESTYLE], [null, null, null], 'geIcon geSprite geSprite-straight', null, true).setAttribute('title', mxResources.get('straight'));
            this.editorUi.menus.edgeStyleChange(menu, '', [mxConstants.STYLE_EDGE, mxConstants.STYLE_CURVED, mxConstants.STYLE_NOEDGESTYLE], ['orthogonalEdgeStyle', null, null], 'geIcon geSprite geSprite-orthogonal', null, true).setAttribute('title', mxResources.get('orthogonal'));
            this.editorUi.menus.edgeStyleChange(menu, '', [mxConstants.STYLE_EDGE, mxConstants.STYLE_ELBOW, mxConstants.STYLE_CURVED, mxConstants.STYLE_NOEDGESTYLE], ['elbowEdgeStyle', null, null, null], 'geIcon geSprite geSprite-horizontalelbow', null, true).setAttribute('title', mxResources.get('simple'));
            this.editorUi.menus.edgeStyleChange(menu, '', [mxConstants.STYLE_EDGE, mxConstants.STYLE_ELBOW, mxConstants.STYLE_CURVED, mxConstants.STYLE_NOEDGESTYLE], ['elbowEdgeStyle', 'vertical', null, null], 'geIcon geSprite geSprite-verticalelbow', null, true).setAttribute('title', mxResources.get('simple'));
            this.editorUi.menus.edgeStyleChange(menu, '', [mxConstants.STYLE_EDGE, mxConstants.STYLE_ELBOW, mxConstants.STYLE_CURVED, mxConstants.STYLE_NOEDGESTYLE], ['isometricEdgeStyle', null, null, null], 'geIcon geSprite geSprite-horizontalisometric', null, true).setAttribute('title', mxResources.get('isometric'));
            this.editorUi.menus.edgeStyleChange(menu, '', [mxConstants.STYLE_EDGE, mxConstants.STYLE_ELBOW, mxConstants.STYLE_CURVED, mxConstants.STYLE_NOEDGESTYLE], ['isometricEdgeStyle', 'vertical', null, null], 'geIcon geSprite geSprite-verticalisometric', null, true).setAttribute('title', mxResources.get('isometric'));
            this.editorUi.menus.edgeStyleChange(menu, '', [mxConstants.STYLE_EDGE, mxConstants.STYLE_CURVED, mxConstants.STYLE_NOEDGESTYLE], ['orthogonalEdgeStyle', '1', null], 'geIcon geSprite geSprite-curved', null, true).setAttribute('title', mxResources.get('curved'));
            this.editorUi.menus.edgeStyleChange(menu, '', [mxConstants.STYLE_EDGE, mxConstants.STYLE_CURVED, mxConstants.STYLE_NOEDGESTYLE], ['entityRelationEdgeStyle', null, null], 'geIcon geSprite geSprite-entity', null, true).setAttribute('title', mxResources.get('entityRelation'));
        }));

        this.addDropDownArrow(this.edgeStyleMenu, 'geSprite-orthogonal', 44, 50, 0, 0, 22, -4);
    }

    this.addSeparator();

    var insertMenu = this.addMenu('', mxResources.get('insert') + ' (' + mxResources.get('doubleClickTooltip') + ')', true, 'insert', null, true);
    this.addDropDownArrow(insertMenu, 'geSprite-plus', 38, 48, -4, -3, 36, -8);

    var elts = this.addItems(['-', 'debug_sbs', 'next_sbs', 'back_sbs', 'stop_sbs']);
    //elts[1].setAttribute('title', mxResources.get('runNextSBS') + ' (' + this.editorUi.actions.get('runNextSBS').shortcut+ ')');
    //elts[2].setAttribute('title', mxResources.get('runPrevSBS') + ' (' + this.editorUi.actions.get('runPrevSBS').shortcut+ ')');
}
ToolbarBP.prototype.constructor = Toolbar;