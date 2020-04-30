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

var testHiOrGoodbye = function () {
    var expected = ["Hi","Goodbye"];
    var resulte = [];
    var xml = loadXMl("XML_for_tests/HiOrGoodbye.xml");
    try {
        parse_graph(xml);
        resulte = window.eventsSelected;
       // console.log(window.eventsSelected);
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
        resulte = window.eventsSelected;
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
        resulte = window.eventsSelected;
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
        resulte = window.eventsSelected;
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

var runTests = function() {
    printToIndex("HeyOrGoodbye", testHiOrGoodbye());
    printToIndex("HelloWorld", testHelloWorld());
    printToIndex("HotCold", testHotCold());
    printToIndex("RandomOrder", testRandomOrder());
}

runTests();
