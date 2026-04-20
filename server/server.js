import express from 'express';
import cors from 'cors';
import { SerialPort } from 'serialport';
 
const app = express();
const PORT = 3000;
 
// CHANGE THIS TO YOUR REAL ARDUINO PORT
const SERIAL_PORT = 'COM18';
// macOS example: '/dev/cu.usbmodemXXXX'
// Linux example: '/dev/ttyACM0'
 
const BAUD_RATE = 115200;
 
app.use(cors());
app.use(express.json());
 
let port;
 
try {
  port = new SerialPort({
    path: SERIAL_PORT,
    baudRate: BAUD_RATE,
  });
 
  port.on('open', () => {
    console.log(`Serial port opened on ${SERIAL_PORT}`);
  });
 
  port.on('data', (data) => {
    console.log('Arduino:', data.toString());
  });
 
  port.on('error', (err) => {
    console.error('Serial error:', err.message);
  });
} catch (error) {
  console.error('Failed to open serial port:', error.message);
}
 
app.get('/status', (req, res) => {
  res.json({
    ok: true,
    port: SERIAL_PORT,
    serialOpen: port ? port.isOpen : false,
  });
});
 
app.post('/hand', (req, res) => {
  const {
    thumb = 0,
    index = 0,
    middle = 0,
    ring = 0,
    pinky = 0
  } = req.body;
 
  const line =
    `T:${Math.round(thumb)},` +
    `I:${Math.round(index)},` +
    `M:${Math.round(middle)},` +
    `R:${Math.round(ring)},` +
    `P:${Math.round(pinky)}\n`;
 
  console.log('Sending:', line.trim());
 
  if (!port || !port.isOpen) {
    return res.status(500).json({
      ok: false,
      error: 'Serial port not open'
    });
  }
 
  port.write(line, (err) => {
    if (err) {
      return res.status(500).json({
        ok: false,
        error: err.message
      });
    }
 
    res.json({
      ok: true,
      sent: line.trim()
    });
  });
});
 
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});