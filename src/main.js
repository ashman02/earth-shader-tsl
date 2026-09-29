import * as THREE from "three/webgpu"
import {OrbitControls} from "three/addons/controls/OrbitControls.js"
import {Inspector} from "three/addons/inspector/Inspector.js"

/**
 * Base
 */
// Canvas
const canvas = document.querySelector("canvas.threejs")

// Scene
const scene = new THREE.Scene()

/**
 * Sizes
 */
const sizes = {
  width : window.innerWidth,
  height : window.innerHeight
}

window.addEventListener("resize", () => {
  // Update sizes
  sizes.width = window.innerWidth
  sizes.height = window.innerHeight

  // Update camera
  camera.aspect = sizes.width / sizes.height
  camera.updateProjectionMatrix()

  // Update renderer
  renderer.setSize(sizes.width, sizes.height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})


/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(
  35, 
  sizes.width / sizes.height,
  0.01,
  100
)
camera.position.z = 4
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGPURenderer({
  canvas : canvas,
  antialias : true
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setClearColor(0x111111)
renderer.inspector = new Inspector()

/**
 * Dummy
 */
const mesh = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshBasicMaterial({color : 0xff0000})
)
scene.add(mesh)

/**
 * Animate
 */
const tick = () => {
  // Update controls
  controls.update()
  // Render
  renderer.render(scene, camera)
}
renderer.setAnimationLoop(tick)