var WebSocketServer = require('ws').Server;
var cluster = require('cluster');

if(!process.argv[2]) throw "Specify number of worker processes";
var numCPUs=process.argv[2];



if (cluster.isMaster) {
  console.log("["+process.pid+"] Starting cluster ... " + numCPUs);

  for (var i = 0; i < numCPUs; i++) {
    var worker = cluster.fork();
  }
} else {
  var sockets=new Array();

  var wss = new WebSocketServer({port: 8080});
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
  		    ws.send(str);
      });
      ws.on('close', function() {
        delete(sockets[sessionId]);
      	//console.log('<<disconnected');
  	});
  });
}
