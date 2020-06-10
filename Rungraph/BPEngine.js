function BPEngine(){
    this.BThreads = [];
    this.deb = null;

}
BPEngine.prototype.sync = function*(stmt){
    yield stmt;
};
/**
* Registering a new BThread to the engine
* The BThread is an object with an iterator that saves
* the current state(which yield point to resume to)
* and the current statement(requested,blocked and waited for events)
**/
BPEngine.prototype.registerBThread = function(bt){
    let x = bt.next().value;
    let b = {iterator: bt, stmt: fixStmt(x)};
    this.BThreads.push(b);
};
/**
 * The main function of the BP engine.
 * Runs in an infinite loop, and when all the registered BThreads enter a sync point,
 * chooses a random event from the set of Requested Set-minus Blocked events.
 * After selecting an event, all the BThreads that have requested the event or have
 * been waiting for the event, will continue their run from the bsync point, until the next bsync point
 */
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
        writeToConsole(this,"event selected: " + e, -1, -1);
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