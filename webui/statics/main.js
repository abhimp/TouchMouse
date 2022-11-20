function sendCommand(cmd, cb) {
    xhr = new XMLHttpRequest();
    xhr.open('POST', '/');
    xhr.onload = function() {
        if (xhr.status === 200) {
            setTimeout(cb, 50)
        }
        else if (xhr.status !== 200) {
            setTimeout(cb, 50)
        }
    };
    xhr.send(cmd);
}

var events = []

function aggregateCommands(){
    var commands = ""
    var moving = false
    var movedx = 0
    var movedy = 0
    for(var i in events) {
        var ev = events[i]
        switch(ev[0]) {
            case "click" :
                {
                    commands += "xdotool mousedown " + ev[2] + " mouseup " + ev[2] + "\n"
                }
                break;
            case "swipe":
                {
                    movedx += ev[2]
                    movedy += ev[3]
                }

        }
    }
    if(movedy != 0 || movedx != 0) {
        commands += "xdotool mousemove_relative -- " + movedx + " " + movedy
        movedy = movedx = 0
    }
    events = []
    if(commands == ""){
        setTimeout(aggregateCommands, 250)
        return
    }
    sendCommand(commands, aggregateCommands)
}

var lastEvent = null
var lastEventType = ""
var swiping = false

var socket = null
var isSocketReady = false

function connectWs() {
    var path = "ws://" + location.host + "/ws/ws"
    socket = new WebSocket(path)
    socket.addEventListener("open", function(e) {
        console.log("Socket Opened")
        isSocketReady = true
    })
    socket.addEventListener("message", function(e) {
        console.log(e)
    })
    socket.addEventListener("close", function(e){
        console.log(e)
        setTimeout(function(){
            connectWs()
        }, 200)
        isSocketReady = false
    })
}
function wsSend(d) {
    // queue.push(d)
    if(!isSocketReady) {
        setTimeout(function(){wsSend(d)}, 200)
        return;
    }
    // while(queue.length) {
    //     p = queue[0]
    //     queue.shift()
    //     socket.send(p)
    // }
    socket.send(JSON.stringify(d))
}


function workWithEvents() {
    var ele = document.getElementById("pad")
    ele.ontouchstart = function(e) {
        lastEvent = e
        lastEventType = "start"
        // console.log("touchlen:", e.touches.length, e)
    }
    ele.ontouchend = function(e) {
        var tm = e.timeStamp
        if(lastEventType == "start"){
            var btn = 1
            if(lastEvent.touches.length == 2)
                btn = 3
            else if(lastEvent.touches.length == 3)
                btn = 2
            events.push(["click", tm, btn])
        }
        lastEvent = e
        lastEventType = "end"
        // console.log("touchlen:", e.touches.length, e)
    }
    ele.ontouchmove = function(e) {
        // var tm = new Date()
        try {
            events.push(["swipe", e.timeStamp, e.touches[0].clientX - lastEvent.touches[0].clientX, e.touches[0].clientY - lastEvent.touches[0].clientY])
        } catch(er) {
            console.log(e, er)
        }
        lastEvent = e
        lastEventType = "swipe"
        // console.log("touchlen:", e.touches.length, e)
    }
    ele.ontouchcancel = function(e){
        console.log(e)
    }
    aggregateCommands()
}


var touchOperationEnabled = true

function onbodyload(){
    connectWs()
    // alert("starting")
    
    var ele = document.getElementById("pad")
    ele.ontouchstart = function(e) {
        // if(!touchOperationEnabled) return
        // wsSend("touchstart")
        lastEvent = e
        lastEventType = "start"
        console.log(e)
    }
    ele.ontouchend = function(e) {
        // if(!touchOperationEnabled) return
        var tm = e.timeStamp
        if(lastEventType == "start"){
            var btn = 1
            if(lastEvent.touches.length == 2)
                btn = 3
            else if(lastEvent.touches.length == 3)
                btn = 2
        }
        lastEvent = e
        lastEventType = "end"
        console.log(e)
    }
    ele.ontouchmove = function(e) {
        // if(!touchOperationEnabled) return
        try {
            var dt = {e: "move", x: e.touches[0].clientX - lastEvent.touches[0].clientX, y: e.touches[0].clientY - lastEvent.touches[0].clientY}
        } catch(er) {
            console.error(e, er)
        }
        lastEvent = e
        lastEventType = "move"
        wsSend(dt)
        console.log(e)
    }
    ele.ontouchcancel = function(e) {
        // if(!touchOperationEnabled) return
        wsSend("touchcancel")
        console.log(e)
    }
    // ele.onclick = function(e) { //not required now because we are interested in individual up down event
    //     wsSend("click")
    //     console.log(e)
    // }
    // ele.onmouseout = function(e) { //not very appropriate
    //     wsSend("mouseout")
    //     console.log(e)
    // }
    // ele.onmouseover = function(e) { //opposite function of onmouseout
    //     wsSend("mouseover")
    //     console.log(e)
    // }
    ele.onmousemove = function(e) {
        if(touchOperationEnabled) return
        if (e.movementX == 0 && e.movementY == 0) return
        var dt = {e: "move", x: e.movementX, y: e.movementY}
        wsSend(dt)
        console.log(e)
    }
    ele.onmouseleave = function(e) {
        touchOperationEnabled = true //TODO we should not re enable again
        // wsSend("mouseleave")
        lastEvent = null
        console.log(e)
    }
    ele.onmouseenter = function(e) {
        touchOperationEnabled = false
        // wsSend("mouseenter")
        lastEvent = e
        console.log(e)
    }
    ele.onmousedown = function(e) {
        if(touchOperationEnabled) return
        var dt = {e: "down", b: e.button}
        wsSend(dt)
        console.log(e)
    }
    ele.onmouseup = function(e) {
        if(touchOperationEnabled) return
        var dt = {e: "up", b: e.button}
        wsSend(dt)
        console.log(e)
    }
}
