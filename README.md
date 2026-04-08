# Graphics + Sensor Starter

Starter template for p5.js / three.js projects with a Node.js + serialport bridge.

## Structure

- `client/` — Front-end (p5.js or three.js) using Vite dev server.
- `server/` — Node.js server that reads from a serial port and broadcasts to the browser via WebSockets.

## Quick Start 

1. Install **Node.js LTS**.
2. In `client/`: `npm install`
3. In `server/`: `npm install`
4. Plug in your Arduino / sensor board.
5. In `server/server.js`, set the correct serial port path.
6. Start the server: `npm start` (in `server/`).
7. Start the client: `npm run dev` (in `client/`).
8. Open the browser at the link Vite prints (usually `http://localhost:5173`).
