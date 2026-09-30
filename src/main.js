import * as THREE from "three/webgpu"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import { Inspector } from "three/addons/inspector/Inspector.js"
import {
	cameraPosition,
	color,
	dot,
	Fn,
	mix,
	normalWorld,
	normalWorldGeometry,
	positionWorld,
	reflect,
	texture,
	uniform,
	uv,
	vec3,
} from "three/tsl"

/**
 * Base
 */
// Canvas
const canvas = document.querySelector("canvas.threejs")

// Scene
const scene = new THREE.Scene()

// Loaders
const textureLoader = new THREE.TextureLoader()

/**
 * Sizes
 */
const sizes = {
	width: window.innerWidth,
	height: window.innerHeight,
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
	25,
	sizes.width / sizes.height,
	0.01,
	100,
)
camera.position.x = 12
camera.position.y = 5
camera.position.z = 4
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGPURenderer({
	canvas: canvas,
	antialias: true,
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setClearColor(0x000011)
renderer.inspector = new Inspector()

/**
 * Earth
 */
// Textures
const earthDayTexture = textureLoader.load("./earth/day.jpg")
earthDayTexture.colorSpace = THREE.SRGBColorSpace
earthDayTexture.anisotropy = 8

const earthNightTexture = textureLoader.load("./earth/night.jpg")
earthNightTexture.colorSpace = THREE.SRGBColorSpace
earthNightTexture.anisotropy = 8

const earthSpecularCloudsTexture = textureLoader.load(
	"./earth/specularClouds.jpg",
)
earthSpecularCloudsTexture.anisotropy = 8

// Geometry
const earthGeometry = new THREE.SphereGeometry(2, 64, 64)

// Uniforms
const sunDirection = uniform(new THREE.Vector3(0, 0, 1))
const atmoshpereDayColor = uniform(color(0x00aaff))
const atmosphereTwilightColor = uniform(color(0xff6600))

// Material
const earthMaterial = new THREE.MeshBasicNodeMaterial()

// Color
earthMaterial.colorNode = Fn(() => {
	const finalColor = vec3(0.0)
	const viewDirection = positionWorld.sub(cameraPosition).normalize()
	const normal = normalWorld.normalize()

	const sunOrientation = dot(sunDirection, normal)
	// day mix
	const dayMix = sunOrientation.smoothstep(-0.25, 0.5)
	const dayColor = texture(earthDayTexture, uv()).rgb
	const nightColor = texture(earthNightTexture, uv()).rgb

	// Final Color
	finalColor.assign(mix(nightColor, dayColor, dayMix))

	// Clouds
	const specularCloudsColor = texture(earthSpecularCloudsTexture, uv()).rg
	const cloudsMix = specularCloudsColor.g.smoothstep(0.5, 1).mul(dayMix)
	finalColor.assign(mix(finalColor, vec3(1), cloudsMix))

	// Atmosphere
	// Fresnel
	const fresnel = dot(viewDirection, normal).add(1).pow(2)

	const atmosphereDayMix = sunOrientation.smoothstep(-0.5, 1)
	const atmosphereColor = mix(
		atmosphereTwilightColor,
		atmoshpereDayColor,
		atmosphereDayMix,
	)

	finalColor.assign(
		mix(finalColor, atmosphereColor, fresnel.mul(atmosphereDayMix)),
	)

	// Specular
	const reflection = reflect(sunDirection.negate(), normal)
	const specular = dot(reflection, viewDirection)
		.negate()
		.max(0)
		.pow(32)
		.mul(specularCloudsColor.r)

	const specularColor = mix(vec3(1), atmosphereColor, fresnel)

	finalColor.addAssign(specular.mul(specularColor))

	return finalColor
})()

// Mesh
const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial)
scene.add(earthMesh)

// Debug
const earthGui = renderer.inspector.createParameters("Earth")
earthGui.addColor(atmoshpereDayColor, "value").name("dayColor")
earthGui.addColor(atmosphereTwilightColor, "value").name("twilightColor")

/**
 * Outer Atmoshpere
 */
// we can use same earthGeomtry but we need different material
// Material
const atmoshpereMaterial = new THREE.MeshBasicNodeMaterial({
	side: THREE.BackSide,
	transparent: true,
})

// Color
atmoshpereMaterial.colorNode = Fn(() => {
	const finalColor = vec3(0)
	// Why normalWorldGeometry instead of normalWorld ? Because when we use three.backside or double side TSL mulitplies it with some called faceDirection so they become opposite of raw world normal that we need.
	const normal = normalWorldGeometry.normalize()

	const sunOrientation = dot(sunDirection, normal)

	// Atmosphere
	const atmosphereDayMix = sunOrientation.smoothstep(-0.5, 1)
	const atmosphereColor = mix(
		atmosphereTwilightColor,
		atmoshpereDayColor,
		atmosphereDayMix,
	)
	finalColor.addAssign(atmosphereColor)

	return finalColor
})()

// Opacity
atmoshpereMaterial.opacityNode = Fn(() => {
	// Why normalWorldGeometry instead of normalWorld ? Because when we use three.backside or double side TSL mulitplies it with some called faceDirection so they become opposite of raw world normal that we need.
	const normal = normalWorldGeometry.normalize()
	const viewDirection = positionWorld.sub(cameraPosition).normalize()

	const sunOrientation = dot(sunDirection, normal)

	// Fresnel 
	const edgeAlpha = dot(viewDirection, normal).smoothstep(0.0, 0.5)

	const dayAlpha = sunOrientation.smoothstep(-0.5, 0)

	return dayAlpha.mul(edgeAlpha)
})()

// Mesh
const atmosphereMesh = new THREE.Mesh(earthGeometry, atmoshpereMaterial)
atmosphereMesh.scale.set(1.04, 1.04, 1.04)
scene.add(atmosphereMesh)

/**
 * Sun
 */
const sunSpherical = new THREE.Spherical(1, Math.PI * 0.5, 0.5)

// Debug sun
const debugSun = new THREE.Mesh(
	new THREE.IcosahedronGeometry(0.1, 2),
	new THREE.MeshBasicMaterial(),
)
scene.add(debugSun)

const updateSun = () => {
	// Update sun direction uniform
	sunDirection.value.setFromSpherical(sunSpherical)

	// Update debug sun
	debugSun.position.copy(sunDirection.value).multiplyScalar(5)
}

updateSun()

// Debug
const sunGui = renderer.inspector.createParameters("Sun")
sunGui.add(sunSpherical, "phi", 0, Math.PI, 0.01).onChange(updateSun)
sunGui.add(sunSpherical, "theta", -Math.PI, Math.PI, 0.01).onChange(updateSun)

/**
 * Animate
 */

const timer = new THREE.Timer()
timer.connect(document)

const tick = () => {
	timer.update()
	const elapsedTime = timer.getElapsed()

	// earth
	earthMesh.rotation.y = elapsedTime * 0.1

	// Update controls
	controls.update()

	// Render
	renderer.render(scene, camera)
}
renderer.setAnimationLoop(tick)
