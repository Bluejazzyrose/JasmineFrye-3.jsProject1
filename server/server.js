import { SerialPort } from 'serialport'
import { WebSocketServer } from 'ws'

// TODO: Update this for each lab environment
const SERIAL_PATH = process.env.SERIAL_PATH || 'COM4' // Windows example //MacOS /dev/usbmodemXXX or /dev/cu.usbserialXXX
const SERIAL_BAUD = 9600
const WS_PORT = 8080

// WebSocket server (browser clients connect here)
const wss = new WebSocketServer({ port: WS_PORT })
console.log(`WebSocket server listening on ws://localhost:${WS_PORT}`)

wss.on('connection', (ws) => {
  console.log('Client connected')
  ws.on('close', () => console.log('Client disconnected'))
})

// Serial port (Arduino / sensor)
const port = new SerialPort({
  path: SERIAL_PATH,
  baudRate: SERIAL_BAUD
})

port.on('open', () => {
  console.log(`Serial port opened: ${SERIAL_PATH} @ ${SERIAL_BAUD}`)
})

port.on('error', (err) => {
  console.error('Serial error:', err.message)
})

port.on('data', (data) => {
  const text = data.toString().trim()
  if (!text) return

  //console.log('Serial data:', text) **use to debug if you need it

  // broadcast to all connected WebSocket clients
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(text)
    }
  })
})
