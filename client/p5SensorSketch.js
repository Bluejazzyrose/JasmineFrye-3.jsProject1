// client/src/p5SensorSketch.js
import p5 from 'p5'

export function startP5SensorTest() {
    let latestValue = 0
    let socket
    
    const sketch = (p) => {
        p.setup = () => {
            p.createCanvas(p.windowWidth, p.windowHeight)
            p.textSize(24)
            p.noStroke()
            // Connect to WebSocket server
            socket = new WebSocket('ws://localhost:8080')
            socket.onmessage = (event) => {
            const value = Number(event.data)
            if (!Number.isNaN(value)) {
            latestValue = value
            }
            }
            socket.onopen = () => console.log('WebSocket connected (p5)')
            socket.onerror = (err) => console.error('WebSocket error (p5):', err)
            socket.onclose = () => console.log('WebSocket closed (p5)')
        }
        
        p.windowResized = () => {
            p.resizeCanvas(p.windowWidth, p.windowHeight)
        }

        p.draw = () => {
            p.background(20)
            // Map sensor 0–1023 → 0–1
            const t = p.constrain(latestValue / 1023, 0, 1)
            // Circle radius based on light
            const radius = p.map(t, 0, 1, 50, p.min(p.width, p.height) / 2)
            // Color based on light
            const brightness = p.map(t, 0, 1, 50, 255)
            p.fill(brightness, brightness, 255)
            p.circle(p.width / 2, p.height / 2, radius * 2)
            p.fill(255)
            p.text(`Sensor: ${latestValue}`, 20, 40)
        }
    }
    
    new p5(sketch)
}