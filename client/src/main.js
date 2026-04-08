import './style.css'
import p5 from 'p5'

const sketch = (p) => {
  let latestValue = 0 

  // WebSocket to serial bridge
  let socket

  p.setup = () => {
    p.createCanvas(p.windowWidth, p.windowHeight);
    p.textSize(24)

    // Adjust port if your server uses a different one
    socket = new WebSocket('ws://localhost:8080')

    socket.onmessage = (event) => {
      // assume the server sends plain text numbers
      const value = Number(event.data)
      if (!Number.isNaN(value)) {
        latestValue = value
      }
    }
  }
  p.windowResized = () =>{
    p.resizeCanvas(p.windowWidth, p.windowHeight);
  }

  p.draw = () => {
    p.background(30)
    p.fill(255)

    p.text('Sensor Value:', 20, 50)
    p.text(latestValue, 20, 90)

    // Simple visual mapping
    const x = p.map(latestValue, 0, 1023, 0, p.width)
    p.fill(100, 200, 255)
    p.rect(20, 150, x, 40)
  }
  
  
}

new p5(sketch)
