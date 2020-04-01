// BThread = {
//     next: function* () {
//         return func.next();
//     },
//
//     stmt: {request: {},
//             wait: {},
//             block: {}},
// }

bp = {
    BThreads: [],

    sync: function* (stmt){
        yield stmt;
    },

    registerBThread: function(bt){
        let x = bt.next().value;
        let b = {iterator: bt, stmt: fixStmt(x)}
        this.BThreads.push(b);
    },

    run: function*(){
        while(true)
        {
            let e = getEvent();
            if(e === null)
                yield 'waiting for an event';
            console.log(e + "\n")
            bp.BThreads.forEach(bt => {
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
    bp.BThreads.forEach(bt => {
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

function* addHot() {
    for(let i = 0; i < 3; i++)
        yield {request: ['hot']}
}

function* addCold() {
    for(let i = 0; i < 3; i++)
        yield {request: ['cold']}
}

function* interleave() {
    while(true) {
        yield {wait: ['hot'], block: ['cold']}
        yield {wait: ['cold'], block: ['hot']}
    }
}

bp.registerBThread(addHot())
bp.registerBThread(addCold())
bp.registerBThread(interleave())
bp.run().next()