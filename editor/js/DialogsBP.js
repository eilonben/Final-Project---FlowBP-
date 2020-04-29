var BSyncForm = function (editorUi, cell) {

    var graph = editorUi.editor.graph;
    var value = graph.getModel().getValue(cell);

    // Converts the value to an XML node
    if (!mxUtils.isNode(value)) {
        var doc = mxUtils.createXmlDocument();
        var obj = doc.createElement('object');
        obj.setAttribute('label', value || '');
        value = obj;
    }


    w = 800;
    h = 350;
    noHide = true;
    var row, td

    var table = document.createElement('table');
    var tbody = document.createElement('tbody');

    row = document.createElement('tr');

    td = document.createElement('td');
    td.style.fontSize = '10pt';
    td.style.width = '100px';
    // mxUtils.writeln(tbody, "BSync Form");
    // mxUtils.writeln(tbody, "");


    row.appendChild(td);
    tbody.appendChild(row);

    this.init = function () {

    };

    var linkInput = {};

    addSec = function (lbl) {
        mxUtils.write(td, lbl);
        linkInput[lbl] = document.createElement('input');
        linkInput[lbl].setAttribute('type', 'text');
        linkInput[lbl].style.marginTop = '6px';
        linkInput[lbl].style.width = '300px';
        linkInput[lbl].style.backgroundRepeat = 'no-repeat';
        linkInput[lbl].style.backgroundPosition = '100% 50%';
        linkInput[lbl].style.paddingRight = '0px';
        td.appendChild(linkInput[lbl]);
        row.appendChild(td);

        tbody.appendChild(row);

        if (value.getAttribute(lbl) != undefined)
            linkInput[lbl].value = value.getAttribute(lbl);
    }

    addSec("Request");
    addSec("Wait");
    addSec("Block");


    row = document.createElement('tr');
    td = document.createElement('td');
    td.style.paddingTop = '14px';
    td.style.whiteSpace = 'nowrap';
    td.setAttribute('align', 'left');

    var genericBtn = mxUtils.button(mxResources.get('apply'), function () {
        var lst = ["Request", "Wait", "Block"];
        lst.map(x => {
            if (linkInput[x].value.length != 0) linkInput[x].value = "\"" + linkInput[x].value + "\""
        });
        value.setAttribute("sync", "{\"request\":[" + linkInput["Request"].value + "], \"wait\":[" + linkInput["Wait"].value + "],\"block\":[" + linkInput["Block"].value + "]}");
        lst.map(x => {
            if (linkInput[x].value.length != 0) linkInput[x].value = linkInput[x].value.replace(/\"/g, '')
        });
        value.setAttribute("Request", linkInput["Request"].value);
        value.setAttribute("Wait", linkInput["Wait"].value);
        value.setAttribute("Block", linkInput["Block"].value);
        value.setAttribute("label", "request: " + linkInput["Request"].value + "\nwait: " + linkInput["Wait"].value + "\nblock: " + linkInput["Block"].value);
        graph.getModel().setValue(cell, value);
        // graph.updateCellSize(cell, true);


        editorUi.hideDialog();
    });
    genericBtn.className = 'geBtn gePrimaryBtn';
    td.appendChild(genericBtn);


    if (!editorUi.editor.cancelFirst) {
        td.appendChild(genericBtn);
    }

    row.appendChild(td);
    tbody.appendChild(row);
    table.appendChild(tbody);
    this.container = table;

};


/**
 * Constructs a new code editor dialog.
 */
var CodeEditorDialog = function (editorUi, cell) {

    var graph = editorUi.editor.graph;
    var value = graph.getModel().getValue(cell);

    // Converts the value to an XML node
    if (!mxUtils.isNode(value)) {
        var doc = mxUtils.createXmlDocument();
        var obj = doc.createElement('object');
        obj.setAttribute('label', value || '');
        value = obj;
    }


    w = 500;
    h = 350;
    noHide = true;
    var row, td;

    var table = document.createElement('table');
    var tbody = document.createElement('tbody');

    row = document.createElement('tr');

    td = document.createElement('td');
    td.style.fontSize = '10pt';
    td.style.width = '100px';
    mxUtils.write(td, "Code Editor: GeneralBlockFunction(Payloads){");

    row.appendChild(td);
    tbody.appendChild(row);

    row = document.createElement('tr');
    td = document.createElement('td');

    var nameInput = document.createElement('textarea');
    var editor;


    nameInput.value = value.getAttribute('code');

    nameInput.setAttribute('wrap', 'off');

    nameInput.setAttribute('spellcheck', 'false');
    nameInput.setAttribute('autocorrect', 'off');
    nameInput.setAttribute('autocomplete', 'off');
    nameInput.setAttribute('autocapitalize', 'off');

    // mxUtils.write(nameInput, url || '');
    nameInput.style.resize = 'none';
    nameInput.style.width = w + 'px';
    nameInput.style.height = h + 'px';

    this.textarea = nameInput;


    this.init = function () {
        nameInput.focus();
        nameInput.scrollTop = 0;

        editor = CodeMirror.fromTextArea(this.textarea, {
            lineNumbers: true,
            // fixedGutter: true,
            autofocus: true,
        });
    };

    td.appendChild(nameInput);
    row.appendChild(td);

    tbody.appendChild(row);

    row = document.createElement('tr');
    td = document.createElement('td');
    td.style.paddingTop = '14px';
    td.style.whiteSpace = 'nowrap';
    td.setAttribute('align', 'right');

    var cancelBtn = mxUtils.button(mxResources.get('cancel'), function () {
        editorUi.hideDialog();
    });
    cancelBtn.className = 'geBtn gePrimaryBtn';

    if (editorUi.editor.cancelFirst) {
        td.appendChild(cancelBtn);
    }
    td = document.createElement('td');
    mxUtils.write(td, "}");


    {
        let genericBtn = mxUtils.button(mxResources.get('apply'), function () {

            try {
                let syntax = esprima.parse(" let d = function(payloads){ " + editor.getValue() + "}");
                console.log(JSON.stringify(syntax, null, 4));
            }
            catch (error) {
                alert("There has been a syntax error in the javaScript code.\n " + error);
                return;
            }
            editorUi.hideDialog();
            value.setAttribute("code", editor.getValue());
            graph.getModel().setValue(cell, value);
        });

        genericBtn.className = 'geBtn gePrimaryBtn';
        td.appendChild(genericBtn);
    }

    if (!editorUi.editor.cancelFirst) {
        td.appendChild(cancelBtn);
    }

    row.appendChild(td);
    tbody.appendChild(row);
    table.appendChild(tbody);
    this.container = table;
};


var StartNodeForm = function (editorUi, cell) {

    var graph = editorUi.editor.graph;
    var value = graph.getModel().getValue(cell);

    // Converts the value to an XML node
    if (!mxUtils.isNode(value)) {
        var doc = mxUtils.createXmlDocument();
        var obj = doc.createElement('object');
        obj.setAttribute('label', value || '');
        value = obj;
    }


    w = 800;
    h = 350;
    noHide = true;
    var row, td

    var table = document.createElement('table');
    var tbody = document.createElement('tbody');

    row = document.createElement('tr');

    td = document.createElement('td');
    td.style.fontSize = '10pt';
    td.style.width = '100px';
    // mxUtils.writeln(tbody, "BSync Form");
    // mxUtils.writeln(tbody, "");


    row.appendChild(td);
    tbody.appendChild(row);

    this.init = function () {

    };

    mxUtils.write(td, "Initial Payload");
    var input = document.createElement('input');
    input.setAttribute('type', 'text');
    input.style.marginTop = '6px';
    input.style.width = '300px';
    input.style.backgroundRepeat = 'no-repeat';
    input.style.backgroundPosition = '100% 50%';
    input.style.paddingRight = '0px';
    td.appendChild(input);
    row.appendChild(td);

    tbody.appendChild(row);

    if (value.getAttribute("payload") !== undefined)
        input.value = value.getAttribute("payload");


    row = document.createElement('tr');
    td = document.createElement('td');
    td.style.paddingTop = '14px';
    td.style.whiteSpace = 'nowrap';
    td.setAttribute('align', 'left');
    {

        var genericBtn = mxUtils.button(mxResources.get('apply'), function () {
            value.setAttribute("payload", input.value);
            graph.getModel().setValue(cell, value);

            editorUi.hideDialog();
        });
        genericBtn.className = 'geBtn gePrimaryBtn';
        td.appendChild(genericBtn);
    }

    if (!editorUi.editor.cancelFirst) {
        td.appendChild(genericBtn);
    }

    row.appendChild(td);
    tbody.appendChild(row);
    table.appendChild(tbody);
    this.container = table;
};

var ConsoleDialog = function (editorUi, cell) {

    var graph = editorUi.editor.graph;
    var value = graph.getModel().getValue(cell);

    // Converts the value to an XML node
    if (!mxUtils.isNode(value)) {
        var doc = mxUtils.createXmlDocument();
        var obj = doc.createElement('object');
        obj.setAttribute('label', value || '');
        value = obj;
    }


    w = 500;
    h = 350;
    noHide = true;
    var row, td;

    var table = document.createElement('table');
    var tbody = document.createElement('tbody');

    row = document.createElement('tr');

    td = document.createElement('td');
    td.style.fontSize = '10pt';
    td.style.width = '100px';
    mxUtils.write(td, "Console Code Editor: function(payloads){");
    row.appendChild(td);
    tbody.appendChild(row);

    row = document.createElement('tr');
    td = document.createElement('td');

    var nameInput = document.createElement('textarea');
    var editor;


    nameInput.value = value.getAttribute('log');

    nameInput.setAttribute('wrap', 'off');

    nameInput.setAttribute('spellcheck', 'false');
    nameInput.setAttribute('autocorrect', 'off');
    nameInput.setAttribute('autocomplete', 'off');
    nameInput.setAttribute('autocapitalize', 'off');

    // mxUtils.write(nameInput, url || '');
    nameInput.style.resize = 'none';
    nameInput.style.width = w + 'px';
    nameInput.style.height = h + 'px';

    this.textarea = nameInput;


    this.init = function () {
        nameInput.focus();
        nameInput.scrollTop = 0;

        editor = CodeMirror.fromTextArea(this.textarea, {
            lineNumbers: true,
            // fixedGutter: true,
            autofocus: true,
        });
    };

    td.appendChild(nameInput);
    row.appendChild(td);

    tbody.appendChild(row);

    row = document.createElement('tr');
    td = document.createElement('td');
    td.style.paddingTop = '14px';
    td.style.whiteSpace = 'nowrap';
    td.setAttribute('align', 'right');

    var cancelBtn = mxUtils.button(mxResources.get('cancel'), function () {
        editorUi.hideDialog();
    });
    cancelBtn.className = 'geBtn gePrimaryBtn';

    if (editorUi.editor.cancelFirst) {
        td.appendChild(cancelBtn);
    }
    td = document.createElement('td');
    mxUtils.write(td, "}");


    {
        let genericBtn = mxUtils.button(mxResources.get('apply'), function () {

            try {
                let syntax = esprima.parse(" let d = function(payloads){ " + editor.getValue() + "}");
                console.log(JSON.stringify(syntax, null, 4));
            }
            catch (error) {
                alert("There has been a syntax error in the javaScript code.\n " + error);
                return;
            }
            editorUi.hideDialog();
            value.setAttribute("log", editor.getValue());
            graph.getModel().setValue(cell, value);
        });

        genericBtn.className = 'geBtn gePrimaryBtn';
        td.appendChild(genericBtn);
    }

    if (!editorUi.editor.cancelFirst) {
        td.appendChild(cancelBtn);
    }

    row.appendChild(td);
    tbody.appendChild(row);
    table.appendChild(tbody);
    this.container = table;
};

var showConsoleDialog = function (editorUi) {

    var td,row;
    var table = document.createElement('table');
    var tbody = document.createElement('tbody');

    row = document.createElement('tr');
    td = document.createElement('td');
    td.style.fontSize = '10pt';
    td.style.width = '100px';
    mxUtils.write(td, "Current Console Log: ");
    row.appendChild(td);
    tbody.appendChild(row);
    row = document.createElement('tr');
    td = document.createElement('td');
    var textarea = document.createElement('textarea');
    textarea.setAttribute('wrap', 'off');
    textarea.setAttribute('spellcheck', 'false');
    textarea.setAttribute('autocorrect', 'off');
    textarea.setAttribute('autocomplete', 'off');
    textarea.setAttribute('autocapitalize', 'off');
    textarea.style.overflow = 'auto';
    textarea.style.resize = 'none';
    textarea.style.width = '600px';
    textarea.style.height = '360px';
    textarea.style.marginBottom = '16px';
    if (window.consoleLog === undefined) {
        textarea.value = "";
    }
    else {
        textarea.value = window.consoleLog;
    }
    td.appendChild(textarea);

    this.init = function () {
        textarea.focus();
    };
    var okBtn = mxUtils.button(mxResources.get('ok'), function () {
        editorUi.hideDialog();
    });
    okBtn.className = 'geBtn gePrimaryBtn';
    td.appendChild(okBtn);
    row.appendChild(td);
    tbody.appendChild(row);
    table.appendChild(tbody);
    this.container = table;
};

//for export & save as..  actions
ExportDialog.saveLocalFile = function (editorUi, data, filename, format) {

    editorUi.hideDialog();

    function download(data, filename, type) {
        var file = new Blob([data], {type: type});
        if (window.navigator.msSaveOrOpenBlob) // IE10+
            window.navigator.msSaveOrOpenBlob(file, filename);
        else { // Others
            var a = document.createElement("a"),
                url = URL.createObjectURL(file);
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(function () {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 0);
        }
    }

    download(data, filename, format);
};