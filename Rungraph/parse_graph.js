const colorOfInvalid = '#CC0000';

/**
 * change cells color to colorOfInvalid
 * @param graphModel - <mxGraphModel> to execute the change in
 * @param cells - <list<mxCell>> of cells that need to be painted
*/
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

/**
 * check if a cell is valid
 * @param cell - <mxCell> to check his validation
 * @returns {boolean}
 */
function checkCellValidation(cell) {
    //edge
    if (cell.isEdge()) {
        var edge = cell;
        if (edge.source == null || edge.target == null)
            return false;

    }
    //shape - start node
    else if(cell.isStartNode()) {
            var startNode = cell;
            if(startNode.edges == null || startNode.edges.length == 0)
                return false;
    }
    // //shape - shape without source
    // else if(cell.isBPCell()) {
    //     //check if the shape contains input edges
    //     if(cell.edges == null || cell.edges.filter(e => e.target == cell).length == 0)
    //         return false;
    // }
    return true;
}

/**
 * find all invalid cells in the graph and paint them, and check if any start node exists
 * @param model - <mxGraphModel> to check his cells validation
 * @returns {Array}
 */
function findInvalidCells(model) {
    var invalidCells = [];
    const cells = Object.values(model.cells);
    // find all invalid cells in the graph and paint them
    for (var i = 0; i < cells.length; i++) {
        if(!checkCellValidation(cells[i]))
            invalidCells.push(cells[i]);
    }
    paint_cells(model, invalidCells);
    return invalidCells;
};

/**
 * check Graph Validation
 * @param model - <mxGraphModel> to check his cells validation
 * @returns {string}
 */
function checkGraphValidation(model){

    const cells = Object.values(model.cells);
    let startNodeMissing = cells.filter(cell => cell.isStartNode()).length == 0;

    let invalidCells = findInvalidCells(model);

    var output = (startNodeMissing ? "Missing start node\n" : "") +
        (invalidCells.length > 0 ? "Disconnected node or edge" : "");
    return output;
}

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


