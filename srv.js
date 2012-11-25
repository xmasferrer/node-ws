var WebSocketServer = require('ws').Server;

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
