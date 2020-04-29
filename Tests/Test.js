function loadXMl(FilePath) {
    if("XML_for_tests/HiOrGoodbye.xml" === FilePath)
        return "<mxGraphModel dx=\"1038\" dy=\"592\" grid=\"1\" gridSize=\"10\" guides=\"1\" tooltips=\"1\" connect=\"1\" arrows=\"1\" fold=\"1\" page=\"1\" pageScale=\"1\" pageWidth=\"850\" pageHeight=\"1100\">\n" +
            "  <root>\n" +
            "    <mxCell id=\"0\"/>\n" +
            "    <mxCell id=\"1\" parent=\"0\"/>\n" +
            "    <object label=\"request: Hi,Goodbye&#xa;wait: &#xa;block: \" sync=\"{&quot;request&quot;:[&quot;Hi&quot;,&quot;Goodbye&quot;], &quot;wait&quot;:[],&quot;block&quot;:[]}\" Request=\"Hi,Goodbye\" Wait=\"\" Block=\"\" id=\"3\">\n" +
            "      <mxCell style=\"shape=flow.bsync;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=2\" vertex=\"1\" parent=\"1\">\n" +
            "        <mxGeometry x=\"180\" y=\"32\" width=\"130\" height=\"50\" as=\"geometry\"/>\n" +
            "      </mxCell>\n" +
            "    </object>\n" +
            "    <mxCell id=\"4\" style=\"edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;exitPerimeter=0;entryX=0;entryY=0.5;\" edge=\"1\" parent=\"1\" source=\"5\" target=\"3\">\n" +
            "      <mxGeometry relative=\"1\" as=\"geometry\"/>\n" +
            "    </mxCell>\n" +
            "    <object label=\"\" id=\"5\">\n" +
            "      <mxCell style=\"shape=flow.startnode;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=2\" vertex=\"1\" parent=\"1\">\n" +
            "        <mxGeometry x=\"20\" y=\"32\" width=\"50\" height=\"50\" as=\"geometry\"/>\n" +
            "      </mxCell>\n" +
            "    </object>\n" +
            "  </root>\n" +
            "</mxGraphModel>";
    else
        return "<mxGraphModel dx=\"1038\" dy=\"544\" grid=\"1\" gridSize=\"10\" guides=\"1\" tooltips=\"1\" connect=\"1\" arrows=\"1\" fold=\"1\" page=\"1\" pageScale=\"1\" pageWidth=\"850\" pageHeight=\"1100\">\n" +
            "  <root>\n" +
            "    <mxCell id=\"0\"/>\n" +
            "    <mxCell id=\"1\" parent=\"0\"/>\n" +
            "    <mxCell id=\"2\" style=\"edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;exitPerimeter=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;entryPerimeter=0;\" edge=\"1\" parent=\"1\" source=\"3\" target=\"5\">\n" +
            "      <mxGeometry relative=\"1\" as=\"geometry\"/>\n" +
            "    </mxCell>\n" +
            "    <object label=\"\" id=\"3\">\n" +
            "      <mxCell style=\"shape=flow.startnode;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=2\" vertex=\"1\" parent=\"1\">\n" +
            "        <mxGeometry x=\"40\" y=\"40\" width=\"50\" height=\"50\" as=\"geometry\"/>\n" +
            "      </mxCell>\n" +
            "    </object>\n" +
            "    <mxCell id=\"4\" style=\"edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;exitPerimeter=0;entryX=0;entryY=0.5;\" edge=\"1\" parent=\"1\" source=\"5\" target=\"6\">\n" +
            "      <mxGeometry relative=\"1\" as=\"geometry\"/>\n" +
            "    </mxCell>\n" +
            "    <object label=\"request: Hello&#xa;wait: &#xa;block: \" sync=\"{&quot;request&quot;:[&quot;Hello&quot;], &quot;wait&quot;:[],&quot;block&quot;:[]}\" Request=\"Hello\" Wait=\"\" Block=\"\" id=\"5\">\n" +
            "      <mxCell style=\"shape=flow.bsync;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=2\" vertex=\"1\" parent=\"1\">\n" +
            "        <mxGeometry x=\"180\" y=\"42.5\" width=\"100\" height=\"45\" as=\"geometry\"/>\n" +
            "      </mxCell>\n" +
            "    </object>\n" +
            "    <object label=\"request: World&#xa;wait: &#xa;block: \" sync=\"{&quot;request&quot;:[&quot;World&quot;], &quot;wait&quot;:[],&quot;block&quot;:[]}\" Request=\"World\" Wait=\"\" Block=\"\" id=\"6\">\n" +
            "      <mxCell style=\"shape=flow.bsync;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#000000;strokeWidth=2\" vertex=\"1\" parent=\"1\">\n" +
            "        <mxGeometry x=\"360\" y=\"42.5\" width=\"100\" height=\"45\" as=\"geometry\"/>\n" +
            "      </mxCell>\n" +
            "    </object>\n" +
            "  </root>\n" +
            "</mxGraphModel>\n";
}

var testHeyOrGoodbyeFlowBP = function () {
    var expected = ["Hi","Goodbye"];
    var resulte = [];
    var xml = loadXMl("XML_for_tests/HiOrGoodbye.xml");
    try {
        parse_graph(xml);
        resulte = window.eventsSelected;
        console.log(window.eventsSelected);
    }catch (e) {
        console.log(e);
        return false;
    }
    if (resulte.length != 1)
        return false;
    return expected.includes(resulte[0]);
}
console.log("test HeyOrGoodbye   -   "+testHeyOrGoodbyeFlowBP());

var testHelloWorld = function () {
    var expected = ["Hello","World"];
    var resulte = [];
    var xml = loadXMl("XML_for_tests/Hello_World.xml");
    try {
        parse_graph(xml);
        resulte = window.eventsSelected;
        console.log(window.eventsSelected);
    }catch (e) {
        console.log(e);
        return false;
    }
    return expected.toString() === resulte.toString();
}
console.log("test HelloWorld   -   "+testHelloWorld());