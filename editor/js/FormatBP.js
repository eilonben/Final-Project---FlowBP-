function removeAttribute (cell,name) {
    var userObject = cell.getValue();
    if (userObject != null && userObject.nodeType == mxConstants.NODETYPE_ELEMENT)
        userObject.removeAttribute(name);
};

function deletePrevLabels(cell, value, graph) {
    var prevAmount =cell.getAttribute('numberOfOutputs',1);
    for (let i = prevAmount; i >value ; i--) {
        removeAttribute(cell,'Outputnumber'+i);
    }
}

function adjustConnectionConstraint(cell, connection_number){
    cell.new_constraints = [];
    var interval = 1 / (connection_number + 1);
    for(var i = 1; i <= connection_number ; i++)
        cell.new_constraints.push(new mxConnectionConstraint(new mxPoint(1, interval*i), true));

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

function getValueByKey(style, key) {
    var map = getMapStyle(style);
    return map.get(key);

};


function adjustEdges(cell, numOfOutputs, graphModel) {
    //the first time pressed apply
    if(cell.new_constraints == null)
        return;
    var outEdges = getOutEdges(cell);
    var oldNumOfOutput = cell.new_constraints.length;
    graphModel.beginUpdate();
    try {
        for (let i = 0; i <  outEdges.length; i++) {
            //
            var currentEdgeStyle = outEdges[i].style;
            var oldY = getValueByKey(currentEdgeStyle,"exitY");
            var constraintNumber = Math.ceil(oldY * (oldNumOfOutput +1));
            //check if edge should erase
            if(constraintNumber > numOfOutputs)
                graphModel.remove(outEdges[i],true);
            else{
            //    relocate edge exit location of edge
                var newY = constraintNumber * (1/(numOfOutputs+1))
                var new_style = mxUtils.setStyle(currentEdgeStyle, 'exitY', newY);
                graphModel.setStyle(outEdges[i], new_style);
            }
        }
    } finally {
        graphModel.endUpdate();
    }
};

function updateEdgesLabels(cell, numOfOutputs, graphModel) {
    var outEdges = getOutEdges(cell);
    graphModel.beginUpdate();
    try {
        for (let i = 0; i < outEdges.length ; i++) {
            var value = graphModel.getValue(outEdges[i]);
            value.setAttribute('label',cell.getAttribute('Outputnumber'+ (outEdges[i].getAttribute('labelNum'))));
            graphModel.setValue(outEdges[i],value);
        }
    }finally {
        graphModel.endUpdate();
    }
}



FormatBP = function(editorUi, container)
{
    Format.call(this,editorUi,container);
};

FormatBP.prototype = Object.create(Format.prototype);

FormatBP.prototype.refresh = function() {


    // Performance tweak: No refresh needed if not visible
    if (this.container.style.width == '0px')
    {
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

    if (graph.isSelectionEmpty())
    {
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
    else if (graph.isEditing())
    {
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
            var styleShape = arr[0].split("=")[1].split(".")[1];
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
            if (cell != null) {
                var dlg = new BSyncForm(ui, cell);
                //dlg.container.style.width="100%";
                var cont = document.getElementsByClassName("geFormatContainer")[0];
                cont.style.width = "22%";
                var bsyncDIV = document.createElement('div');
                bsyncDIV.style.marginLeft = "10px";
                var textnode = document.createElement("p");
                textnode.innerHTML = '<font size="3">BSync Node</font>';
                bsyncDIV.appendChild(textnode);
                bsyncDIV.appendChild(dlg.container);
                dlg.init();


                cont.appendChild(bsyncDIV);

            }
        } else if (getshape(cell.getStyle()) == "general") {
            var cont = document.getElementsByClassName("geFormatContainer")[0];
            cont.style.width = "22%";
            var generalDIV = document.createElement('div');
            generalDIV.style.marginLeft = "10px";

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
                adjustEdges(cell,parseInt(NumberOfOutPutBox.value), graph.getModel());
                deletePrevLabels(cell, NumberOfOutPutBox.value, graph.getModel());
                value.setAttribute("numberOfOutputs", NumberOfOutPutBox.value);
                adjustConnectionConstraint(cell,parseInt(NumberOfOutPutBox.value))
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
                    InnerDIVOutputLabel.appendChild(applyButtonLabels);

                    applyButtonLabels.onclick = function () {
                        for (var i = 0; i < numOfOutputs; i++) {
                            value.setAttribute("Outputnumber" + (i + 1), document.getElementById("nodeID" + cell.id + "Outputnumber" + (i + 1)).value);
                        }
                        updateEdgesLabels(cell,NumberOfOutPutBox.value,graph.getModel());
                        graph.getModel().setValue(cell, value);
                    };
                }
                OutputLabelDIV.appendChild(InnerDIVOutputLabel);
            };

            createLabels(value.getAttribute("numberOfOutputs",1));

            generalDIV.appendChild(OutputLabelDIV);

            //add the DIV to cont
            cont.appendChild(generalDIV);
            graph.getModel().setValue(cell, value);

        } else if (getshape(cell.getStyle()) == "startnode") {
            var dlg = new StartNodeForm(ui, cell);
            var cont = document.getElementsByClassName("geFormatContainer")[0];
            cont.style.width = "22%";
            var startnodeDIV = document.createElement('div');
            startnodeDIV.style.marginLeft = "10px";
            //cont.style.borderLeftStyle="solid"
            var textnode = document.createElement("p");
            textnode.innerHTML = '<font size="3">Start Node</font>';
            startnodeDIV.appendChild(textnode);
            startnodeDIV.appendChild(dlg.container);
            dlg.init();

            cont.appendChild(startnodeDIV);
        };


    }

};

// FormatBP.prototype.constructor = Format;