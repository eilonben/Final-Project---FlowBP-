var xml_for_test="";
function readTextFile(file)
{
    var rawFile = new XMLHttpRequest();
    rawFile.open("GET", file, false);
    rawFile.onreadystatechange = function ()
    {
        if(rawFile.readyState === 4)
        {
            if(rawFile.status === 200 || rawFile.status == 0)
            {
                var allText = rawFile.responseText;
                xml_for_test = allText;
            }
        }
    }
    rawFile.send(null);
}

function loadXMl(filePath) {
    xml_for_test="";
    readTextFile("./"+filePath);
    return xml_for_test;
}

function printToIndex(testName,resulte) {
    var body= document.getElementById("001");
    if(resulte)
        body.innerText += "test "+testName+"\t-\tPass\n";
    else
        body.innerText += "test "+testName+"\t-\tFail\n";
}

function consoleToArray(){
    var arr = [];
    var cons =document.getElementById("ConsoleText1").value;
    cons = cons.replace(/event selected: /g,'');
    arr=cons.split("\n");
    if(arr.length>0)
        arr.pop();
    return arr;
}

function initConsole() {
    var textarea = document.createElement('textarea');
    textarea.setAttribute("id", "ConsoleText1");
    textarea.hidden = true;
    document.getElementById("001").appendChild(textarea);
}

var testRequestsList = function () {
    var expected = [["Hi"],["Goodbye"]];
    var statistic=[0,0];
    var resulte = [];
    var xml = loadXMl("XML_for_tests/HiOrGoodbye.xml");
    for (var j = 0 ; j<100 ; j++) {
        try {
            document.getElementById("ConsoleText1").value="";
            parse_graph(xml);
            resulte = consoleToArray();
        } catch (e) {
            console.log(e);
            return false;
        }
        if (resulte.length != 1)
            return false;
        for (let i = 0; i < expected.length; i++) {
            if (expected[i].toString() === resulte.toString()) {
                statistic[i] += 1;
            }
        }
    }
    if(statistic[0]+statistic[1] != 100)
        return false;
    if(statistic[0]>80 || statistic[1]>80)
        return false;
    return true;
}

var testHelloWorld = function () {
    var expected = ["Hello","World"];
    var resulte = [];
    var xml = loadXMl("XML_for_tests/Hello_World.xml");
    try {
        parse_graph(xml);
        resulte = consoleToArray();
        //console.log(window.eventsSelected);
    }catch (e) {
        console.log(e);
        return false;
    }
    return expected.toString() === resulte.toString();
}

var testHotCold = function () {
    var expected = ["Hot","Cold","Hot","Cold","Hot","Cold"];
    var resulte = [];
    var xml = loadXMl("XML_for_tests/HotCold.xml");
    try {
        parse_graph(xml);
        resulte = consoleToArray();
    }catch (e) {
        console.log(e);
        return false;
    }
    return expected.toString() === resulte.toString();
}

var testRandomOrder = function () {
    var expected = [["1","2","3","4"],["3","4","1","2"],["1","3","2","4"],["1","3","4","2"],["3","1","2","4"],["3","1","4","2"]];
    var statistic=[0,0,0,0,0,0];
    var resulte = [];
    var xml = loadXMl("XML_for_tests/RandomOrder.xml");
    for (var j = 0 ; j<100 ; j++) {
        try {
            document.getElementById("ConsoleText1").value="";
            parse_graph(xml);
            resulte = consoleToArray();
        } catch (e) {
            console.log(e);
            return false;
        }
        for (let i = 0; i < expected.length; i++) {
            if (expected[i].toString() === resulte.toString()) {
                statistic[i]+=1;
            }
        }
    }
    var sum = statistic.reduce(function(a, b){
        return a + b;
    }, 0);
    if(sum!=100)
        return false;
    for (var i =0 ; i<statistic.length ; i++)
        if(statistic[i]>=45){
            return false;
        }
    return true;
}

var testPayload =function () {
    var expected = ["[{\"x\":3},{\"y\":4}]"];
    var resulte = [];
    var xml = loadXMl("XML_for_tests/Payloads.xml");
    try {
        parse_graph(xml);
        resulte = consoleToArray();
    }catch (e) {
        console.log(e);
        return false;
    }
    return expected.toString() === resulte.toString();
}

var testPayloadChange =function () {
    var expected = ["[{\"x\":5},{\"y\":6}]"];
    var resulte = [];
    var xml = loadXMl("XML_for_tests/PayloadsChange.xml");
    try {
        parse_graph(xml);
        resulte = consoleToArray();
    }catch (e) {
        console.log(e);
        return false;
    }
    return expected.toString() === resulte.toString();
}

var testPayloadsIfElse =function () {
    var expected = ["{\"x\":3}"];
    var resulte = [];
    var xml = loadXMl("XML_for_tests/PayloadsIfElse.xml");
    try {
        parse_graph(xml);
        resulte = consoleToArray();
    }catch (e) {
        console.log(e);
        return false;
    }
    return expected.toString() === resulte.toString();
}

var testIllegalGraph = function () {
    var xml = loadXMl("XML_for_tests/UnlegalGraph.xml");
    var resulte=[];
    try {
        let doc = mxUtils.parseXml(xml);
        let codec = new mxCodec(doc);
        let model = new mxGraphModel();
        codec.decode(doc.documentElement, model);

        resulte = findInvalidCells(model);
    }catch (e) {
        console.log(e);
        return false;
    }
    if( resulte.length == 2 && ((resulte[0].isVertex() && resulte[1].isEdge()) || (resulte[1].isVertex() && resulte[0].isEdge())) )
        return true;
    else
        return false;
}

var testLegalGraph = function () {
    var xml = loadXMl("XML_for_tests/HotCold.xml");
    var resulte=[];
    try {
        let doc = mxUtils.parseXml(xml);
        let codec = new mxCodec(doc);
        let model = new mxGraphModel();
        codec.decode(doc.documentElement, model);

        resulte = findInvalidCells(model);
    }catch (e) {
        console.log(e);
        return false;
    }
    return resulte.length == 0 ;
}

var testExceptionHandle =function () {
    var expected = ["Before error"];
    var resulte = [];
    var xml = loadXMl("XML_for_tests/ExceptionHandle.xml");
    try {
        parse_graph(xml);
        resulte = consoleToArray();
    }catch (e) {
        console.log(e);
        return false;
    }
    return expected.toString() === resulte.toString();
}

var testExceptionHandle2 =function () {
    var expected = ["Before error","1","2","3","4","5","6"];
    var resulte = [];
    var xml = loadXMl("XML_for_tests/ExceptionHandle2.xml");
    try {
        parse_graph(xml);
        resulte = consoleToArray();
    }catch (e) {
        console.log(e);
        return false;
    }
    if(resulte.length==7) {
        for (var i = 0; i < resulte.length; i++)
            if (!expected.includes(resulte[i]))
                return false;
        return true;
    }
    return false;
}

var runTests = function() {
    function run(name,func) {
        initConsole();
        printToIndex(name,func());
    }

    run("RequestsList", testRequestsList);  //Checks that only one of the requests events has occurred
    run("HelloWorld", testHelloWorld);     //Checks the order of requests that occur
    run("RandomOrder", testRandomOrder);   //Checks that randomization of requests events occurrence from two scenarios that starting from two different start-nodes is legal.
    run("HotCold", testHotCold);           /* Checking the program hot cold:
                                               Checks the order of requests that occur in conjunction with block and wait events*/
    run("payload", testPayload);           //Check that the payloads that apply in the start node pass between nodes and check the current value of them
    run("payloadChange", testPayloadChange);    /*check that the payloads that apply in the start node can by change their value.
                                                    passes the payloads with the news changes between nodes and check the current new value of them*/
    run("PayloadsIfElse", testPayloadsIfElse);    //check that general node send other payloads to other outputs, according to the user-defined in the "if-else" condition.
    run("Illegal Graph", testIllegalGraph);         //check if the graph has a lonely start node or edge without target or source.
    run("LegalGraph", testLegalGraph);
    run("ExceptionHandle", testExceptionHandle);    //check that when occur error while executing the JS code on node the execution is terminated.
    run("ExceptionHandle2", testExceptionHandle2);    //check that when occur error while executing the JS code on node the execution is terminated.

}

var debug_testHelloWorld = function () {
    var expected = [{"stages":{"24":[{}]},"eventSelected":null},
        {"stages":{"26":[{}]},"eventSelected":null},
        {"stages":{"26":[{}]},"eventSelected":"Hello"},
        {"stages":{"27":[{}]},"eventSelected":null},
        {"stages":{"27":[{}]},"eventSelected":"World"}];
    var resulte = [];
    var xml = loadXMl("XML_for_tests/Hello_World.xml");
    try {
        parse_graph(xml);
        resulte = getProgramRecord();
        //console.log(window.eventsSelected);
    }catch (e) {
        console.log(e);
        return false;
    }
    return expected.toString() === resulte.toString();
}

var debug_testRequestsList = function () {
    var expected = [[{"stages":{"6":[{}]},"eventSelected":null},
        {"stages":{"7":[{}]},"eventSelected":null},
        {"stages":{"7":[{}]},"eventSelected":"Goodbye"}],
        [{"stages":{"6":[{}]},"eventSelected":null},
        {"stages":{"7":[{}]},"eventSelected":null},
        {"stages":{"7":[{}]},"eventSelected":"Hi"}]];
    var statistic=[0,0];
    var resulte = [];
    var xml = loadXMl("XML_for_tests/HiOrGoodbye.xml");
    for (var j = 0 ; j<100 ; j++) {
        try {
            document.getElementById("ConsoleText1").value="";
            parse_graph(xml);
            resulte = getProgramRecord();
        } catch (e) {
            console.log(e);
            return false;
        }
        if (resulte.length != 1)
            return false;
        for (let i = 0; i < expected.length; i++) {
            if (expected[i].toString() === resulte.toString()) {
                statistic[i] += 1;
            }
        }
    }
    if(statistic[0]+statistic[1] != 100)
        return false;
    if(statistic[0]>80 || statistic[1]>80)
        return false;
    return true;
}

var debug_testHotCold = function () {
    var expected = [{"stages":{"3":[{}],"12":[{}],"17":[{}]},"eventSelected":null},
        {"stages":{"2":[{}],"10":[{}],"18":[{}]},"eventSelected":null},
        {"stages":{"2":[{}],"10":[{}],"18":[{}]},"eventSelected":"Hot"},
        {"stages":{"5":[{}],"10":[{}],"19":[{}]},"eventSelected":null},
        {"stages":{"5":[{}],"10":[{}],"19":[{}]},"eventSelected":"Cold"},
        {"stages":{"5":[{}],"14":[{}],"18":[{}]},"eventSelected":null},
        {"stages":{"5":[{}],"14":[{}],"18":[{}]},"eventSelected":"Hot"},
        {"stages":{"6":[{}],"14":[{}],"19":[{}]},"eventSelected":null},
        {"stages":{"6":[{}],"14":[{}],"19":[{}]},"eventSelected":"Cold"},
        {"stages":{"6":[{}],"15":[{}],"18":[{}]},"eventSelected":null},
        {"stages":{"6":[{}],"15":[{}],"18":[{}]},"eventSelected":"Hot"},
        {"stages":{"15":[{}],"19":[{}]},"eventSelected":null},
        {"stages":{"15":[{}],"19":[{}]},"eventSelected":"Cold"},
        {"stages":{"18":[{}]},"eventSelected":null}]
    var resulte = [];
    var xml = loadXMl("XML_for_tests/HotCold.xml");
    try {
        parse_graph(xml);
        resulte = getProgramRecord();
    }catch (e) {
        console.log(e);
        return false;
    }
    return expected.toString() === resulte.toString();
}

var debug_testRandomOrder = function () {
    var expected = [[{"stages":{"2":[{}],"3":[{}]},"eventSelected":null},
        {"stages":{"4":[{}],"5":[{}]},"eventSelected":null},
        {"stages":{"4":[{}],"5":[{}]},"eventSelected":"3"},
        {"stages":{"4":[{}],"9":[{}]},"eventSelected":null},
        {"stages":{"4":[{}],"9":[{}]},"eventSelected":"1"},
        {"stages":{"8":[{}],"9":[{}]},"eventSelected":null},
        {"stages":{"8":[{}],"9":[{}]},"eventSelected":"2"},
        {"stages":{"9":[{}]},"eventSelected":null},
        {"stages":{"9":[{}]},"eventSelected":"4"},
        {"stages":{},"eventSelected":null}],

        [{"stages":{"2":[{}],"3":[{}]},"eventSelected":null},
            {"stages":{"4":[{}],"5":[{}]},"eventSelected":null},
            {"stages":{"4":[{}],"5":[{}]},"eventSelected":"1"},
            {"stages":{"5":[{}],"8":[{}]},"eventSelected":null},
            {"stages":{"5":[{}],"8":[{}]},"eventSelected":"2"},
            {"stages":{"5":[{}]},"eventSelected":null},
            {"stages":{"5":[{}]},"eventSelected":"3"},
            {"stages":{"9":[{}]},"eventSelected":null},
            {"stages":{"9":[{}]},"eventSelected":"4"},
            {"stages":{},"eventSelected":null}],

        [{"stages":{"2":[{}],"3":[{}]},"eventSelected":null},
            {"stages":{"4":[{}],"5":[{}]},"eventSelected":null},
            {"stages":{"4":[{}],"5":[{}]},"eventSelected":"1"},
            {"stages":{"5":[{}],"8":[{}]},"eventSelected":null},
            {"stages":{"5":[{}],"8":[{}]},"eventSelected":"3"},
            {"stages":{"8":[{}],"9":[{}]},"eventSelected":null},
            {"stages":{"8":[{}],"9":[{}]},"eventSelected":"4"},
            {"stages":{"8":[{}]},"eventSelected":null},
            {"stages":{"8":[{}]},"eventSelected":"2"},
            {"stages":{},"eventSelected":null}],

        [{"stages":{"2":[{}],"3":[{}]},"eventSelected":null},
            {"stages":{"4":[{}],"5":[{}]},"eventSelected":null},
            {"stages":{"4":[{}],"5":[{}]},"eventSelected":"3"},
            {"stages":{"4":[{}],"9":[{}]},"eventSelected":null},
            {"stages":{"4":[{}],"9":[{}]},"eventSelected":"4"},
            {"stages":{"4":[{}]},"eventSelected":null},
            {"stages":{"4":[{}]},"eventSelected":"1"},
            {"stages":{"8":[{}]},"eventSelected":null},
            {"stages":{"8":[{}]},"eventSelected":"2"},
            {"stages":{},"eventSelected":null}],

        [{"stages":{"2":[{}],"3":[{}]},"eventSelected":null},
            {"stages":{"4":[{}],"5":[{}]},"eventSelected":null},
            {"stages":{"4":[{}],"5":[{}]},"eventSelected":"1"},
            {"stages":{"5":[{}],"8":[{}]},"eventSelected":null},
            {"stages":{"5":[{}],"8":[{}]},"eventSelected":"3"},
            {"stages":{"8":[{}],"9":[{}]},"eventSelected":null},
            {"stages":{"8":[{}],"9":[{}]},"eventSelected":"2"},
            {"stages":{"9":[{}]},"eventSelected":null},
            {"stages":{"9":[{}]},"eventSelected":"4"},
            {"stages":{},"eventSelected":null}],

        [{"stages":{"2":[{}],"3":[{}]},"eventSelected":null},
            {"stages":{"4":[{}],"5":[{}]},"eventSelected":null},
            {"stages":{"4":[{}],"5":[{}]},"eventSelected":"3"},
            {"stages":{"4":[{}],"9":[{}]},"eventSelected":null},
            {"stages":{"4":[{}],"9":[{}]},"eventSelected":"1"},
            {"stages":{"8":[{}],"9":[{}]},"eventSelected":null},
            {"stages":{"8":[{}],"9":[{}]},"eventSelected":"4"},
            {"stages":{"8":[{}]},"eventSelected":null},
            {"stages":{"8":[{}]},"eventSelected":"2"},
            {"stages":{},"eventSelected":null}]];

    var statistic=[0,0,0,0,0,0];
    var resulte = [];
    var xml = loadXMl("XML_for_tests/RandomOrder.xml");
    for (var j = 0 ; j<100 ; j++) {
        try {
            document.getElementById("ConsoleText1").value="";
            parse_graph(xml);
            resulte = getProgramRecord();
        } catch (e) {
            console.log(e);
            return false;
        }
        for (let i = 0; i < expected.length; i++) {
            if (expected[i].toString() === resulte.toString()) {
                statistic[i]+=1;
            }
        }
    }
    var sum = statistic.reduce(function(a, b){
        return a + b;
    }, 0);
    if(sum!=100)
        return false;
    for (var i =0 ; i<statistic.length ; i++)
        if(statistic[i]>=45){
            return false;
        }
    return true;
}

var debug_testPayload =function () {
    var expected = [{"stages":{"12":[{"x":3},{"y":4}]}},
        {"stages":{"14":[{"x":3},{"y":4}]}},
        {"stages":{}}];
    var resulte = [];
    var xml = loadXMl("XML_for_tests/Payloads.xml");
    try {
        parse_graph(xml);
        resulte = getProgramRecord();
    }catch (e) {
        console.log(e);
        return false;
    }
    return expected.toString() === resulte.toString();
}

var debug_testPayloadChange =function () {
    var expected = [{"stages":{"21":[{"x":3},{"y":2}]}},
        {"stages":{"33":[{"x":3},{"y":2}]}},
        {"stages":{"24":[{"x":5},{"y":6}]}},
        {"stages":{}}];
    var resulte = [];
    var xml = loadXMl("XML_for_tests/PayloadsChange.xml");
    try {
        parse_graph(xml);
        resulte = getProgramRecord();
    }catch (e) {
        console.log(e);
        return false;
    }
    return expected.toString() === resulte.toString();
}

var debug_testPayloadsIfElse =function () {
    var expected = [{"stages":{"3":[{"x":5},{"x":3},{}]}},
        {"stages":{"6":[{"x":5},{"x":3},{}]}},
        {"stages":{"10":{"x":3}}},
        {"stages":{}}];
    var resulte = [];
    var xml = loadXMl("XML_for_tests/PayloadsIfElse.xml");
    try {
        parse_graph(xml);
        resulte = getProgramRecord();
    }catch (e) {
        console.log(e);
        return false;
    }
    return expected.toString() === resulte.toString();
}

runTests();

