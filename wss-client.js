var 
	WebSocket = require('ws')
	, uuid = require('node-uuid');

function worker(n,limit){
	var wsOperator = null;
	var wsAgent = null;
	var conta=0;
	// var operatorFrom=uuid.v4();
	// var operatorTo=uuid.v4();
	var operatorFrom="from_"+n;
	var operatorTo="to_"+n;
	var agentFrom=operatorTo;
	var agentTo=operatorFrom;

	function log(msg){
		console.log("["+n+"] "+msg);
	}


	console.log("Connecting agent");
	wsAgent = new WebSocket(url);
	wsAgent.on('message', function(message) {
   	    log("ag_receive "+message);
   	    if(message=="end") wsAgent.close();
	});
	wsAgent.on('open', function() {
	    wsAgent.send(JSON.stringify({type:'keyss',sessionKeyFrom:agentFrom,sessionKeyTo:agentTo}));
	});

	setTimeout(function(){
		console.log("Connecting operator");
		wsOperator = new WebSocket(url);
		wsOperator.on('message', function(message) {
	   	    log("op_receive "+message);
	   	    if(message=="end") wsOperator.close();
		});
		wsOperator.on('open', function() {
		    wsOperator.send(JSON.stringify({type:'keyss',sessionKeyFrom:operatorFrom,sessionKeyTo:operatorTo}));
		    //wsOperator.send("HOLA");
		    var i=0;
		    function sendMessages(){
		    	if(i<limit){
					wsAgent.send("Msg: "+i);
					wsOperator.send("Msg: "+i);
					i++;
				}else{
					clearInterval(timerId);
					wsAgent.send("end");
					wsOperator.send("end");
				}
		    }
		    var timerId = setInterval(sendMessages, 500);  
		});
	},1000);
}

var url=process.argv[2];
var workers=process.argv[3];
var limit=process.argv[4];

if(!url || !workers || !limit || limit<1)
	throw("node wss-client.js url #workers limit");

console.log("["+process.pid+"] Working...");
for(var i=0;i<workers;i++){
	new worker(i,limit);
}

