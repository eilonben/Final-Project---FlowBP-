
function getLabelsFromChildren(cell){
    var children = cell.children || [];
    var labels = children.filter(x => x.label_index != null);
    labels = labels.sort(function(a, b) {return a.label_index - b.label_index});
    return labels;
}



function getMapStyle(style) {
    var result = new Map();

    if (style != null) {
        var pairs = style.split(';');

        for (var i = 0; i < pairs.length; i++) {
            var pair = pairs[i].split('=');
            if (pair.length == 2)
                result.set(pair[0], pair[1])
        }
    }

    return result;
};

function getValueByKey(style, key, defult) {
    var map = getMapStyle(style);
    return map.get(key) || defult;

};


FormatBP = function (editorUi, container) {
    Format.call(this, editorUi, container);
};

FormatBP.prototype = Object.create(Format.prototype);

FormatBP.prototype.removeAttribute = function (cell, name) {
    var userObject = cell.getValue();
    if (userObject != null && userObject.nodeType == mxConstants.NODETYPE_ELEMENT)
        userObject.removeAttribute(name);
};

FormatBP.prototype.deletePrevLabels = function (cell, value, graph) {
    var prevAmount = cell.getAttribute('numberOfOutputs', 1);
    for (let i = prevAmount; i > value; i--) {
        this.removeAttribute(cell, 'Outputnumber' + i);
    }
};

FormatBP.prototype.validateNewConstraint = function (cell, graph){
    if(cell != null && cell.new_constraints == null){
        var state = graph.view.getState(cell, false);
        cell.new_constraints = graph.getAllConnectionConstraints(state, true);
    }
};




// //after debug all the graph moves - fix thr connection point labels and edges
// FormatBP.prototype.fixConnectionRelatedBugs = function (graph){
//     var cells = Object.values(graph.getModel().cells) || [];
//     for( var i=0; i< cells.length; i++) {
//         var cell = cells[i];
//         if(getshape(cell.getStyle()) == "general") {
//             graph.getModel().beginUpdate();
//             fixConnectionPointsLabelLocation(graph, cell, cell.geometry.x, cell.geometry.y);
//             graph.getModel().endUpdate();
//         }
//     }
// };

// compute constraint new position
FormatBP.prototype.computeNewPosition = function(cell, numOfOutputs, index){
    var cellHeight = cell.geometry.height;
    var cellTitle = getValueByKey(cell.getStyle(),'startSize',26);
    var cellContent = cellHeight -  cellTitle;
    var interval = (cellContent / cellHeight ) / (numOfOutputs + 1);
    return new mxPoint(mxConnectionHandlerBP.defultOutputX,(cellTitle/cellHeight) + interval * index);
}


// update connection point number
FormatBP.prototype.adjustConnectionPoints = function (cell, numOfOutputs, graph) {
    this.validateNewConstraint(cell, graph);
    // input constraint always at the end of the list

    var inputConstraint = cell.new_constraints.filter(x => x.name == "I");
    cell.new_constraints = [];
    for (var i = 1; i <= numOfOutputs; i++) {
        var newLocationPoint = this.computeNewPosition(cell, numOfOutputs, i);
        cell.new_constraints.push(new mxConnectionConstraint(newLocationPoint, true, "O", newLocationPoint.x, newLocationPoint.y));
    }
    // input constraint Should be at the end of the list
    cell.new_constraints = cell.new_constraints.concat(inputConstraint);
    graph.connectionHandler.constraintHandler.showConstraint(graph.view.getState(cell,false));

};


//update the connection points labels
FormatBP.prototype.updateConnectionPointsLabels = function (graph, cell, labels){
    this.validateNewConstraint(cell, graph);
    graph.getModel().beginUpdate();
    try {
        // labels related to cell connection points
        var cell_labels_cells = getLabelsFromChildren(cell);
        for (var i = 0; i < labels.length; i++) {
            var label = labels[i];

            // the label exist -> only change its value
            if( cell_labels_cells.length > i) {
                var ConnectionPointLabelCell = cell_labels_cells[i];
                ConnectionPointLabelCell.value = label;
            }
            // create new label
            else {
                var constraint_img_height = graph.connectionHandler.constraintHandler.getImageForConstraint().height;
                var cp = cell.new_constraints[i].point;
                var prefix = 'shape=label;';
                var x = cp.x * cell.getGeometry().width;
                var y = cp.y * cell.getGeometry().height - constraint_img_height;
                var labelVertex = graph.insertVertex(cell, null, label, x, y, 0, 0, prefix + 'labelPosition=right;align=left;childLayout=stackLayout;points=[]');
                labelVertex.selectable = false;
                labelVertex.lock = true;
                labelVertex.label_index = i;
                // delete connection constraint for the label
            }
        }
        //fix labels locations
        graph.fixConnectionPointsLabelLocation(cell);
    }
    finally {
        graph.getModel().endUpdate();
    }
    graph.view.revalidate();
};

// after changing number of output adjust the Connection PointsLabels accordingly
FormatBP.prototype.adjustConnectionPointsLabels = function (graph, cell, newOutputNumber)
{
    var labels = getLabelsFromChildren(cell);
    newOutputNumber = newOutputNumber != null ? newOutputNumber : cell.new_constraints.length ;
    graph.getModel().beginUpdate();
    try {
        // delete labels
        for (let i = 0; i < labels.length; i++) {
            // need to delete
            if (i >= newOutputNumber) {
                var ConnectionPointLabelCell =  labels[i];
                graph.removeCells([ConnectionPointLabelCell]);
            }
        }
        //fix labels locations
        this.fixConnectionPointsLabelLocation(cell);
    }
    finally {
        graph.getModel().endUpdate();
    }
    graph.view.revalidate();

};

// after changing number of output adjust the edges exit point accordingly
FormatBP.prototype.adjustEdges = function (cell, numOfOutputs, graph) {

    //need to adjust old arrows to new location
    var graphModel = graph.getModel();
    var outEdges = graph.getOutEdges(cell);
    var numOfOutputs = numOfOutputs != null ? numOfOutputs : outEdges.length;
    graphModel.beginUpdate();
    try {
        for (let i = 0; i < outEdges.length; i++) {
            // get old location of edge
            var constraintNumber = parseInt(outEdges[i].getAttribute('labelNum'));
            //check if edge should erase
            if (constraintNumber > numOfOutputs)
                graphModel.remove(outEdges[i], true);
            else {
                //    relocate edge exit location of edge
                var newLocationPoint = this.computeNewPosition(cell, numOfOutputs, constraintNumber);
                var new_style = mxUtils.setStyle(outEdges[i].style, 'exitY', newLocationPoint.y);
                graphModel.setStyle(outEdges[i], new_style);
            }
        }
    } finally {
        graphModel.endUpdate();
    }
};

FormatBP.prototype.updateEdgesLabels = function (cell, graph, cellValue ) {
    var graphModel = graph.getModel();
    var outEdges = graph.getOutEdges(cell);
    graphModel.beginUpdate();
    try {
        for (let i = 0; i < outEdges.length; i++) {
            var value = graphModel.getValue(outEdges[i]);
            value.setAttribute('label', cellValue.getAttribute('Outputnumber' + (outEdges[i].getAttribute('labelNum'))));
            graphModel.setValue(outEdges[i], value);
        }
    } finally {
        graphModel.endUpdate();
    }
};



FormatBP.prototype.refresh = function () {

    var format = this;
    // Performance tweak: No refresh needed if not visible
    if (this.container.style.width == '0px') {
        return;
    }

    this.clear();
    var ui = this.editorUi;
    var graph = ui.editor.graph;
    var div = document.createElement('div');
    div.style.whiteSpace = 'nowrap';
    div.style.color = 'rgb(112, 112, 112)';
    div.style.textAlign = 'left';
    div.style.cursor = 'default';

    var label = document.createElement('div');
    label.style.border = '1px solid #c0c0c0';
    label.style.borderWidth = '0px 0px 1px 0px';
    label.style.textAlign = 'center';
    label.style.fontWeight = 'bold';
    label.style.overflow = 'hidden';
    label.style.display = (mxClient.IS_QUIRKS) ? 'inline' : 'inline-block';
    label.style.paddingTop = '8px';
    label.style.height = (mxClient.IS_QUIRKS) ? '34px' : '25px';
    label.style.width = '100%';
    this.container.appendChild(div);

    if (graph.isSelectionEmpty()) {
        /*mxUtils.write(label, mxResources.get('diagram'));

        // Adds button to hide the format panel since
        // people don't seem to find the toolbar button
        // and the menu item in the format menu
        if (this.showCloseButton)
        {
            var img = document.createElement('img');
            img.setAttribute('border', '0');
            img.setAttribute('src', Dialog.prototype.closeImage);
            img.setAttribute('title', mxResources.get('hide'));
            img.style.position = 'absolute';
            img.style.display = 'block';
            img.style.right = '0px';
            img.style.top = '8px';
            img.style.cursor = 'pointer';
            img.style.marginTop = '1px';
            img.style.marginRight = '17px';
            img.style.border = '1px solid transparent';
            img.style.padding = '1px';
            img.style.opacity = 0.5;
            label.appendChild(img)

            mxEvent.addListener(img, 'click', function()
            {
                ui.actions.get('formatPanel').funct();
            });
        }

        div.appendChild(label);
        this.panels.push(new DiagramFormatPanel(this, ui, div));*/
    }
    else if (graph.isEditing()) {
        mxUtils.write(label, mxResources.get('text'));
        div.appendChild(label);
        this.panels.push(new TextFormatPanel(this, ui, div));
    }
    else {
        var containsLabel = this.getSelectionState().containsLabel;
        var currentLabel = null;
        var currentPanel = null;

        var addClickHandler = mxUtils.bind(this, function (elt, panel, index) {
            var clickHandler = mxUtils.bind(this, function (evt) {
                if (currentLabel != elt) {
                    if (containsLabel) {
                        this.labelIndex = index;
                    }
                    else {
                        this.currentIndex = index;
                    }

                    if (currentLabel != null) {
                        currentLabel.style.backgroundColor = this.inactiveTabBackgroundColor;
                        currentLabel.style.borderBottomWidth = '1px';
                    }

                    currentLabel = elt;
                    currentLabel.style.backgroundColor = '';
                    currentLabel.style.borderBottomWidth = '0px';

                    if (currentPanel != panel) {
                        if (currentPanel != null) {
                            currentPanel.style.display = 'none';
                        }

                        currentPanel = panel;
                        currentPanel.style.display = '';
                    }
                }
            });

            mxEvent.addListener(elt, 'click', clickHandler);

            if (index == ((containsLabel) ? this.labelIndex : this.currentIndex)) {
                // Invokes handler directly as a workaround for no click on DIV in KHTML.
                clickHandler();
            }
        });

        label.style.backgroundColor = this.inactiveTabBackgroundColor;
        label.style.borderLeftWidth = '1px';
        label.style.width = (containsLabel) ? '50%' : '33.3%';
        label.style.width = (containsLabel) ? '50%' : '33.3%';
        var label2 = label.cloneNode(false);
        var label3 = label2.cloneNode(false);

        // Workaround for ignored background in IE
        label2.style.backgroundColor = this.inactiveTabBackgroundColor;
        label3.style.backgroundColor = this.inactiveTabBackgroundColor;


        var getshape = function (str) {
            var arr = str.split(";");
            var styleShape = arr[0].split("=")[1] ;
            styleShape = styleShape != null? styleShape.split(".")[1] : '';
            return styleShape;

        };

        var createApplyButton = function () {
            var newButton = document.createElement("BUTTON");
            newButton.appendChild(document.createTextNode("Apply"));
            newButton.id = "nodeTitleButton";
            newButton.style.marginLeft = "10px";
            newButton.style.cursor = "pointer";
            return newButton;
        };

        var cell = graph.getSelectionCell() || graph.getModel().getRoot();
        var graph = ui.editor.graph;
        var value = graph.getModel().getValue(cell);

        if (!mxUtils.isNode(value)) {
            var doc = mxUtils.createXmlDocument();
            var obj = doc.createElement('object');
            obj.setAttribute('label', value || '');
            value = obj;
        }
        if (graph.getModel().isEdge(cell)) {

        } else if (getshape(cell.getStyle()) == "bsync") {
                var dlg = new BSyncForm(ui, cell);
                //dlg.container.style.width="100%";
                var cont = document.getElementsByClassName("geFormatContainer")[0];
                cont.style.width = "22%";
                var bsyncDIV = document.createElement('div');
                bsyncDIV.style.marginLeft = "2%";
                var textnode = document.createElement("p");
                textnode.innerHTML = '<font size="3">BSync Node</font>';
                bsyncDIV.appendChild(textnode);
                bsyncDIV.appendChild(dlg.container);
                dlg.init();
                cont.appendChild(bsyncDIV);


        } else if (getshape(cell.getStyle()) == "general") {
            var cont = document.getElementsByClassName("geFormatContainer")[0];
            cont.style.width = "22%";
            var generalDIV = document.createElement('div');
            generalDIV.style.marginLeft = "3%";
            //Title
            var textnode = document.createElement("p");
            textnode.innerHTML = '<font size="3">General Node</font>';
            generalDIV.appendChild(textnode);

            //Button code editor
            var popUPbutton = document.createElement("BUTTON");
            popUPbutton.appendChild(document.createTextNode("Open Code editor"));
            popUPbutton.id = "codeEditorButton";
            popUPbutton.onclick = function () {
                var dlg = new CodeEditorDialog(ui, cell);
                var etd = ui;
                etd.showDialog(dlg.container, 520, 420, true, true);
                dlg.init();
            };
            popUPbutton.className = 'geBtn gePrimaryBtn';
            generalDIV.appendChild(popUPbutton);

            //Node title - <not made change>
            var nodeTitleDIV = document.createElement('div');
            var nodeTitleText = document.createElement("p");
            nodeTitleText.innerHTML = '<font size="2">Node Title:</font>';
            nodeTitleDIV.appendChild(nodeTitleText);
            var nodeTitleButton = createApplyButton();
            var AreaTitleText = document.createElement("p");
            var titleBox = document.createElement("INPUT");
            titleBox.setAttribute("type", "text");

            if (undefined != value.getAttribute("NodeTitle"))
                titleBox.setAttribute("value", value.getAttribute("NodeTitle"));

            nodeTitleButton.onclick = function () {
                value.setAttribute("NodeTitle", titleBox.value);
                value.setAttribute('label', titleBox.value);
                graph.getModel().setValue(cell, value);
            };

            AreaTitleText.appendChild(titleBox);
            AreaTitleText.appendChild(nodeTitleButton);
            nodeTitleDIV.appendChild(AreaTitleText);
            generalDIV.appendChild(nodeTitleDIV);


            //Number of outputs
            var NumberOfOutPutDIV = document.createElement('div');
            var NumberOfOutPutText = document.createElement("p");
            NumberOfOutPutText.innerHTML = '<font size="2">Number of outputs:</font>';
            NumberOfOutPutDIV.appendChild(NumberOfOutPutText);
            var AreaNumberOfOutPutText = document.createElement("p");
            var NumberOfOutPutBox = document.createElement("INPUT");
            NumberOfOutPutBox.setAttribute("type", "number");
            NumberOfOutPutBox.setAttribute("max", 6);
            NumberOfOutPutBox.setAttribute("min", 0);
            if (undefined != value.getAttribute("numberOfOutputs")) {
                NumberOfOutPutBox.setAttribute("value", value.getAttribute("numberOfOutputs"));
            } else {
                NumberOfOutPutBox.setAttribute("value", "1");
                value.setAttribute("numberOfOutputs", 1);
            }
            var NumberOfOutPutButton = createApplyButton();
            NumberOfOutPutButton.onclick = function () {
                var outputNumber = parseInt(NumberOfOutPutBox.value);
                format.adjustConnectionPoints(cell, outputNumber, graph);
                format.deletePrevLabels(cell, NumberOfOutPutBox.value, graph.getModel());
                format.adjustEdges(cell, outputNumber, graph);
                format.adjustConnectionPointsLabels(graph, cell, outputNumber);

                value.setAttribute("numberOfOutputs", NumberOfOutPutBox.value);
                graph.getModel().setValue(cell, value);
                createLabels(NumberOfOutPutBox.value);


            };
            AreaNumberOfOutPutText.appendChild(NumberOfOutPutBox);
            AreaNumberOfOutPutText.appendChild(NumberOfOutPutButton);
            NumberOfOutPutDIV.appendChild(AreaNumberOfOutPutText);
            generalDIV.appendChild(NumberOfOutPutDIV);

            //Output label - <not made change>
            var OutputLabelDIV = document.createElement('div');
            var OutputLabelText = document.createElement("p");
            OutputLabelText.innerHTML = '<font size="2">Output labels:</font>';
            OutputLabelDIV.appendChild(OutputLabelText);

            var createLabels = function (numOfOutputs) {
                var InnerDIVOutputLabel = document.createElement('div');
                InnerDIVOutputLabel.setAttribute("id", "InnerDIVOutputLabel" + cell.id);
                for (var i = 0; i < numOfOutputs; i++) {
                    var oneTextLabelDiv = document.createElement('div');
                    oneTextLabelDiv.innerHTML = "L " + (i + 1) + ": ";
                    var OutputLabelTextBox = document.createElement("INPUT");
                    OutputLabelTextBox.id = "nodeID" + cell.id + "Outputnumber" + (i + 1);
                    OutputLabelTextBox.setAttribute("type", "text");
                    if (undefined != value.getAttribute("Outputnumber" + (i + 1))) {
                        OutputLabelTextBox.setAttribute("value", value.getAttribute("Outputnumber" + (i + 1)));
                    }
                    oneTextLabelDiv.appendChild(OutputLabelTextBox);
                    oneTextLabelDiv.style.marginBottom = "5px";
                    InnerDIVOutputLabel.appendChild(oneTextLabelDiv);
                }

                if (numOfOutputs >= 1) {
                    var applyButtonLabels = createApplyButton();
                    applyButtonLabels.onclick = function () {
                        var labels = [];
                        for (var i = 0; i < numOfOutputs; i++) {
                            var label = document.getElementById("nodeID" + cell.id + "Outputnumber" + (i + 1)).value;
                            value.setAttribute("Outputnumber" + (i + 1), label);
                            labels.push(label);
                        }
                        format.updateEdgesLabels(cell, graph, value);
                        format.updateConnectionPointsLabels(graph, cell, labels);
                        graph.getModel().setValue(cell, value);
                    };
                    InnerDIVOutputLabel.appendChild(applyButtonLabels);
                }
                OutputLabelDIV.appendChild(InnerDIVOutputLabel);
            };

            createLabels(value.getAttribute("numberOfOutputs", 1));

            generalDIV.appendChild(OutputLabelDIV);
            //add the DIV to cont
            cont.appendChild(generalDIV);


        } else if (getshape(cell.getStyle()) === "startnode") {
            // var dlg = new StartNodeForm(ui, cell);
            var cont = document.getElementsByClassName("geFormatContainer")[0];
            cont.style.width = "22%";
            var startnodeDIV = document.createElement('div');
            startnodeDIV.style.marginLeft = "10px";
            var textnode = document.createElement("p");
            textnode.innerHTML = '<font size="3">Start Node</font>';
            startnodeDIV.appendChild(textnode);
            // startnodeDIV.appendChild(dlg.container);
            // dlg.init();


            //creating a div for defnining number of payloads on a start node
            var NumberOfPayloadsDIV = document.createElement('div');
            var NumberOfPayloadsText = document.createElement("p");
            NumberOfPayloadsText.innerHTML = '<font size="2">Number of Payloads:</font>';
            NumberOfPayloadsDIV.appendChild(NumberOfPayloadsText);
            var AreaNumberOfPayloadsText = document.createElement("p");
            var NumberOfPayloadsBox = document.createElement("INPUT");
            NumberOfPayloadsBox.setAttribute("type", "number");
            NumberOfPayloadsBox.setAttribute("max", 10);
            NumberOfPayloadsBox.setAttribute("min", 1);
            if (undefined != value.getAttribute("numberOfPayloads")) { // fetching the last number of payloads from the node itself
                NumberOfPayloadsBox.setAttribute("value", value.getAttribute("numberOfPayloads"));
            } else {
                NumberOfPayloadsBox.setAttribute("value", "1");
                value.setAttribute("numberOfPayloads", 1);
            }
            var NumberOfPayloadsButton = createApplyButton();
            NumberOfPayloadsButton.onclick = function () {// defining what happens when clicking apply on num of payloads
                value.setAttribute("numberOfPayloads", NumberOfPayloadsBox.value);
                graph.getModel().setValue(cell, value);
                createPayloads(NumberOfPayloadsBox.value);


            };
            AreaNumberOfPayloadsText.appendChild(NumberOfPayloadsBox);
            AreaNumberOfPayloadsText.appendChild(NumberOfPayloadsButton);
            NumberOfPayloadsDIV.appendChild(AreaNumberOfPayloadsText);
            startnodeDIV.appendChild(NumberOfPayloadsDIV);


            var PayloadsLabelDIV = document.createElement('div');
            var PayloadsLabelText = document.createElement("p");
            PayloadsLabelText.innerHTML = '<font size="2">Payloads:</font>';
            PayloadsLabelDIV.appendChild(PayloadsLabelText);
            // creating the Payload input text holders
            var createPayloads = function (numOfPayloads) {
                var InnerDIVPayloadsLabel = document.createElement('div');
                InnerDIVPayloadsLabel.setAttribute("id", "InnerDIVPayloadsLabel" + cell.id);
                for (var i = 0; i < numOfPayloads; i++) {
                    var oneTextLabelDiv = document.createElement('div');
                    oneTextLabelDiv.innerHTML = "Payload " + (i + 1) + ": ";
                    var PayloadsLabelTextBox = document.createElement("INPUT");
                    PayloadsLabelTextBox.id = "nodeID" + cell.id + "Payloadsnumber" + (i + 1);
                    PayloadsLabelTextBox.setAttribute("type", "text");
                    //checking if there was a former definition for the i'th payload holder
                    var parsed = JSON.parse(value.getAttribute("Payloads"));
                    if (parsed !== null && parsed !== undefined && parsed[i] != null && parsed[i] !== undefined) {
                        PayloadsLabelTextBox.setAttribute("value", JSON.stringify(parsed[i]));
                    }
                    oneTextLabelDiv.appendChild(PayloadsLabelTextBox);
                    oneTextLabelDiv.style.marginBottom = "5px";
                    InnerDIVPayloadsLabel.appendChild(oneTextLabelDiv);
                }

                if (numOfPayloads >= 1) {
                    var applyButtonLabels = createApplyButton();
                    InnerDIVPayloadsLabel.appendChild(applyButtonLabels);
                    // inserting the new payloads given by the client to the node's "payloads" attribute(array)
                    applyButtonLabels.onclick = function () {
                        var Payloads = [];
                        for (var i = 0; i < numOfPayloads; i++) {
                            let payloadValue = JSON.parse(document.getElementById("nodeID" + cell.id + "Payloadsnumber" + (i + 1)).value);
                            if(payloadValue === "" || payloadValue === undefined || payloadValue ===null){
                                Payloads.push({});
                            }
                            else {
                                Payloads.push(payloadValue);
                            }
                        }
                        value.setAttribute("Payloads", JSON.stringify(Payloads));
                        graph.getModel().setValue(cell, value);
                    };
                }
                PayloadsLabelDIV.appendChild(InnerDIVPayloadsLabel);
            };

            createPayloads(value.getAttribute("numberOfPayloads", 1));

            startnodeDIV.appendChild(PayloadsLabelDIV);


            cont.appendChild(startnodeDIV);

        }

        else if (getshape(cell.getStyle()) === "console"){
            var cont = document.getElementsByClassName("geFormatContainer")[0];
            cont.style.width = "22%";
            var consoleDIV = document.createElement('div');
            consoleDIV.style.marginLeft = "3%";
            //Title
            var textnod = document.createElement("p");
            textnod.innerHTML = '<font size="3">Console Node</font>';
           consoleDIV.appendChild(textnod);

            //Button code editor
            var consolePopUp = document.createElement("BUTTON");
            consolePopUp.appendChild(document.createTextNode("Open Code editor"));
            consolePopUp.id = "codeEditorButton";
            consolePopUp.onclick = function () {
                var dlg = new ConsoleBlockSidebar(ui, cell);
                var etd = ui;
                etd.showDialog(dlg.container, 520, 420, true, true);
                dlg.init();
            };
            consolePopUp.className = 'geBtn gePrimaryBtn';
            consoleDIV.appendChild(consolePopUp);
            cont.appendChild(consoleDIV);
        }

    }

};
