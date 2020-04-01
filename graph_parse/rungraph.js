

window.bpEngine = {
    BThreads: [],

    sync: function* (stmt){
        yield stmt;
    },

    registerBThread: (bt) => {
        let x = bt.next().value;
        let b = {iterator: bt, stmt: fixStmt(x)};
        window.bpEngine.BThreads.push(b);
    },

    run: function*(){
        while(true)
        {
            let e = getEvent();
            if(e === null)
                yield 'waiting for an event';
            console.log(e + "\n");
            mxUtils.alert("event selected: " + e + "\n");
            window.bpEngine.BThreads.forEach(bt => {
                if(isReqWait(bt, e)) {
                    bt.stmt = fixStmt(bt.iterator.next().value)
                }
            })
        }
    }
}

// to be implemented
function waitForEvent(){}

function fixStmt(stmt){
    if (stmt===undefined)
        return {request:[],block:[],wait:[]};
    if(stmt.request === undefined)
        stmt.request = [];
    if(stmt.block === undefined)
        stmt.block = [];
    if( stmt.wait === undefined)
        stmt.wait = [];
    return stmt
}

function isReqWait(bt, e) {
    return bt.stmt.request.includes(e) || bt.stmt.wait.includes(e)
}

function getEvent() {
    let requests = new Set();
    let blocks = new Set();
    window.bpEngine.BThreads.forEach(bt => {
        bt.stmt.request.forEach(requests.add, requests)
        bt.stmt.block.forEach(blocks.add, blocks)
    })
    let diff = [...requests].filter(x => ![...blocks].includes(x));
    return getRandomItem(diff);
}

// get random item from a Set
function getRandomItem(set) {
    let items = Array.from(set);
    if(items.length == 0)
        return null;
    return items[Math.floor(Math.random() * items.length)];
}

function* goToFollowers(c, contxt, ths, bpEngine,model) {
	 var edg = model.getEdges(c, false, true, true);
	if (contxt.forward !== undefined) {
		edg=edg.filter(n =>  Object.keys(contxt.forward).indexOf(""+n.getAttribute("name"))!== -1);
	}

	
	if (edg.length > 0) {
		// Run extra followers in new threads
		for (var i = 1; i < edg.length; i++) {
		    let target = edg[i].getTerminal(false);
			if(target!== undefined) {
				var ctx = ((contxt.forward == undefined) ? contxt : contxt.forward[edg[i].getAttribute("name")]);
				ctx.forward = undefined;
			
				runInNewBT(target,ctx,bpEngine);
			}
		}	
		
		// Run the first follower in the same thread.
		if(edg[0].getTerminal(false)!== undefined) {
			var ctx = ((contxt.forward == undefined) ? contxt : contxt.forward[edg[0].getAttribute("name")]);
			ctx.forward = undefined;
			
			yield* runInSameBT(edg[0].getTerminal(false), ctx, ths, bpEngine,model);
		}
	}
}

function runInNewBT(c, ctx,bpEngine,model) {
	// Cloning - Is this the right way?
	var contxt = JSON.parse(JSON.stringify(ctx));
	window.bpEngine.registerBThread(function* () {
		// eval("var f=f" + c.getId());
		//
		// f(contxt, this, bpEngine);
        if (c.getAttribute("sync") !==undefined)
            yield JSON.parse(c.getAttribute("sync"));
        yield* goToFollowers(c, contxt, this, bpEngine,model);
	}());
};

function getshape(str) {
    var arr = str.split(";");
    return arr[0].split("=")[1].split(".")[1];

}

function* runInSameBT(c, contxt, ths, bpEngine,model) {
	// eval("var f=f" + c.getId());
	//
	// f(contxt, ths, bpEngine);

    if (c.getAttribute("sync") !==undefined)
        yield JSON.parse(c.getAttribute("sync"));

	yield *goToFollowers(c, contxt, ths, bpEngine,model);
};

function startRunning(model) {
// Start the context nodes
    var cells = model.cells;
    var arr = Object.keys(cells).map(function(key){return cells[key]});
    var contextNds = model.filterCells(arr,
        function (cell) {
            return cell.getStyle() !== undefined && getshape(cell.getStyle())==="startnode";
        });
    for (var i =0;i<contextNds.length; i++) {
    	runInNewBT(contextNds[i],{},bpEngine,model);
    }
    window.bpEngine.run().next();
    window.bpEngine.BThreads = [];
}
// function f1(){}
// function f2(){}
// function f3(){}
// function f4(){}
// var c1 ={getId: function(){return 1},
// 	     sync: {request:['hot']}
// 	};
// var c2 ={getId: function(){return 2},
//     sync: {request:['cold']}
// };
// var c3 ={getId: function(){return 3},
//     sync: {wait:['hot'],block:['cold']}
// };
// var c4 ={getId: function(){return 4},
//     sync: {request:["hhhhhh"]}
// };
// bpEngine1=Object.create(bpEngine)
// runInNewBT(c1,{},bpEngine1);
// runInNewBT(c2,{},bpEngine1);
// runInNewBT(c3,{},bpEngine1);
// bpEngine1.run().next();


