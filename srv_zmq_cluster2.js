var WebSocketServer = require('ws').Server;
var zmq = require('zmq');
var cluster = require('cluster');
var util = require('util');

//var numCPUs = require('os').cpus().length;
//var numCPUs=2;
if(!process.argv[2]) throw "Specify number of worker processes";
var numCPUs=process.argv[2];

var sockets=new Array();

var sockAddr="ipc:///tmp/pub";

function log(str){
	console.log('['+process.pid+'] '+str);
}

if (cluster.isMaster) {

	log("Starting cluster..."+numCPUs);

	var allPids=new Array();
	var workers=new Array();

	for (var i = 0; i < numCPUs; i++) {
		var worker = cluster.fork();
		workers.push(worker);
		allPids.push(worker.process.pid);
	}

	for (var i in workers) {
		workers[i].send({ cmd: 'pids', pids: allPids });
	}

} else {

  	log("Started worker...");
	process.on('message', function(msg) {
		//log('message: '+util.inspect(msg));
		switch(msg.cmd) {
		case 'pids':
			var sock = zmq.socket('sub');
			for(var i=0;i<msg.pids.length;i++){
				var addr=sockAddr+'.'+msg.pids[i];
				sock.connect(addr);
				//log("connect "+addr);
			}
			sock.subscribe('');
			sock.on('message', function(str){
			  //log('work: ' + str);
			  var msg=JSON.parse(str);
			  if(sockets[msg.sessionId]) sockets[msg.sessionId].send(str);
			});
		  	//log("sub created");

			setTimeout(function(){
			var mySockAddr=sockAddr+'.'+process.pid;
			var pubSock=zmq.socket('pub');	
			pubSock.bindSync(mySockAddr);
			//log("bindSync "+mySockAddr);
		  	//log("pub created");

			var wss = new WebSocketServer({port: 8080});

			wss.on('connection', function(ws) {
				var sessionId=null;
			   	//log('>>connected');
			    ws.on('message', function(str) {
				//log('received: ' + str);
				if(!sessionId){
					var msg=JSON.parse(str);
					sessionId=msg.sessionId;
			    	}
				sockets[sessionId]=ws;
					pubSock.send(str);
			    });
			    ws.on('close', function() {
			    	delete(sockets[sessionId]);
			    	//log('<<disconnected');
				});
			});
			},1000);

		break;
		}
	});
}



