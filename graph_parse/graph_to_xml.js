//decode the xml string received from Actions.js
function parse_graph(xml_code) {
    // console.log(xml_code);
    let doc = mxUtils.parseXml(xml_code);
    let codec = new mxCodec(doc);
    let model = new mxGraphModel();
    codec.decode(doc.documentElement, model);
    // var cells = model.cells;
    // var arr = Object.keys(cells).map(function(key){return cells[key]});
    // var codeNds = model.filterCells(arr,
    //     function (cell) {
    //         return cell.getAttribute("code") !==undefined && cell.getAttribute("code")!=='';
    //     });
    // var functions = "//Functions generated from BP Flow\n"
    // for (var i =0;i<codeNds.length; i++) {
    //     var funcName = codeNds[i].getId();
    //     var code = codeNds[i].getAttribute("code");
    //     functions += ("// Code from " + codeNds[i].getAttribute("name") + "\n");
    //     functions += "function f" + funcName + "(ctx,t,bp) {\n" + code + "\n}\n";
    // }
    // eval(functions);
    startRunning(model);
}


