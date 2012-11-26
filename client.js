var 
	WebSocket = require('ws')
	, uuid = require('node-uuid');

function repeat(str, num )
{
    return new Array( num + 1 ).join( str );
}
var strMessage=repeat("AaBbC",2000);

function worker(n,limit){
	//var ws = new WebSocket('ws://localhost:8080');
	var ws = new WebSocket(url);
	var conta=0;
	var sessionId=uuid.v4();
	var msg=JSON.stringify({ sessionId : sessionId, msg: strMessage });
	var initTime=null;

	ws.on('open', function() {
		initTime=new Date();
	    ws.send(msg);
	});

	ws.on('message', function(message) {
	    //console.log('received: %s', message);
    	conta++;
	    if(conta<limit){
	    	ws.send(msg);
	    }else{
	    	var diff=new Date()-initTime;
	    	avgTimes[n]=diff/limit;
	    	//console.log('[' + sessionId + '] elapsed: '+diff+' ms - avg:'+(diff/limit).toFixed(2)+' ms/msg');
	    	ws.close();
	    	finished++;
	    	if(finished==workers){
	    		var sum = 0;
				for(var i = 0; i < avgTimes.length; i++){
    				sum += avgTimes[i];
				}
				var avg = sum/avgTimes.length;
	    		console.log("ALL FINISHED - AVG: " + avg.toFixed(2) + " ms/msg");
	    	}
	    }
	});
}

var url=process.argv[2];
var workers=process.argv[3];
var limit=process.argv[4];

var avgTimes=new Array();
var finished=0;
console.log("["+process.pid+"] Working...");
for(var i=0;i<workers;i++){
	new worker(i,limit);
}

