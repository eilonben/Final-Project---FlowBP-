var xml_for_test="";
var debug = new debuggerBP(uiBP);


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

/** load the string of the xml file
 *
 * @param filePath -string
 * @returns {string}
 */
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
            parse_graph(xml,debug);
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
        parse_graph(xml,debug);
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
        parse_graph(xml,debug);
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
            parse_graph(xml,debug);
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
    var expected = ["{\"x\":3},{\"y\":4}"];
    var resulte = [];
    var xml = loadXMl("XML_for_tests/Payloads.xml");
    try {
        parse_graph(xml,debug);
        resulte = consoleToArray();
    }catch (e) {
        console.log(e);
        return false;
    }
    return expected.toString() === resulte.toString();
}

var testPayloadChange =function () {
    var expected = ["{\"x\":5}"];
    var resulte = [];
    var xml = loadXMl("XML_for_tests/PayloadsChange.xml");
    try {
        parse_graph(xml,debug);
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
        parse_graph(xml,debug);
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
        parse_graph(xml,debug);
        resulte = consoleToArray();
    }catch (e) {
        console.log(e);
        return false;
    }
    return expected.toString() === resulte.toString();
}

var testExceptionHandle2 =function () {
    var expected = ["before error","1","2","3","4","5","6"];
    var resulte = [];
    var xml = loadXMl("XML_for_tests/ExceptionHandle2.xml");
    try {
        parse_graph(xml,debug);
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

var testTicTacToe = function(){
    var resulte = [];
    var xml = loadXMl("XML_for_tests/TicTacToe.xml");
    try {
        parse_graph(xml,debug);
        resulte = consoleToArray();
    }catch (e) {
        console.log(e);
        return false;
    }
    if(resulte.length!=9)
        return false;
    // not duplicate places
    var places = {};
    var sign =  resulte.map((x)=>{return x.substring(0,1);});
    var turn = "X";
    for (let i = 0; i < 9 ; i++) {
        if (turn != sign[i])
            return false;
        else turn == "X" ? turn="O" : turn="X";
        if (places[resulte[i].substring(1)] != undefined)
            return false;
        places[resulte[i].substring(1)]=1;

    }
    return true;
};


var  debug_compareResulte = function(resulte,expected){
    for (let i = 0; i < resulte.length; i++) {
        if (JSON.stringify( expected[i].stages) != JSON.stringify(resulte[i].stages) || resulte[i].eventSelected!=expected[i].eventSelected)
            return false;
    }
    return true;

}

var debug_testHelloWorld = function () {
    var expected = [{"stages":{"28":[{}]},"eventSelected":null},
        {"stages":{"29":[{}]},"eventSelected":null},
        {"stages":{"29":[{}]},"eventSelected":"Hello"},
        {"stages":{"34":[{}]},"eventSelected":null},
        {"stages":{"34":[{}]},"eventSelected":"World"}];
    var resulte = [];
    var xml = loadXMl("XML_for_tests/Hello_World.xml");
    try {
        parse_graph(xml,debug);
        resulte = debug.getProgramRecord();
        //console.log(window.eventsSelected);
    }catch (e) {
        console.log(e);
        return false;
    }
    return debug_compareResulte(resulte,expected);
}

var debug_testRequestsList = function () {
    var expected = [[{"stages":{"9":[{}]},"eventSelected":null},
        {"stages":{"10":[{}]},"eventSelected":null},
        {"stages":{"10":[{}]},"eventSelected":"Goodbye"}],
        [{"stages":{"9":[{}]},"eventSelected":null},
        {"stages":{"10":[{}]},"eventSelected":null},
        {"stages":{"10":[{}]},"eventSelected":"Hi"}]];
    var statistic=[0,0];
    var resulte = [];
    var xml = loadXMl("XML_for_tests/HiOrGoodbye.xml");
    for (var j = 0 ; j<100 ; j++) {
        try {
            document.getElementById("ConsoleText1").value="";
            parse_graph(xml,debug);
            resulte = debug.getProgramRecord();
        } catch (e) {
            console.log(e);
            return false;
        }

        for (let i = 0; i < expected.length; i++) {
            if (debug_compareResulte(resulte,expected[i])) {
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
    var expected = [{"stages":{"23":[{}],"24":[{}],"25":[{}]},"eventSelected":null},
        {"stages":{"26":[{}],"31":[{}],"36":[{}]},"eventSelected":null},
        {"stages":{"26":[{}],"31":[{}],"36":[{}]},"eventSelected":"Hot"},
        {"stages":{"31":[{}],"41":[{}],"67":[{}]},"eventSelected":null},
        {"stages":{"31":[{}],"41":[{}],"67":[{}]},"eventSelected":"Cold"},
        {"stages":{"36":[{}],"41":[{}],"55":[{}]},"eventSelected":null},
        {"stages":{"36":[{}],"41":[{}],"55":[{}]},"eventSelected":"Hot"},
        {"stages":{"46":[{}],"55":[{}],"67":[{}]},"eventSelected":null},
        {"stages":{"46":[{}],"55":[{}],"67":[{}]},"eventSelected":"Cold"},
        {"stages":{"36":[{}],"46":[{}],"60":[{}]},"eventSelected":null},
        {"stages":{"36":[{}],"46":[{}],"60":[{}]},"eventSelected":"Hot"},
        {"stages":{"60":[{}],"67":[{}]},"eventSelected":null},
        {"stages":{"60":[{}],"67":[{}]},"eventSelected":"Cold"},
        {"stages":{"36":[{}]},"eventSelected":null}];
    var resulte = [];
    var xml = loadXMl("XML_for_tests/HotCold.xml");
    try {
        parse_graph(xml,debug);
        resulte = debug.getProgramRecord();
    }catch (e) {
        console.log(e);
        return false;
    }
    return debug_compareResulte(resulte,expected);;
}

var debug_testRandomOrder = function () {
    var expected = [[{"stages":{"12":[{}],"13":[{}]},"eventSelected":null},
        {"stages":{"14":[{}],"19":[{}]},"eventSelected":null},
        {"stages":{"14":[{}],"19":[{}]},"eventSelected":"3"},
        {"stages":{"14":[{}],"29":[{}]},"eventSelected":null},
        {"stages":{"14":[{}],"29":[{}]},"eventSelected":"1"},
        {"stages":{"24":[{}],"29":[{}]},"eventSelected":null},
        {"stages":{"24":[{}],"29":[{}]},"eventSelected":"2"},
        {"stages":{"29":[{}]},"eventSelected":null},
        {"stages":{"29":[{}]},"eventSelected":"4"}],

        [{"stages":{"12":[{}],"13":[{}]},"eventSelected":null},
            {"stages":{"14":[{}],"19":[{}]},"eventSelected":null},
            {"stages":{"14":[{}],"19":[{}]},"eventSelected":"1"},
            {"stages":{"19":[{}],"24":[{}]},"eventSelected":null},
            {"stages":{"19":[{}],"24":[{}]},"eventSelected":"2"},
            {"stages":{"19":[{}]},"eventSelected":null},
            {"stages":{"19":[{}]},"eventSelected":"3"},
            {"stages":{"29":[{}]},"eventSelected":null},
            {"stages":{"29":[{}]},"eventSelected":"4"}],

        [{"stages":{"12":[{}],"13":[{}]},"eventSelected":null},
            {"stages":{"14":[{}],"19":[{}]},"eventSelected":null},
            {"stages":{"14":[{}],"19":[{}]},"eventSelected":"1"},
            {"stages":{"19":[{}],"24":[{}]},"eventSelected":null},
            {"stages":{"19":[{}],"24":[{}]},"eventSelected":"3"},
            {"stages":{"24":[{}],"29":[{}]},"eventSelected":null},
            {"stages":{"24":[{}],"29":[{}]},"eventSelected":"4"},
            {"stages":{"24":[{}]},"eventSelected":null},
            {"stages":{"24":[{}]},"eventSelected":"2"}],

        [{"stages":{"12":[{}],"13":[{}]},"eventSelected":null},
            {"stages":{"14":[{}],"19":[{}]},"eventSelected":null},
            {"stages":{"14":[{}],"19":[{}]},"eventSelected":"3"},
            {"stages":{"14":[{}],"29":[{}]},"eventSelected":null},
            {"stages":{"14":[{}],"29":[{}]},"eventSelected":"4"},
            {"stages":{"14":[{}]},"eventSelected":null},
            {"stages":{"14":[{}]},"eventSelected":"1"},
            {"stages":{"24":[{}]},"eventSelected":null},
            {"stages":{"24":[{}]},"eventSelected":"2"}],

            [{"stages":{"12":[{}],"13":[{}]},"eventSelected":null},
                {"stages":{"14":[{}],"19":[{}]},"eventSelected":null},
                {"stages":{"14":[{}],"19":[{}]},"eventSelected":"1"},
                {"stages":{"19":[{}],"24":[{}]},"eventSelected":null},
                {"stages":{"19":[{}],"24":[{}]},"eventSelected":"3"},
                {"stages":{"24":[{}],"29":[{}]},"eventSelected":null},
                {"stages":{"24":[{}],"29":[{}]},"eventSelected":"2"},
                {"stages":{"29":[{}]},"eventSelected":null},
                {"stages":{"29":[{}]},"eventSelected":"4"}],

        [{"stages":{"12":[{}],"13":[{}]},"eventSelected":null},
            {"stages":{"14":[{}],"19":[{}]},"eventSelected":null},
            {"stages":{"14":[{}],"19":[{}]},"eventSelected":"3"},
            {"stages":{"14":[{}],"29":[{}]},"eventSelected":null},
            {"stages":{"14":[{}],"29":[{}]},"eventSelected":"1"},
            {"stages":{"24":[{}],"29":[{}]},"eventSelected":null},
            {"stages":{"24":[{}],"29":[{}]},"eventSelected":"4"},
            {"stages":{"24":[{}]},"eventSelected":null},
            {"stages":{"24":[{}]},"eventSelected":"2"},
            {"stages":{},"eventSelected":null}]];

    var statistic=[0,0,0,0,0,0];
    var resulte = [];
    var xml = loadXMl("XML_for_tests/RandomOrder.xml");
    for (var j = 0 ; j<100 ; j++) {
        try {
            document.getElementById("ConsoleText1").value="";
            parse_graph(xml,debug);
            resulte = debug.getProgramRecord();
        } catch (e) {
            console.log(e);
            return false;
        }
        for (let i = 0; i < expected.length; i++) {
            if (debug_compareResulte(resulte,expected[i])) {
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
    var expected = [{"stages":{"2":[{"x":3},{"y":4}]}},
        {"stages":{"3":[{"x":3},{"y":4}]}}];
    var resulte = [];
    var xml = loadXMl("XML_for_tests/Payloads.xml");
    try {
        parse_graph(xml,debug);
        resulte = debug.getProgramRecord();
    }catch (e) {
        console.log(e);
        return false;
    }
    return debug_compareResulte(resulte,expected);
}

var debug_testPayloadChange =function () {
    var expected = [{"stages":{"2":[{"x":3}]}},
        {"stages":{"9":[{"x":3}]}},
        {"stages":{"14":[{"x":5}]}}];
    var resulte = [];
    var xml = loadXMl("XML_for_tests/PayloadsChange.xml");
    try {
        parse_graph(xml,debug);
        resulte = debug.getProgramRecord();
    }catch (e) {
        console.log(e);
        return false;
    }
    return debug_compareResulte(resulte,expected);
}

var debug_testPayloadsIfElse =function () {
    var expected = [{"stages":{"20":[{"x":5},{"x":3},{}]}},
        {"stages":{"6":[{"x":5},{"x":3},{}]}},
        {"stages":{"10":{"x":3}}},
        {"stages":{}}];
    var resulte = [];
    var xml = loadXMl("XML_for_tests/PayloadsIfElse.xml");
    try {
        parse_graph(xml,debug);
        resulte = debug.getProgramRecord();
    }catch (e) {
        console.log(e);
        return false;
    }
    return debug_compareResulte(resulte,expected);
}

var runTests = function() {
    document.getElementById("001").innerText="";
    window.alert = function() {};
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
    run("ExceptionHandle2", testExceptionHandle2);
    run("TicTacToe", testTicTacToe);

    run("debug_HelloWorld", debug_testHelloWorld);
    run("debug_RandomOrder", debug_testRequestsList);
    run("debug_HotCold", debug_testHotCold);
    run("debug_RandomOrder", debug_testRandomOrder);
    run("debug_testPayload", debug_testPayload);
    run("debug_testPayloadChange", debug_testPayloadChange);
    run("debug_testPayloadsIfElse", debug_testPayloadsIfElse);
}

runTests();

