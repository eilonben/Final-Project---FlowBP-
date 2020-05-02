const colorOfInvalid = '#9A5688';

function paint_cells(graph,cells) {

    var graphModel = graph.getModel();
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


function findInvalidCells(graph) {
    var invalidCells = [];
    var model = graph.getModel();
    const cells = Object.values(model.cells);

    for (var i = 0; i < cells.length; i++) {
        //edge
        if (cells[i].isEdge()) {
            var edge = cells[i];
            if (edge.source == null || edge.target == null) {
                invalidCells.push(edge);
            }
        }
        //shape
        else {
            if (getshape(cells[i].getStyle()) == "startnode") {
                var startNode = cells[i];
                if(startNode.edges == null || startNode.edges.length == 0)
                    invalidCells.push(startNode);
            }

        }
    }
    paint_cells(graph, invalidCells);
    return invalidCells;
};

//decode the xml string received from Actions.js
function parse_graph(xml_code, graph) {
    // console.log(xml_code);
    let doc = mxUtils.parseXml(xml_code);
    let codec = new mxCodec(doc);
    let model = new mxGraphModel();
    codec.decode(doc.documentElement, model);

    var invalidCells = findInvalidCells(graph);
    // if invalidCells is not empty -> there are edges without source or target OR start node without edges
    if (invalidCells.length == 0)
        startRunning(model);

    return invalidCells;
}


