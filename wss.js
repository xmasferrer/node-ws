var WebSocketServer = require('ws').Server;

var socketsByFrom={};

function addSocket(from,to,ws,keyMsg){
  //console.log("add: "+from + " >> "+to);
  if(socketsByFrom[from] && socketsByFrom[from].connectedTo[to]) throw "Already connected! WTF!";

  var listFrom=socketsByFrom[from]?socketsByFrom[from]:{keyMessage:keyMsg,connectedTo:{}};
  listFrom.connectedTo[to]=ws;
  socketsByFrom[from]=listFrom;
}

function removeSocket(from,to){
  //console.log("remove: "+from + " >> "+to);
  if(socketsByFrom[from]) delete(socketsByFrom[from]);
  if(socketsByFrom[to] && socketsByFrom[to].connectedTo[from]) delete(socketsByFrom[to][from]);
}

function broadcastMessage(from,msg){
  var listeners=socketsByFrom[from];
  if(!listeners || !listeners.connectedTo){ 
    //console.log("No listeners");
    return;
  }
  for(var i in listeners.connectedTo){
    listeners.connectedTo[i].send(msg);
  }
}

var port=process.argv[2];
if(!port) throw("Please specify port");

var wss = new WebSocketServer({port: port});
console.log("Started worker %d ...", process.pid);

wss.on('connection', function(ws) {
    var sessionId=null;
    var from=null;
    var to=null;
   	//console.log('>>connected');
    ws.on('message', function(str) {
        //console.log("["+from+"] received: "+str);
        if(!from || !to){
          var msg=JSON.parse(str);
          if(msg.type.toLowerCase()=='keyss'){
            from=msg.sessionKeyFrom;
            to=msg.sessionKeyTo;
            addSocket(from,to,ws,msg);
            if(socketsByFrom[to] && socketsByFrom[to].connectedTo[from]){
              broadcastMessage(from,JSON.stringify(socketsByFrom[to].keyMessage));
            }
          }
        }
        broadcastMessage(to,str);
    });
    ws.on('close', function() {
      removeSocket(from,to);
    	//console.log('<<disconnected');
	});
});
