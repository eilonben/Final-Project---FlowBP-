const colorOfInvalid = '#CC0000';

function paint_cells(graphModel, cells) {
    graphModel.beginUpdate();
    try {
        for (var i = 0; i < cells.length; i++) {
            var new_style = mxUtils.setStyle(cells[i].getStyle(), 'strokeColor', colorOfInvalid);
            //after fixing the cell it will repaint in black
            cells[i].repaint = true;
            graphModel.setStyle(cells[i], new_style);
        }
    }
    finally {
        graphModel.endUpdate();
    }

};

function checkCellValidation(cell) {
    //edge
    if (cell.isEdge()) {
        var edge = cell;
        if (edge.source == null || edge.target == null)
            return false;

    }
    //shape - start node
    else if(getshape(cell.getStyle()) == "startnode") {
            var startNode = cell;
            if(startNode.edges == null || startNode.edges.length == 0)
                return false;
    }
    return true;
}


function findInvalidCells(model) {
    var invalidCells = [];
    const cells = Object.values(model.cells);

    for (var i = 0; i < cells.length; i++) {
        if(!checkCellValidation(cells[i]))
            invalidCells.push(cells[i]);
    }
    paint_cells(model, invalidCells);
    return invalidCells;
};

/**
 * @param xml_code
 * @param debug
 * receives the xml_code from the editor, and decodes it into in MxGraphModel in order to
 * send it to the interpreter.
 * Param debug is used to determine if running on debug mode.
 */
function parse_graph(xml_code, debug) {
    let doc = mxUtils.parseXml(xml_code);
    let codec = new mxCodec(doc);
    let model = new mxGraphModel();
    codec.decode(doc.documentElement, model);

    startRunning(model, debug);
};


