var WebSocket = require('ws');

var finished=0;
var times={};

function pingPongAgent(url,limit,from,to){
	var conta = 0;
	var ws = new WebSocket(url);
	var initTime=null;
	var end=false;

	function log(str){
		//console.log("["+from+"] "+str);
	}

	function sendPing(){
		ws.send(JSON.stringify({type:'ping'}));
	}

	function checkDisconnect(){
		if(conta>=limit && end){
			ws.close();
			finished++;
			var elapsed=new Date()-initTime;
			times[from]=elapsed/limit;
			if(finished==workers*2){
				var sum = 0;
				for(var i  in times){
    				sum += times[i];
				}
				var avg = sum/(workers*2);
	    		console.log("ALL FINISHED - AVG: " + avg.toFixed(2) + " ms/msg");
			}
		}
	}

	ws.on('open', function() {
		initTime=new Date();
	    ws.send(JSON.stringify({type:'KeySS',sessionKeyFrom:from,sessionKeyTo:to,app:500}));
	});
	ws.on('message', function(str) {
		log('received: '+str);
		var msg=JSON.parse(str.substring(str.indexOf('{')));
		switch(msg.type.toLowerCase()){
			case 'end':
				end=true;
				break;
			case 'keyss':
				sendPing();
				break;
			case 'ping':
				ws.send(pong_msg);
				break;
			case 'pong':
				conta++;
				if(conta<limit){
					sendPing();
				}else{
					ws.send(JSON.stringify({type:'end'}));
				}
				break;
		}
		checkDisconnect();
	});
}

function worker(n){
	var operatorFrom="fr_"+n;
	var operatorTo="to_"+n;

	var op=new pingPongAgent(url,limit,operatorFrom,operatorTo);
	var ag=new pingPongAgent(url,limit,operatorTo,operatorFrom);

}

var url=process.argv[2];
var workers=process.argv[3];
var limit=process.argv[4];
var pong_size=process.argv[5];

if(!url || !workers || !limit || limit<1 || pong_size<1)
	throw("node wss-client.js url #workers limit pong_size(kbs)");

var pong_body=new Array( pong_size * 1024 ).join( 'A' );
var pong_msg=JSON.stringify({type:'pong',body:pong_body});

console.log("["+process.pid+"] Working...");
for(var i=0;i<workers;i++){
	new worker(i);
}

