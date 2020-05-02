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
var testRequestsList = function () {
    var expected = ["Hi","Goodbye"];
    var resulte = [];
    var xml = loadXMl("XML_for_tests/HiOrGoodbye.xml");
    try {
        parse_graph(xml);
        resulte = consoleToArray();
    }catch (e) {
        console.log(e);
        return false;
    }
    if (resulte.length != 1)
        return false;
    return expected.includes(resulte[0]);
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
       // console.log(window.eventsSelected);
    }catch (e) {
        console.log(e);
        return false;
    }
    return expected.toString() === resulte.toString();
}

var testRandomOrder = function () {
    var expected = [["1","2","3","4"],["3","4","1","2"],["1","3","2","4"],["1","3","4","2"],["3","1","2","4"],["3","1","4","2"]];
    var resulte = [];
    var xml = loadXMl("XML_for_tests/RandomOrder.xml");
    try {
        parse_graph(xml);
        resulte = consoleToArray();
        // console.log(window.eventsSelected);
    }catch (e) {
        console.log(e);
        return false;
    }
    for (let i = 0; i < expected.length; i++) {
        if (expected[i].toString() === resulte.toString())
            return true;
    }
    return false;
}

var testPayload =function () {
    var expected = [3,4];
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
    var expected = [5,6];
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
    var expected = [["3","undefined"],["undefined","3"]];
    var resulte = [];
    var xml = loadXMl("XML_for_tests/PayloadsIfElse.xml");
    try {
        parse_graph(xml);
        resulte = consoleToArray();
    }catch (e) {
        console.log(e);
        return false;
    }
    for (let i = 0; i < expected.length; i++) {
        if (expected[i].toString() === resulte.toString())
            return true;
    }
    return false;
}

function initConsole() {
    var textarea = document.createElement('textarea');
    textarea.setAttribute("id", "ConsoleText1");
    textarea.hidden = true;
    document.getElementById("001").appendChild(textarea);
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
}

runTests();
