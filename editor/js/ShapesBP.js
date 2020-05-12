
function FlowShape()
{
    mxRectangleShape.call(this);
};

mxUtils.extend(FlowShape, mxRectangleShape);

var outputPoint = new mxPoint(mxConnectionHandlerBP.defultOutputX, mxConnectionHandlerBP.defultOutputY);
var inputPoint = new mxPoint(mxConnectionHandlerBP.defultInputX, mxConnectionHandlerBP.defultInputY);

FlowShape.prototype.constraints = [new mxConnectionConstraint(outputPoint, true, "O"),
    new mxConnectionConstraint(inputPoint, true, "I")];

mxCellRenderer.registerShape('flow.shape', FlowShape);


//*******************************start node*******************************
function BsyncStartNosde()
{
    mxTriangle.call(this);
};

mxUtils.extend(BsyncStartNosde, FlowShape);
mxUtils.extend(BsyncStartNosde, mxTriangle);

BsyncStartNosde.prototype.constraints = [new mxConnectionConstraint(outputPoint, true, "O")];

mxCellRenderer.registerShape('flow.startnode', BsyncStartNosde);



//*******************************bsync node*******************************

function BsyncShape()
{
    FlowShape.call(this);
};
mxUtils.extend(BsyncShape, FlowShape);

mxCellRenderer.registerShape('flow.bsync', BsyncShape);


//*******************************general node*******************************
function GeneralShape()
{
    FlowShape.call(this);
};
mxUtils.extend(GeneralShape, FlowShape);

//filed only in general constraints
BsyncShape.prototype.constraints[0].index = 0;

mxCellRenderer.registerShape('flow.general', GeneralShape);


//******************************************console***********************************************
function ConsoleShape()
{
    FlowShape.call(this);
};

mxUtils.extend(ConsoleShape, FlowShape);

mxCellRenderer.registerShape('flow.console', ConsoleShape);


//******************************************text***********************************************
function TextFlow()
{
    mxTextBP.call(this);
};



mxUtils.extend(TextFlow, mxTextBP);

TextFlow.prototype.constraints = [];

mxCellRenderer.registerShape('flow.text', TextFlow);


//******************************************labele***********************************************
function LabelFlow()
{
    mxLabel.call(this);
};

mxUtils.extend(LabelFlow, mxLabel);

LabelFlow.prototype.constraints = [];

mxCellRenderer.registerShape('flow.label', LabelFlow);

//******************************************line***********************************************
function LineFlow()
{
    mxLine.call(this);
};



mxUtils.extend(LineFlow, mxLine);

LineFlow.prototype.constraints = [];

mxCellRenderer.registerShape('flow.line', LineFlow);


mxSwimlane.prototype.constraints = FlowShape.prototype.constraints;
