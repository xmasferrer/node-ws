var WebSocket = require('ws');

var finishedWS=0;
var timesWS={};

var initTimeTotal=new Date();
var finishedSCK=0;
var timesSCK={};

function sleep(milliSeconds) {  
    // obten la hora actual
    var startTime = new Date().getTime();
    // atasca la cpu
    while (new Date().getTime() < startTime + milliSeconds); 
}

// bPing: not used, We receive whole packet
// iroutet: 1,2; We have to wait for client and agent or just for client or Agent

function pingPongAgentWS(url,limit,from,to, bPing, iroutet){
	var conta = 0;
	var ws = new WebSocket(url);
	var initTime=null;
	var end=false;
	var internalData='';

	function log(str){
		// console.log('WS ' + '[' + from + '] ' + str);
	}

	function sendPing(){
		ws.send(JSON.stringify({type:'ping'}));
		log (' Ping : ' + conta + ' ping');
	}

	function sendPong(){
		ws.send(pong_msg);
		log ( ' pong ' + pong_msg.length);
	}
	
	function checkDisconnect(){
		if(conta>=limit && end){
			log('disconect ' + conta + ' ' + limit + ' ' + end);
			ws.close();
		}
	}

	ws.on('open', function() {
		log (' connect :');
		initTime=new Date();
	    ws.send(JSON.stringify({type:'keyss',sessionKeyFrom:from,sessionKeyTo:to,app:500,format:'text'}));
	});
	ws.on('message', function(str) {
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
		
	});
	ws.on('close', function (){
		finishedWS++;
		var elapsed=new Date()-initTime;
		timesWS[from]=elapsed/limit;
		
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
	ws.on('error', function (err){
		timesWS[from] = -1;
		finishedWS++;
		console.log (' error :' + err);
	});
}

var net = require('net');

// bPing: true, false;  We can receive fragmented packet, wait whole packet to send ping
// iroutet: 1,2; We have to wait for client and agent or just for client or Agent
function pingPongAgentSocket(url,limit,from,to, bPing, iroutet){
	var conta = 0;
	var size = 0;
	var initTime=null;
	var socket = net.Socket();
	var internalData = '';
	var end=false;
	
	socket.setNoDelay(true);

	function log(str){
		//console.log('SCK ' + '[' + from + '] ' + str);
	}

	function sendPing(){
		socket.write(',' + JSON.stringify({type:'ping'}));		
		log ( ' Ping : ' + conta + ' ping');
	}
	function sendPong(){
		socket.write(pong_msg);
		log (' pong ' + pong_msg.length);
	}

	function checkDisconnect(){
		if(conta>=limit && end){
			log('disconect ' + conta + ' ' + limit + ' ' + end);
			socket.end();
		}
	}
	
	socket.on('connect', function() {
		log (' connect :');
		initTime=new Date();
	    socket.write(JSON.stringify({type:'keyss',sessionKeyFrom:from,sessionKeyTo:to,app:500,format:'text'}));
	});
	socket.on('data', function(str) {
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
	});
	socket.on('end', function () {
		log ('end ');
	});
	socket.on('close', function (){
		log (' close :' + ' Ping : ' + conta );
		finishedSCK++;
		var elapsed=new Date()-initTime;
		if (timesSCK[from] != -1)
			timesSCK[from]=elapsed/limit;
		
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
	socket.on('error', function (err){
		if (conta <= 0)
			timesSCK[from] = -1;
		console.log (' error :' + err + ' Ping : ' + conta);
	});
	
	socket.connect(11438, '127.0.0.1');
}


function workerWS(n){
	var operatorFrom="wsfr_"+new_id+'_'+n;
	var operatorTo="wsto_"+new_id+'_'+n;

	var op=new pingPongAgentWS(url,limit,operatorFrom,operatorTo, 1, 2);
//	sleep(100);
	var ag=new pingPongAgentWS(url,limit,operatorTo,operatorFrom, 0, 2);
}

function workerSocket(n){
	var operatorFrom="sckfr_"+new_id+'_'+n;
	var operatorTo="sckto_"+new_id+'_'+n;

	var op=new pingPongAgentSocket(url,limit,operatorFrom,operatorTo, 1, 2);
	var ag=new pingPongAgentSocket(url,limit,operatorTo,operatorFrom, 0, 2);
}

function workerSocketMixt(n){
	var operatorFrom="fr_"+new_id+'_'+n;
	var operatorTo="to_"+new_id+'_'+n;

	var op=new pingPongAgentSocket(url,limit,operatorFrom,operatorTo, 0, 1);
	var ag=new pingPongAgentWS(url,limit,operatorTo,operatorFrom, 0, 1);

//	var op=new pingPongAgentSocket(url,limit,operatorFrom,operatorTo, 1, 1);
//	var ag=new pingPongAgentWS(url,limit,operatorTo,operatorFrom, 0, 1);	
}



var url= 'ws://127.0.0.1:11438';
var workers=1;
var limit=10;
var pong_size=1;
var new_id = 1;
var sType = 'WS';

if (process.argv.length > 2)
	url=process.argv[2];
if (process.argv.length > 3)
	workers=process.argv[3];
if (process.argv.length > 4)
	limit=process.argv[4];
if (process.argv.length > 5)
	pong_size=process.argv[5];
if (process.argv.length > 6)
	new_id = process.argv[6];
if (process.argv.length > 7)
	sType = process.argv[7];


if (process.argv.length <= 7)
{
	console.log ('usage: node ws_client2.js [url] [workers] [Num pings] [Size Pings] [ID] [WS/SCK/MX/ALL]');
	console.log ('node ws_client2.js ws://127.0.0.1:11438 1 1 10 1');
}
else
{
	console.log ('node ws_client2.js' + url + ' ' + workers + ' ' + limit + ' ' + pong_size + ' ' + new_id + ' ' + sType);
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
	for(var i=0;i<workers;i++){
		new workerWS(i);
	}
	running = true;
}


if (sType == 'SCK' || sType == 'ALL')
{
	console.log ('sockets');
	new_id = new_id +1;
	for(var i=0;i<workers;i++){
		new workerSocket(i);
	}
	running = true;
}

if (sType == 'MX')
{
	console.log ('MX');
	for(var i=0;i<workers;i++){
		new workerSocketMixt(i);
	}
	running = true;
}


var endTimeTotal=new Date()-initTimeTotal;
if (running == false)
	console.log ('!!!!usage: node ws_client2.js [url] [workers] [Num pings] [Size Pings] [ID] [WS/SCK/MX/ALL]  !!!!!');
else
	console.log ('Total Time:' + endTimeTotal);

