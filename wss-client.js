var 
	WebSocket = require('ws')
	, uuid = require('node-uuid');

function worker(n){
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
   	    wsAgent.close();
	});
	wsAgent.on('open', function() {
	    wsAgent.send(JSON.stringify({type:'keyss',sessionKeyFrom:agentFrom,sessionKeyTo:agentTo}));
	});

	setTimeout(function(){
		console.log("Connecting operator");
		wsOperator = new WebSocket(url);
		wsOperator.on('message', function(message) {
	   	    log("op_receive "+message);
	   	    wsOperator.close();
		});
		wsOperator.on('open', function() {
		    wsOperator.send(JSON.stringify({type:'keyss',sessionKeyFrom:operatorFrom,sessionKeyTo:operatorTo}));
		});
	},1000);

}

var url=process.argv[2];
var workers=process.argv[3];

console.log("["+process.pid+"] Working...");
for(var i=0;i<workers;i++){
	new worker(i);
}

