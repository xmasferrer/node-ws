var WebSocketServer = require('ws').Server;

var socketsByFrom={};
var socketsByTo={};

function addSocket(from,to,ws){
  console.log("add: "+from + " >> "+to);
  if(socketsByFrom[from] && socketsByFrom[from][to]) throw "Already connected! WTF!";

  var listFrom=socketsByFrom[from]?socketsByFrom[from]:{};
  listFrom[to]=ws;
  socketsByFrom[from]=listFrom;

  var listTo=socketsByTo[to]?socketsByTo[to]:{};
  listTo[from]=ws;
  socketsByTo[to]=listTo;
}

function removeSocket(from,to){
  console.log("remove: "+from + " >> "+to);
  if(socketsByFrom[from] && socketsByFrom[from][to]) delete(socketsByFrom[from][to]);
  if(socketsByTo[to] && socketsByTo[to][from]) delete(socketsByTo[to][from]);
}

function broadcastMessage(from,msg){
  //console.log("broadcast: "+from);
  var listeners=socketsByFrom[from];
  if(!listeners){ 
    console.log("No listeners");
    return;
  }
  //console.log(listeners);
  //console.log("len: "+listeners.length);
  for(var i in listeners){
    //console.log(listeners[i]);
    //console.log("sending to: "+i);
    listeners[i].send(msg);
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
   	console.log('>>connected');
    //sMessage = JSON.stringify({type:'keyss',sessionKeyFrom:sId,sessionKeyTo:oSelf._to[sId],app:oSelf._app[sId],server:false,format:oSelf._format[sId]});
    ws.on('message', function(str) {
        //console.log("received: "+str);
        if(!from || !to){
          var msg=JSON.parse(str);
          from=msg.sessionKeyFrom;
          to=msg.sessionKeyTo;
          addSocket(from,to,ws);
        }
        broadcastMessage(to,str);
    });
    ws.on('close', function() {
      //removeSocket(from,to);
    	console.log('<<disconnected');
	});
});
