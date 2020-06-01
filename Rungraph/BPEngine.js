function BPEngine(){
    this.BThreads = [];
    this.deb = null;

}
BPEngine.prototype.sync = function*(stmt){
    yield stmt;
};

BPEngine.prototype.registerBThread = function(bt){
    let x = bt.next().value;
    let b = {iterator: bt, stmt: fixStmt(x)};
    this.BThreads.push(b);
};
BPEngine.prototype.run = function*(){
    while (true) {
        if(this.deb!=null) {
            this.deb.fixStages();
        }
        let e = this.getEvent();
        if (e === null)
            yield 'waiting for an event';
        if(this.deb!=null) {
            this.deb.addEvent(e);
        }
        window.eventSelected = e;
        console.log(e + "\n");
        writeToConsole("event selected: " + e);
        this.BThreads.forEach(bt => {
            if (isReqWait(bt, e)) {
                bt.stmt = fixStmt(bt.iterator.next().value)
            }
            else if(this.deb!=null) {
                this.deb.addBlocked(bt.stmt.c);
            }
        })
    }
};

// // to be implemented
// function waitForEvent() {
// }

function fixStmt(stmt) {
    if (stmt === undefined)
        return {request: [], block: [], wait: []};
    if (stmt.request === undefined || stmt.request === null)
        stmt.request = [];
    if (stmt.block === undefined || stmt.block === null)
        stmt.block = [];
    if (stmt.wait === undefined || stmt.wait === null)
        stmt.wait = [];
    return stmt
}

function isReqWait(bt, e) {
    return bt.stmt.request.includes(e) || bt.stmt.wait.includes(e)
}
//chooses a random event from the Requested events that are not blocked in the current sync point
BPEngine.prototype.getEvent = function() {
    let requests = new Set();
    let blocks = new Set();
    this.BThreads.forEach(bt => {
        bt.stmt.request.forEach(requests.add, requests);
        bt.stmt.block.forEach(blocks.add, blocks);
    });
    let diff = [...requests].filter(x => ![...blocks].includes(x));
    return getRandomItem(diff);
};

// get random item from a Set
function getRandomItem(set) {
    let items = Array.from(set);
    if (items.length === 0)
        return null;
    return items[Math.floor(Math.random() * items.length)];
}