var WebSocketServer = require('ws').Server;
var zmq = require('zmq');

var sockets=new Array();

var sockAddr='tcp://127.0.0.1:3000';
//var sockAddr='ipc:///tmp/wsbrau';

var pullSock = zmq.socket('pull');
pullSock.bindSync(sockAddr);

pullSock.on('message', function(str){
  //console.log('work: %s', str);
  var msg=JSON.parse(str);
  if(sockets[msg.sessionId]) sockets[msg.sessionId].send(str);
});

var wss = new WebSocketServer({port: 8080});
var pushSock = zmq.socket('push');
pushSock.connect(sockAddr);
console.log("Started worker %d ...", process.pid);

wss.on('connection', function(ws) {
	var sessionId=null;
   	//console.log('>>connected');
    ws.on('message', function(str) {
        //console.log('received: %s', str);
        if(!sessionId){
        	var msg=JSON.parse(str);
        	sessionId=msg.sessionId;
    	}
        sockets[sessionId]=ws;
		pushSock.send(str);
    });
    ws.on('close', function() {
    	delete(sockets[sessionId]);
    	//console.log('<<disconnected');
	});
});
