var WebSocketServer = require('ws').Server;
var zmq = require('zmq');
var cluster = require('cluster');

//var numCPUs = require('os').cpus().length;
//var numCPUs=2;
if(!process.argv[2]) throw "Specify number of worker processes";
var numCPUs=process.argv[2];

var sockets=new Array();

//var pubSockAddr='tcp://127.0.0.1:3000';
//var subSockAddr='tcp://127.0.0.1:3001';

var pubSockAddr='ipc:///tmp/pub';
var subSockAddr='ipc:///tmp/sub';


if (cluster.isMaster) {
  console.log("["+process.pid+"]Starting cluster ... "+numCPUs);

	var subSock = zmq.socket('pull');
	subSock.bindSync(pubSockAddr);
	var pubSock = zmq.socket('pub');
	pubSock.bindSync(subSockAddr);

	subSock.on('message', function(str){
		//console.log('pubsock on message');
		pubSock.send(str);
	});

  for (var i = 0; i < numCPUs; i++) {
    var worker = cluster.fork();
  }
} else {
  	console.log("Started worker %d ...", process.pid);
	
	var subSock = zmq.socket('sub');
	subSock.connect(subSockAddr);
	subSock.subscribe('');
	subSock.on('message', function(str){
	  //console.log('work: %s', str);
	  var msg=JSON.parse(str);
	  if(sockets[msg.sessionId]) sockets[msg.sessionId].send(str);
	});

	var wss = new WebSocketServer({port: 8080});
	var pubSock = zmq.socket('push');
	pubSock.connect(pubSockAddr);

	wss.on('connection', function(ws) {
		var sessionId=null;
	   	//console.log('['+process.pid+']>>connected');
	    ws.on('message', function(str) {
	        //console.log('received: %s', str);
	        if(!sessionId){
	        	var msg=JSON.parse(str);
	        	sessionId=msg.sessionId;
	    	}
	        sockets[sessionId]=ws;
			pubSock.send(str);
	    });
	    ws.on('close', function() {
	    	delete(sockets[sessionId]);
	    	//console.log('['+process.pid+']<<disconnected');
		});
	});

}



