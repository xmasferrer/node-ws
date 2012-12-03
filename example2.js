var aSockets=new Array();

var port_sck = 11438; 
var port_ws = 1339; 

if (process.argv.length > 2)
	port_sck = process.argv[2];   // 11438
if (process.argv.length > 3)
	port_ws = process.argv[3];    // 1339

console.log (process.argv.length + '-- Port socket: ' + port_sck + ' Port WS: ' + port_ws);	
	
process.on('uncaughtException', function (err) {
	console.log('Caught exception: ' + err);
});


function checkCorrectData (jSon)
{
	var bResult = true;
	
	if (!jSon.type)
		bResult = false;
	else if (jSon.type != 'KeySS')
		bResult = false;
	else if (!jSon.sessionKeyFrom)
		bResult = false;
	else if (!jSon.sessionKeyTo)
		bResult = false;
	else if (!jSon.app)
		bResult = false;

	return bResult;
}


// Search jSon.sessionKeyTo&jSon.sessionKeyFrom&jSon.app and fills remaing fields
//                                         or creates a new element
function insertNewArrayElement (jSon, type, oSocket)
{
	var iResult = 0;
	var connectInfo = 
		{
			idFrom: jSon.sessionKeyFrom,	// ID From
			idTo: jSon.sessionKeyTo,		// ID To		
			idAPP: jSon.app,				// ID APP
			idType: type,					// type connection from
			idConnection: oSocket,			// Connection From
			aLink : null
		};                                  // XMAS: Crear una funcion de send !!!!!!

	// If element exists with same identificators .....
	
	if (aSockets[""+jSon.sessionKeyFrom+jSon.sessionKeyTo+jSon.app])
	{
console.log ('Already connected this identifier End');
		iResult = 5;
		oSocket.end();		
	}
	// If we have to create a new element just copy
	else
	{
console.log ('Create new element :' + jSon.sessionKeyFrom + jSon.sessionKeyTo +jSon.app);
		connectInfo.aLink = new Array ();
		aSockets[""+jSon.sessionKeyFrom+jSon.sessionKeyTo+jSon.app] = connectInfo;
		iResult = 3;
	}

	// If ready to do RC link it
	if (aSockets[""+jSon.sessionKeyTo+jSon.sessionKeyFrom+jSon.app] != undefined && iResult != 5)
	{
console.log ('Route new element :' + jSon.sessionKeyTo + jSon.sessionKeyFrom + jSon.app);
		elem = aSockets[""+jSon.sessionKeyTo+jSon.sessionKeyFrom+jSon.app]
		elem.aLink.push (connectInfo);
		connectInfo.aLink.push (elem);
		iResult = 1;
	}
	
	return iResult;
}

function sendBinaryPacket (socket)
{
	var packet = new Buffer(10);
	
	packet[0] = 0x13;
	packet[1] = 0x8a;
	packet[2] = 0x00;
	packet[3] = 0x00;
	packet[4] = 0x00;
	packet[5] = 0x77;
	packet[6] = 0xb6
	packet[7] = 0xfd
	packet[8] = 0x11
	packet[9] = 0x11
	socket.write(packet);
}


function receiveData (protocol, oData, message, type, socket)
{
	
	switch (protocol)
	{
		case 0:
			protocol = insertNewArrayElement(oData, type, socket);
			
			if (protocol == 1)
				protocol = receiveData (protocol, oData, message, type, socket);
		break;
		case 1: // SI PODEMOS ENRUTAR
			// Enrutar 2 sockets
//console.log ('hola ' + oData.type + ' ' +  oData.sessionKeyFrom + ' ' + oData.sessionKeyTo  + ' ' +  oData.app + ' ' +  oData.format + ' ' + oData.packed );
			
			var json1 = JSON.stringify({ type:'KeySS', sessionKeyFrom: oData.sessionKeyFrom.toLowerCase(),  sessionKeyTo: oData.sessionKeyTo.toLowerCase(), app: oData.app, server: 'false',  format: 'text', packed: 'false'});
			var json2 = JSON.stringify({ type:'KeySS', sessionKeyFrom: oData.sessionKeyTo.toLowerCase(),  sessionKeyTo: oData.sessionKeyFrom.toLowerCase(), app: oData.app, server: 'false',  format: 'text', packed: 'false'});
			
			if (aSockets[""+oData.sessionKeyFrom+oData.sessionKeyTo+oData.app])
			{
				if (aSockets[""+oData.sessionKeyTo+oData.sessionKeyFrom+oData.app].idType == 'socket')
				{
					aSockets[""+oData.sessionKeyTo+oData.sessionKeyFrom+oData.app].idConnection.write(json1);		// WRCSTART
					sendBinaryPacket(aSockets[""+oData.sessionKeyTo+oData.sessionKeyFrom+oData.app].idConnection);	// ACTIVATE HTML5 paquets
					aSockets[""+oData.sessionKeyTo+oData.sessionKeyFrom+oData.app].idConnection.write(json1);		// JSON identifier
				}
				if (aSockets[""+oData.sessionKeyTo+oData.sessionKeyFrom+oData.app].idType == 'websocket')				
					aSockets[""+oData.sessionKeyTo+oData.sessionKeyFrom+oData.app].idConnection.sendUTF(json1.length+2 + ',aa' + json1);	// add 'aa' to length  -clientmp compatibility-
			}
			
			if (type == 'socket')
			{
				socket.write(json2);		// WRCSTART
				sendBinaryPacket(socket);	// ACTIVATE HTML5 paquets
				socket.write(json2);		// JSON identifier
			}
			if (type == 'websocket')
			{
				socket.sendUTF(json2.length+2 + ',aa' + json2); // add 'aa' to length -clientmp compatibility-
			}
				

			protocol = 2;  // Connected
		break;
		case 2:	 // CONNECTED	
			if (aSockets[""+oData.sessionKeyTo+oData.sessionKeyFrom+oData.app])
			{
				if (aSockets[""+oData.sessionKeyTo+oData.sessionKeyFrom+oData.app].idType == 'socket')
					aSockets[""+oData.sessionKeyTo+oData.sessionKeyFrom+oData.app].idConnection.write(message);
				if (aSockets[""+oData.sessionKeyTo+oData.sessionKeyFrom+oData.app].idType == 'websocket')				
					aSockets[""+oData.sessionKeyTo+oData.sessionKeyFrom+oData.app].idConnection.sendUTF(message);					
			}
			else
			{
				// Close RC
console.log ('Closed RC :' + oData.sessionKeyFrom+oData.sessionKeyTo+oData.app);
				if (type == 'socket')
					socket.end();
				if (type == 'websocket')
					socket.close();
			}
		break;
//		If connection is not stablished, check what we receive and returns to current connection
		case 3:	 // Waiting Connection
			if (aSockets[""+oData.sessionKeyTo+oData.sessionKeyFrom+oData.app] == undefined)
			{
				if (type == 'socket')
					socket.write('701 IMHERE');
//				if (type == 'websocket')				
//					socket.sendUTF('701 PING');					
				break
			}
		case 4:
			if (aSockets[""+oData.sessionKeyTo+oData.sessionKeyFrom+oData.app])
			{
				protocol = receiveData (2, oData, message, type, socket);
			}
		break;
		case 5:
console.log('Disconnected¿?: ' + message);		
		break;
		default:
console.log('DEFAULT :' + protocol);
		break;
	}

	
	return protocol;
}
		

function evalExpression (message)
{
	var oData;
	
	try {
		oData=eval('('+ message +')');
		if (!checkCorrectData (oData))
		{
			console.log ('Missing parameters : ' + message);
			return;
		}
	}
	catch(error)
	{
		console.log ('Incorrect message: ' + message);
		return;
	}

	return oData;
}		
		

//////////////////////////////////////////////////////////
// SOCKET
//////////////////////////////////////////////////////////
var net = require('net');
var serverNET = net.createServer(function (socket) 
{
	var protocol = 0;
	var oData;
	console.log ("serverNET");
	
	socket.setNoDelay(true);
	socket.on('data', function(message){
	
		if (protocol == 0)
		{
			oData = evalExpression (message);
			if (!oData)
			{
				socket.end();
				return;
			}
		}
		protocol = receiveData(protocol, oData, message, 'socket', socket);
	});
	
	socket.on('end', function(){
console.log('end: ' );
		protocol = 5;
		if (oData)
		{
			if (aSockets[""+oData.sessionKeyFrom+oData.sessionKeyTo+oData.app])
				aSockets[""+oData.sessionKeyFrom+oData.sessionKeyTo+oData.app] = null;			
		}
		//XMAS  destruir objecte  aSockets
	});

	socket.on('close', function(){
		protocol = 5;
		if (oData)
		{
			if (aSockets[""+oData.sessionKeyFrom+oData.sessionKeyTo+oData.app])
				aSockets[""+oData.sessionKeyFrom+oData.sessionKeyTo+oData.app] = null;			
		}
console.log('close: ');
		//XMAS  destruir objecte  aSockets
	});
	
	socket.on('error', function (e) {
		console.log ('pepepe' + e);
	  if (e.code == 'EADDRINUSE') {
console.log('Address in use, retrying...');
	  }
	});  
});
serverNET.listen(port_sck);


//////////////////////////////////////////////////////////
// WEBSOCKETS
//////////////////////////////////////////////////////////
var WebSocketServer = require('websocket').server;
var http = require('http');

var server = http.createServer(function(request, response) {
    // process HTTP request. Since we're writing just WebSockets server
    // we don't have to implement anything.
});
server.listen(port_ws, function() { });

// create the server
wsServer = new WebSocketServer({
    httpServer: server
});

// WebSocket server
wsServer.on('request', function(request) {
    var connection = request.accept(null, request.origin);
	var protocol = 0;
	var oData;
	
    // This is the most important callback for us, we'll handle
    // all messages from users here.
    connection.on('message', function(message) {
		var msg;
		
        if (message.type === 'utf8')
			msg = message.utf8Data;
        if (message.type === 'binary') // accept only text
			msg = message.binaryData;

		if (protocol == 0)
		{
			oData = evalExpression (msg);
			if (!oData)
			{
				connection.close();
				return;
			}
		}			
		protocol = receiveData(protocol, oData, msg, 'websocket', connection);	
    });

    connection.on('close', function(connection) {
		console.log('END: ');
		if (oData)
		{
			if (aSockets[""+oData.sessionKeyFrom+oData.sessionKeyTo+oData.app])
				aSockets[""+oData.sessionKeyFrom+oData.sessionKeyTo+oData.app] = null;			
		}
		//XMAS  destruir objecte  aSockets
    });
});





//////////////////////////////////////////////////////////
// HTTP
//////////////////////////////////////////////////////////
var http = require('http');
var serverHTTP = http.createServer(function (req, res) 
{
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello World\n');
});
serverHTTP.listen(1337);


//////////////////////////////////////////////////////////
// SSL
//////////////////////////////////////////////////////////
/*
var tls = require('tls');
var fs = require('fs');

var options = {
  pfx: fs.readFileSync('TestCert_Privileged.pfx'),

  // This is necessary only if using the client certificate authentication.
  requestCert: true,

};


var serverSSL = tls.createServer(options, function(socketSSL) {
  console.log('server connected',
              socketSSL.authorized ? 'authorized' : 'unauthorized');
  socketSSL.setEncoding('utf8');
  socketSSL.write("welcome!\n");
  socketSSL.pipe(socketSSL);
});
serverSSL.listen(1338);
*/

console.log('END');
