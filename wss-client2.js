var WebSocket = require('ws');

var initTimeTotal=new Date();

var finishedWS=0;
var timesWS={};

var finishedSCK=0;
var timesSCK={};

// 					Function to simulate Sleep
// milliSeconds: Number of miliseconds to simulate Sleep
function sleep(milliSeconds) {  
    // obten la hora actual
    var startTime = new Date().getTime();
    // atasca la cpu
    while (new Date().getTime() < startTime + milliSeconds); 
}


//					Function to do PINGPONG with WEBSOCKETS (simulates a side [Agent/UI])
// bPing: not used, We receive whole packet
// iroutet: 1,2; We have to wait for client and agent or just for client or Agent
// bFast; [true/false]  just receives messages or computes messages
function pingPongAgentWS(url,limit,from,to, bPing, iroutet, bfast){
	var conta = 0;
	var ws = new WebSocket(url);
	var initTime=null;
	var end=false;
	var internalData='';
	var size = 0;
	
	function log(str){
	//	console.log('WS ' + '[' + from + '] ' + str);
	}

	// Send a ping message
	function sendPing(){
		ws.send(JSON.stringify({type:'ping'}));
		log (' Ping : ' + conta + ' ping');
	}

	// Send a Pong message
	function sendPong(){
		ws.send(pong_msg);
		log ( ' pong ' + pong_msg.length);
	}
	
	// Check we have to disconnect and close WS
	function checkDisconnect(){
		if(conta>=limit && end){
			log('disconect ' + conta + ' ' + limit + ' ' + end);
			ws.close();
		}
	}

	// Function that just receives messages and do Ping/Pong -Without computing message received- 
	function FastComputation(str) 	{
		log('FAST conta : ' + conta + ' data: ' + str.length + ' pong: ' + pong_msg.length + ' currentSize: ' + size);
		
		// We can receive fragmented packet, wait whole packet to send ping
		if(conta>=limit){
			try {
				ws.send(JSON.stringify({type:'end'}));
				ws.close();
			}
			catch (error)
			{
				console.log (error);
			}
		}
		else
		{
			if(bPing)
			{
				if (size+str.length >=  pong_msg.length)
				{
					conta++;
					size += str.length;
					size -= pong_msg.length;
					sendPing();
				}
				else
					size += str.length;
			}
			else
			{
				conta++;
				sendPong();
			}
		}			
	}

	// Function that receives messages and computes received message and do Ping/Pong
	function AllComputation (str)	{	
		internalData += str;
		log('X conta: ' + conta + ' data: ' + internalData.length);

		while (internalData.indexOf('}') != -1 && end == false)
		{
			try
			{
				var msg=JSON.parse(internalData.substring(internalData.indexOf('{'), internalData.indexOf('}')+1));
				internalData = internalData.substring(internalData.indexOf('}')+1);
			}
			catch (error)
			{
				console.log ('WS ERROR ' + error + ' >' + internalData + '<');
				internalData = '';
				ws.close();
				return;
			}
	
			switch(msg.type.toLowerCase()){
				case 'end':
					end=true;
					break;
				case 'keyss':
					conta++;
					sleep(100);
					if (iroutet == 2)
						sendPing();
					else
						sendPong();
					break;
				case 'ping':
					conta++;
					if(conta<limit){
							sendPong();
						}else{
						ws.send(JSON.stringify({type:'end'}));
					}
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
		}
	}
	
	// EVENT called when a connection is stablished
	ws.on('open', function() {
		log (' connect :');
		initTime=new Date();
	    ws.send(JSON.stringify({type:'keyss',sessionKeyFrom:from,sessionKeyTo:to,app:500,format:'text'}));
	});

	// EVENT called when a message is received -whole message received (we can receive fragmented packets in case of comming from a 'socket')-
	ws.on('message', function(str) {
		if (bfast)
			FastComputation(str);
		else
			AllComputation(str);
	});
	
	// EVENT called when a conneciton is closed
	ws.on('close', function (){
		finishedWS++;
		var elapsed=new Date()-initTime;

		if (conta > 0)
			timesWS[from]=elapsed/conta;
		else
			timesWS[from]=-1;		
		
		log ('closed :'  + to + ' finishedWS: ' + finishedWS + ' Ping :' + conta + ' ToFinish :' + timesWS[from]);
		if(finishedWS>=workers* iroutet){
			var sum = 0;
			var elements = 0;
			for(var i  in timesWS){
				if (timesWS[i] != -1 && timesWS[i] != 0)
				{
					sum += timesWS[i];
					elements ++;
				}
			}
			if (elements > 0)
			{
				var avg = sum/(elements*2);
				console.log("WS ALL FINISHED - AVG: " + avg.toFixed(2) + " ms/msg" + 'elements: ' + elements + ' Ping :' + conta + ' finishedWS :' + finishedWS);
			}
			var endTimeTotal=new Date()-initTimeTotal;
			console.log ('Total Time:' + endTimeTotal);
		}
	});
	
	// EVENT called when an error araise (try-catch must to be managed individualy)
	ws.on('error', function (err){
		finishedWS++;
		console.log (' error :' + err);
	});
}

var net = require('net');

//					Function to do PINGPONG with SOCKETS (simulates a side [Agent/UI])
// bPing: true, false;  We can receive fragmented packet, wait whole packet to send ping
// iroutet: 1,2; We have to wait for client and agent or just for client or Agent
// bFast; [true/false]  just receives messages or computes messages
function pingPongAgentSocket(url,limit,from,to, bPing, iroutet, bfast){
	var conta = 0;
	var size = 0;
	var initTime=null;
	var socket = net.Socket();
	var internalData = '';
	var end=false;
	
	socket.setNoDelay(true);

	function log(str)	{
		//console.log('SCK ' + '[' + from + '] ' + str);
	}

	// Send a ping message
	function sendPing()	{
		socket.write(',' + JSON.stringify({type:'ping'}));		
		log ( ' Ping : ' + conta + ' ping');
	}

	// Send a pong message
	function sendPong()	{
		socket.write(pong_msg);
		log (' pong ' + pong_msg.length);
	}

	// Check we have to disconnect and close Scoket
	function checkDisconnect(){
		if(conta>=limit && end)
		{
			log('disconect ' + conta + ' ' + limit + ' ' + end);
			socket.end();
		}
	}

	// Function that just receives messages and do Ping/Pong -Without computing message received- 
	function FastComputation(str) 	{
		log('FAST conta : ' + conta + ' data: ' + str.length + ' pong: ' + pong_msg.length + ' currentSize: ' + size);
		
		if(conta>=limit){
			socket.write(JSON.stringify({type:'end'}));
			socket.end();
		}
		else  // We can receive fragmented packet, wait whole packet to send ping
		{
			if(bPing)
			{
				if (size+str.length >=  pong_msg.length)
				{
					conta++;
					size += str.length;
					size -= pong_msg.length;
					sendPing();
				}
				else
					size += str.length;
			}
			else
			{
				conta++;
				sendPong();
			}
		}
	}

	// Function that receives messages and computes received message and do Ping/Pong
	function AllComputation (str)	{
		internalData += str;
		log('X conta: ' + conta + ' data: ' + internalData.length);

		while (internalData.indexOf('}') != -1 && end == false)
		{
			try
			{
				var msg=JSON.parse(internalData.substring(internalData.indexOf('{'), internalData.indexOf('}')+1));
				internalData = internalData.substring(internalData.indexOf('}')+1);
			}
			catch (error)
			{
				console.log ('SCk ERROR ' + error + ' >' + internalData + '<');
				internalData = '';
				socket.end();
				return;
			}
	
			switch(msg.type.toLowerCase()){
				case 'end':
					end=true;
					break;
				case 'keyss':
					conta++;
					sleep(100);
					if (iroutet == 2)
						sendPing();
					else
						sendPong();
					break;
				case 'ping':
					conta++;
					if(conta<limit){
							sendPong();
						}else{
						socket.write(JSON.stringify({type:'end'}));
					}
					break;
				case 'pong':
					conta++;
					if(conta<limit){
							sendPing();
						}else{
						socket.write(JSON.stringify({type:'end'}));
					}
					break;
			}
			checkDisconnect();
		}		
	}
	
	// EVENT called when a conneciton is stablished
	socket.on('connect', function() {
		log (' connect :');
		initTime=new Date();
	    socket.write(JSON.stringify({type:'keyss',sessionKeyFrom:from,sessionKeyTo:to,app:500,format:'text'}));
	});
	
	// EVENT called when data is received -any message can be received fragmented-
	socket.on('data', function(str) {
		if (bfast)
			FastComputation(str);
		else
			AllComputation(str);
	});
	
	// EVENT called when no more data can be received from a Socket
	socket.on('end', function () {
		log ('end ');
	});
	
	// EVENT called when a socket is closed
	socket.on('close', function (){
		log (' close :' + ' Ping : ' + conta );
		finishedSCK++;
		var elapsed=new Date()-initTime;

		if (conta > 0)
			timesSCK[from]=elapsed/conta;
		else
			timesSCK[from]=-1;
		
		log ('closed :' + to + ' finishedSCK: ' + finishedSCK + ' Ping : ' + conta + ' ToFinish :' + timesSCK[from] + ' ' + finishedSCK);
		if(finishedSCK>=workers*iroutet){
			log ('closing :'  + to + ' finishedSCK: ' + finishedSCK + ' Ping :' + conta);
			var sum = 0;
			var elements = 0;
			for(var i  in timesSCK){
				if (timesSCK[i] != -1 && timesSCK[i] != 0)
				{
					sum += timesSCK[i];
					elements ++;
				}
			}
			if (elements > 0)
			{
				var avg = sum/(elements*2);
				console.log("SCK ALL FINISHED - AVG: " + avg.toFixed(2) + " ms/msg" + 'elements: ' + elements + ' Ping :' + conta + ' finishedSCK: ' + finishedSCK);
			}
			var endTimeTotal=new Date()-initTimeTotal;
			console.log ('Total Time:' + endTimeTotal + ' ' + elements);
		}
		else
			log ('closing :'  + to + ' finishedSCK: ' + finishedSCK + ' Ping :' + conta);
	});
	
	// EVENT received when an error is received
	socket.on('error', function (err){
		console.log (' error :' + err + ' Ping : ' + conta);
	});
	
	socket.connect(11438, '127.0.0.1');
}


function workerWS(n, computeFast){
	var operatorFrom="wsfr_"+new_id+'_'+n;
	var operatorTo="wsto_"+new_id+'_'+n;

	var op=new pingPongAgentWS(url,limit,operatorFrom,operatorTo, 1, 2, computeFast);
	var ag=new pingPongAgentWS(url,limit,operatorTo,operatorFrom, 0, 2, computeFast);
}

function workerSocket(n, computeFast){
	var operatorFrom="sckfr_"+new_id+'_'+n;
	var operatorTo="sckto_"+new_id+'_'+n;

	var op=new pingPongAgentSocket(url,limit,operatorFrom,operatorTo, 1, 2, computeFast);
	var ag=new pingPongAgentSocket(url,limit,operatorTo,operatorFrom, 0, 2, computeFast);
}

function workerSocketMixt(n, computeFast){
	var operatorFrom="fr_"+new_id+'_'+n;
	var operatorTo="to_"+new_id+'_'+n;

	var op=new pingPongAgentSocket(url,limit,operatorFrom,operatorTo, 0, 1, computeFast);
	var ag=new pingPongAgentWS(url,limit,operatorTo,operatorFrom, 0, 1, computeFast);
}



var url= 'ws://127.0.0.1:11438';
var workers=1;
var limit=10;
var pong_size=1;
var new_id = 1;
var sType = 'WS';
var computeFast = false;

if (process.argv.length > 2) 	url=process.argv[2];
if (process.argv.length > 3)	workers=process.argv[3];
if (process.argv.length > 4)	limit=process.argv[4];
if (process.argv.length > 5)	pong_size=process.argv[5];
if (process.argv.length > 6)	new_id = process.argv[6];
if (process.argv.length > 7)	
{
	var str = process.argv[7];
	computeFast = (str.toLowerCase() == 'fast');
}
if (process.argv.length > 8)	sType = process.argv[8];

if (process.argv.length <= 8)
{
	console.log ('usage: node ws_client2.js [url] [workers] [Num pings] [Size Pings] [ID] [FAST] [WS/SCK/MX/ALL]');
	console.log ('node ws_client2.js ws://127.0.0.1:11438 1 1000 10 fast 98');
}
else
{
	console.log ('node ws_client2.js ' + url + ' ' + workers + ' ' + limit + ' ' + pong_size + ' ' + new_id + ' ' + str + ' ' + sType);
}
	
if(!url || !workers || !limit || limit<1 || pong_size<1)
	throw("node wss-client.js url #workers limit pong_size(kbs)");

var pong_body=new Array( pong_size * 1024 ).join( 'A' );
var pong_msg=JSON.stringify({type:'pong',body:pong_body});
console.log("["+process.pid+"] Working..." + pong_msg.length);

var running = false;

if (sType == 'WS' || sType == 'ALL')
{
	console.log ('WS');
	
	for(var i=0;i<workers;i++)
		new workerWS(i, computeFast);
	running = true;
}


if (sType == 'SCK' || sType == 'ALL')
{
	console.log ('sockets');
	new_id = new_id +1;
	
	for(var i=0;i<workers;i++)
		new workerSocket(i, computeFast);
	running = true;
}

if (sType == 'MX')
{
	console.log ('MX');
	
	for(var i=0;i<workers;i++)
		new workerSocketMixt(i, computeFast);
	running = true;
}


var endTimeTotal=new Date()-initTimeTotal;
if (running == false)
	console.log ('!!!!usage: node ws_client2.js [url] [workers] [Num pings] [Size Pings] [ID] [WS/SCK/MX/ALL]  !!!!!');
else
	console.log ('Total Time:' + endTimeTotal);

