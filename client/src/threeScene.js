// client/src/threeScene.js
import * as THREE from 'three'
export function startThreeSensorTest() {
    // --- WebSocket + sensor state ---
    let latestValue = 0
    const socket = new WebSocket('ws://localhost:8080')
    
    socket.onmessage = (event) => {
        const value = Number(event.data)
        if (!Number.isNaN(value)) {
            latestValue = value
        }
    }
    
    socket.onopen = () => console.log('WebSocket connected (three.js)')
    socket.onerror = (err) => console.error('WebSocket error (three.js):', err)
    socket.onclose = () => console.log('WebSocket closed (three.js)')
    
    // --- three.js setup ---
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    )
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    
    renderer.setSize(window.innerWidth, window.innerHeight)
    document.body.appendChild(renderer.domElement)
    
    // Cube
    const geometry = new THREE.BoxGeometry(1, 1, 1)
    const material = new THREE.MeshStandardMaterial({ color: 0x0077ff })
    const cube = new THREE.Mesh(geometry, material)
    scene.add(cube)
    
    // Light
    const light = new THREE.DirectionalLight(0xffffff, 1)
    light.position.set(3, 3, 3)
    scene.add(light)
    camera.position.z = 5
    
    // Resize handler
    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight
        camera.updateProjectionMatrix()
        renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', onWindowResize)
    
    // Animation loop
    function animate() {
        requestAnimationFrame(animate)
        // Convert sensor 0–1023 → 0–1
        const t = Math.min(Math.max(latestValue / 1023, 0), 1)
        // Use light to control cube scale
        const scale = 0.5 + t * 2.0 // from 0.5x to 2.5x
        cube.scale.set(scale, scale, scale)
        // Use light to control color (dark → bright blue)
        const brightness = Math.floor(100 + t * 155) // 100–255
        cube.material.color.setRGB(0, brightness / 255, 1)
        // Slowly rotate cube
        cube.rotation.x += 0.01
        cube.rotation.y += 0.01
        renderer.render(scene, camera)
    }
    
    animate()
}