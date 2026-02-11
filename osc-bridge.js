// OSC Bridge - receives WebSocket from p5.js and forwards as OSC UDP to TouchDesigner
// Run with: node osc-bridge.js

const WebSocket = require('ws');
const osc = require('osc');

// Configuration
const WS_PORT = 9980;           // WebSocket port for p5.js to connect to
const OSC_HOST = '127.0.0.1';   // TouchDesigner OSC In CHOP address
const OSC_PORT = 7000;          // TouchDesigner OSC In CHOP port

// Create UDP port for sending OSC
const udpPort = new osc.UDPPort({
  localAddress: '0.0.0.0',
  localPort: 0,  // Use any available port for sending
  remoteAddress: OSC_HOST,
  remotePort: OSC_PORT
});

udpPort.open();

udpPort.on('ready', () => {
  console.log(`OSC UDP sending to ${OSC_HOST}:${OSC_PORT}`);
});

// Create WebSocket server for p5.js
const wss = new WebSocket.Server({ port: WS_PORT });

console.log(`WebSocket server listening on port ${WS_PORT}`);

wss.on('connection', (ws) => {
  console.log('p5.js client connected');

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);

      if (msg.pose !== undefined && typeof msg.pose === 'number') {
        // Send normalized distance as single OSC value (0-1)
        udpPort.send({
          address: '/pose',
          args: [
            { type: 'f', value: msg.pose }
          ]
        });
      }
    } catch (err) {
      console.error('Error parsing message:', err);
    }
  });

  ws.on('close', () => {
    console.log('p5.js client disconnected');
  });
});
