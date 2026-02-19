// p5.js interface to Google MediaPipe Landmark Tracking
// Combines face, hands, and bodies into one tracker.
// See https://mediapipe-studio.webapps.google.com/home
// Uses p5.js v.1.11.11 + MediaPipe v.0.10.22-rc.20250304
// By Golan Levin, revised as of 10/21/2025
//
// This app demonstrates how to access:
// - face points (e.g. clown nose)
// - hand points (e.g. thumb plum)
// - face metrics (e.g. jaw openness)
// - body pose

//----------------------------------------------------
// Don't change the names of these global variables.
let handLandmarks;
let poseLandmarks;
let faceLandmarks;
let myCapture;
let frameRateAvg = 60.0;

//----------------------------------------------------
// For landmarks you want, set to true; set false the ones you don't.
// You'll get best performance with just one or two sets of landmarks.
// (Note, trackers set to false on startup can't be enabled later.)
let trackingConfig = {
  doAcquireHandLandmarks: false,
  doAcquirePoseLandmarks: true,
  doAcquireFaceLandmarks: false,
  doAcquireFaceMetrics: true,
  poseModelLiteOrFull: "full", /* "lite" (3MB) or "full" (6MB) */
  cpuOrGpuString: "GPU", /* "GPU" or "CPU" */
  maxNumHands: 2,
  maxNumPoses: 1,
  maxNumFaces: 1,
};
let checkboxHand;
let checkboxFace;
let checkboxPose;
let checkboxVideoFile;
let checkboxFullVideo;
let checkboxParticles;
let sliderMinDistance;
let sliderMaxDistance;
let sliderSmoothing;
let smoothedValue = 0; // For exponential smoothing of OSC signal

// Time graph for OSC signal
let signalHistory = []; // Array of {time, value} objects
let graphWidth = 400;
let graphHeight = 100;
let sliderX = 30;
let graphX; // Will be set in setup()
let graphY; // Will be set in setup() based on canvas height

let particleCols = 30;
let particleRows = 30;

let jointA = 29;
let jointB = 30;

//----------------------------------------------------
// Video input sources
let myWebcam;
let myVideoFile;
let useVideoFile = false;

//----------------------------------------------------
// OSC Bridge Configuration (connects to osc-bridge.js which forwards to TouchDesigner)
let ws;
let wsConnected = false;
const WS_URL = "ws://localhost:9980"; // OSC bridge WebSocket port

//------------------------------------------
async function preload() {
	preloadTracker();
}

//------------------------------------------
function setup() {

  createCanvas(windowHeight * 4/3, windowHeight);

	// Create webcam capture
	myWebcam = createCapture(VIDEO);
	myWebcam.size(windowHeight * 4/3, windowHeight);
	myWebcam.hide();

	myVideoFile = createVideo('assets/evelyn_1.mp4');
	myVideoFile.size(windowHeight * 16/9, windowHeight);
	myVideoFile.hide();
	myVideoFile.loop();
	myVideoFile.volume(0);

	// Start with webcam as default
	myCapture = myWebcam;
	initiateTracking();

	checkboxHand = createCheckbox('hand', trackingConfig.doAcquireHandLandmarks);
	checkboxHand.position(0, 20);
	checkboxFace = createCheckbox('face', trackingConfig.doAcquireFaceLandmarks);
	checkboxFace.position(0, 40);
	checkboxPose = createCheckbox('pose', trackingConfig.doAcquirePoseLandmarks);
	checkboxPose.position(0, 60);
	checkboxVideoFile = createCheckbox('use video file', false);
	checkboxVideoFile.position(0, 80);
	checkboxVideoFile.changed(onVideoSourceChange);
	checkboxFullVideo = createCheckbox('full video', true);
	checkboxFullVideo.position(0, 100);
	checkboxParticles = createCheckbox('particles', false);
	checkboxParticles.position(0, 120);

	// Sliders - positions will be set after graphY is calculated
	sliderMinDistance = createSlider(0, 0.5, 0.05, 0.01);
	sliderMinDistance.style('width', '100px');

	sliderMaxDistance = createSlider(0.1, 1.0, 0.5, 0.01);
	sliderMaxDistance.style('width', '100px');

	sliderSmoothing = createSlider(0, 0.99, 0.5, 0.01);
	sliderSmoothing.style('width', '100px');

	// Initialize connection to OSC bridge
	setupWebSocket();

	initParticles(30, 30, 8);
	frameRate(frameRateAvg);

	// Set graph and slider positions at bottom left (side by side)
	graphY = height - graphHeight - 20;
	graphX = sliderX + 240; // Graph to the right of sliders

	// Position sliders next to the graph
	positionSliders();
}

function positionSliders() {
	let sliderStartY = graphY + 10;
	sliderMinDistance.position(sliderX, sliderStartY);
	sliderMaxDistance.position(sliderX, sliderStartY + 35);
	sliderSmoothing.position(sliderX, sliderStartY + 70);
}

//------------------------------------------
function onVideoSourceChange() {
	useVideoFile = checkboxVideoFile.checked();
	if (useVideoFile) {
		resizeCanvas(windowHeight * 16/9, windowHeight);
		myCapture = myVideoFile;
		myVideoFile.play();
		// Clear signal history when switching to video
		signalHistory = [];
	} else {
		resizeCanvas(windowHeight * 4/3, windowHeight);
		myCapture = myWebcam;
		myVideoFile.pause();
	}
	// Update graph and slider positions
	graphY = height - graphHeight - 20;
	graphX = sliderX + 240;
	positionSliders();
}

//------------------------------------------
let videoPaused = false;
let soundOn = false;
function keyPressed() {
	if (key === '`') {
		soundOn = !soundOn;
		myVideoFile.volume(soundOn ? 1 : 0);
		console.log("Sound: " + (soundOn ? "ON" : "OFF"));
		return false;
	}
	if (keyCode === UP_ARROW) {
		particleCols+=5;
		particleRows+=5;
		initParticles(particleCols, particleRows, 8);
	} else if (keyCode === DOWN_ARROW) {
		particleCols-=5;
		particleRows-=5;
		initParticles(particleCols, particleRows, 8);
	}
	// Handle backspace for particle word
	if (keyCode === BACKSPACE) {
		handleParticleInput('Backspace');
		return false;
	}
}

//------------------------------------------
function keyTyped() {
	handleParticleInput(key);
	return false;
}

//------------------------------------------
function setupWebSocket() {
	ws = new WebSocket(WS_URL);

	ws.onopen = function() {
		console.log("WebSocket connected to " + WS_URL);
		wsConnected = true;
	};

	ws.onerror = function(err) {
		console.log("WebSocket error");
		wsConnected = false;
	};

	ws.onclose = function() {
		console.log("WebSocket closed, reconnecting in 2s...");
		wsConnected = false;
		setTimeout(setupWebSocket, 2000); // Auto-reconnect
	};
}


//------------------------------------------
function draw() {
  background("white");
// background(255, 255, 255, 4);
  drawVideoBackground();
	
	trackingConfig.doAcquireHandLandmarks = checkboxHand.checked();
	trackingConfig.doAcquireFaceLandmarks = checkboxFace.checked();
	trackingConfig.doAcquirePoseLandmarks = checkboxPose.checked();
	
	// These functions are defined in trackerstuff.js
//   drawHandPoints();
//   drawPosePoints(); 
//   drawFacePoints();
//   drawFaceMetrics();
	
	// Example "applications"; for code, see below:
	drawClownNose();
	drawThumbPlum();
	drawJawOpenness();
	drawChosenJoints();
	// drawPoseCircle(1, 10, 255, 0, 0, 180);
	// drawQuadrangle();
	if (checkboxParticles.checked()) {
		updateParticles();
		drawParticles(0, 0, 0, 255);
	}

	drawDiagnosticInfo();

	// Update and draw time graph for OSC signal
	updateSignalHistory();
	drawTimeGraph();

	// Send pose landmarks via OSC to TouchDesigner
	sendPoseData();
}

//------------------------------------------
function drawClownNose(){
	// Study this to understand how to access face points.
	// Here's the simplest possible mask, a clown nose.
	if (trackingConfig.doAcquireFaceLandmarks) {
    if (faceLandmarks && faceLandmarks.faceLandmarks) {
      const nFaces = faceLandmarks.faceLandmarks.length;
      if (nFaces > 0) {
				for (let f=0; f<nFaces; f++){
					
					// Draw a red circle centered on the nose (point #1)
					let aFace = faceLandmarks.faceLandmarks[f];
					let noseIndex = 1;
					let nosePt = aFace[noseIndex];
					let nx = map(nosePt.x, 0,1, width,0);
					let ny = map(nosePt.y, 0,1, 0,height);
					fill(255,0,0, 180);
					noStroke(); 
					circle(nx,ny, 40); 
					
					// Draw a small circle whose index is based on mouseX
					let mouseIndex = int(map(mouseX,0,width, 0,478)); 
					mouseIndex = constrain(mouseIndex, 0,477);
					let mousePt = aFace[mouseIndex];
					let mx = map(mousePt.x, 0,1, width,0);
					let my = map(mousePt.y, 0,1, 0,height);
					text(mouseIndex, mx+6,my);
					noFill();
					stroke(0); 
					circle(mx,my, 8);
				}
			}
		}
	}
}

//------------------------------------------
function drawThumbPlum(){
	// Study this to understand how to access hand points.
	// Stick in your thumb; pull out a plum. 
	if (trackingConfig.doAcquireHandLandmarks) {
    if (handLandmarks && handLandmarks.landmarks) {
      const nHands = handLandmarks.landmarks.length;
      if (nHands > 0) {
				let joints = handLandmarks.landmarks[0];
				let thumbPt = joints[THUMB_TIP];
				let thx = map(thumbPt.x, 0,1, width,0);
        let thy = map(thumbPt.y, 0,1, 0,height);
				fill(128,0,128, 180);
				noStroke(); 
				circle(thx,thy, 40); 
			}
		}
	}
}

//------------------------------------------
function drawJawOpenness(){
	// Study this to understand how to access face metrics.
	// In this case, we extract the "jaw openness" metric.
  if (trackingConfig.doAcquireFaceLandmarks && 
      trackingConfig.doAcquireFaceMetrics){
    if (faceLandmarks && faceLandmarks.faceBlendshapes) {
      const nFaces = faceLandmarks.faceLandmarks.length;
			let aFaceMetrics = faceLandmarks.faceBlendshapes[0];
			if (aFaceMetrics){
				let which=25; // the "jawOpen" metric (0...1)
				let jawOpenness01 = aFaceMetrics.categories[which].score;
				let jawBarHeight = map(jawOpenness01,0,1, 0,height);
				noStroke(); 
				fill(0,0,0, 150);
				rect(150,height, 40,0-jawBarHeight);
				textSize(10);
				text("jaw", 150, height-jawBarHeight-5);
			}
    }
	}
}


function drawChosenJoints() {
	if (trackingConfig.doAcquirePoseLandmarks) {
		if (poseLandmarks && poseLandmarks.landmarks) {
			const nPoses = poseLandmarks.landmarks.length;
			if (nPoses > 0) {
				let ptA = poseLandmarks.landmarks[0][jointA];
				let ptB = poseLandmarks.landmarks[0][jointB];
				let ax = map(ptA.x, 0, 1, width, 0);
				let ay = map(ptA.y, 0, 1, 0, height);
				let bx = map(ptB.x, 0, 1, width, 0);
				let by = map(ptB.y, 0, 1, 0, height);
				fill(255);
				noStroke();
				circle(ax, ay, 8);
				circle(bx, by, 8);
				stroke(255);
				strokeWeight(1);
				line(ax, ay, bx, by);
				noStroke();
				text(round(dist(ax, ay, bx, by)), ax + 10, ay + 10);

			}
		}
	}
}

//------------------------------------------
function drawVideoBackground() {
  push();
  if (checkboxFullVideo.checked()) {
    // Full-scale video background at 50% opacity
    translate(width, 0);
    scale(-1, 1);
    tint(255, 127);
    image(myCapture, 0, 0, width, height);
  } else {
    // Small thumbnail
    let thumbW = 160;
    let thumbH = 120;
    let thumbX = 10;
    let thumbY = height/2 - thumbH/2 - 10;
    translate(thumbX + thumbW, thumbY);
    scale(-1, 1);
    tint(255);
    image(myCapture, 0, 0, thumbW, thumbH);
  }
  pop();
}

//------------------------------------------
function drawDiagnosticInfo() {
  noStroke();
  fill("black");
  textFont('monospace');
  textSize(12);
	frameRateAvg = 0.98*frameRateAvg + 0.02*frameRate();

	// Position diagnostic info above sliders
	let diagX = sliderX;
	let diagY = graphY - 25;
	text("fps: " + nf(frameRateAvg,1,2), diagX, diagY);

	// Show OSC bridge connection status
	fill("black");
	if (wsConnected) {
		text("osc: ✓", diagX, diagY + 15);
	} else {
		text("osc: ✗", diagX, diagY + 15);
	}

	// Slider labels (positioned next to sliders)
	fill("black");
	let labelX = sliderX + 105;
	let sliderStartY = graphY + 10;
	text("min: " + nf(sliderMinDistance.value(), 1, 2), labelX, sliderStartY + 12);
	text("max: " + nf(sliderMaxDistance.value(), 1, 2), labelX, sliderStartY + 47);
	text("smooth: " + nf(sliderSmoothing.value(), 1, 2), labelX, sliderStartY + 82);
}


//------------------------------------------
// Record and draw OSC signal time graph
function updateSignalHistory() {
	if (!useVideoFile) return; // Only record when using video file

	let currentTime = myVideoFile.time();
	let duration = myVideoFile.duration();

	if (duration > 0 && currentTime >= 0) {
		// Add current value to history
		signalHistory.push({
			time: currentTime,
			value: smoothedValue
		});

		// Remove old entries if video looped (time went backwards)
		if (signalHistory.length > 1) {
			let lastTime = signalHistory[signalHistory.length - 2].time;
			if (currentTime < lastTime - 1) {
				// Video looped, clear history
				signalHistory = [{time: currentTime, value: smoothedValue}];
			}
		}

		// Limit history size to prevent memory issues
		if (signalHistory.length > 10000) {
			signalHistory.shift();
		}
	}
}

function drawTimeGraph() {
	if (!useVideoFile) return; // Only show when using video file

	let duration = myVideoFile.duration();
	let currentTime = myVideoFile.time();

	if (duration <= 0) return;

	push();

	// Semi-transparent background
	fill(255, 255, 255, 100);
	strokeWeight(0);
	rect(graphX, graphY, graphWidth, graphHeight, 5);

	// Draw grid lines
	stroke(220);
	strokeWeight(0.5);
	// Horizontal grid (signal levels)
	for (let i = 0; i <= 4; i++) {
		let y = graphY + (i / 4) * graphHeight;
		line(graphX, y, graphX + graphWidth, y);
	}
	// Vertical grid (time markers)
	let timeStep = duration > 60 ? 10 : (duration > 30 ? 5 : 2); // seconds between markers
	for (let t = 0; t <= duration; t += timeStep) {
		let x = graphX + (t / duration) * graphWidth;
		line(x, graphY, x, graphY + graphHeight);
	}

	// Draw signal history as a line
	if (signalHistory.length > 1) {
		stroke(0, 150, 100);
		strokeWeight(1.5);
		noFill();
		beginShape();
		for (let i = 0; i < signalHistory.length; i++) {
			let x = graphX + (signalHistory[i].time / duration) * graphWidth;
			let y = graphY + graphHeight - (signalHistory[i].value * graphHeight);
			vertex(x, y);
		}
		endShape();
	}

	// Draw current time playhead
	let playheadX = graphX + (currentTime / duration) * graphWidth;
	stroke(255);
	strokeWeight(1);
	line(playheadX, graphY, playheadX, graphY + graphHeight);

	// Draw current value dot
	fill(255);
	noStroke();
	let dotY = graphY + graphHeight - (smoothedValue * graphHeight);
	circle(playheadX, dotY, 8);

	// Labels
	fill(0);
	noStroke();
	textFont('monospace');
	textSize(12);
	textAlign(LEFT, TOP);
	text("signal vs. time", graphX + 5, graphY + 5);

	// Time labels
	textAlign(CENTER, TOP);
	text(nf(duration, 1, 1) + "s", graphX + graphWidth, graphY + graphHeight + 3);
	text(nf(currentTime, 1, 1) + "s", playheadX, graphY + graphHeight + 3);

	// Value scale labels
	textAlign(RIGHT, CENTER);
	text("1.0", graphX - 3, graphY);
	text("0.5", graphX - 3, graphY + graphHeight / 2);
	text("0.0", graphX - 3, graphY + graphHeight);

	pop();
}

function getPoseDistance(a, b) {
	if (!poseLandmarks || !poseLandmarks.landmarks || poseLandmarks.landmarks.length === 0) return null;
	const pose = poseLandmarks.landmarks[0];
	if (!pose[a] || !pose[b]) return null;

	let dx = pose[a].x - pose[b].x;
	let dy = pose[a].y - pose[b].y;
	let dz = pose[a].z - pose[b].z;
	return sqrt(dx * dx + dy * dy + dz * dz);
}

//------------------------------------------
// Send normalized distance (0-1) via OSC bridge to TouchDesigner
function sendPoseData() {
	if (!wsConnected || !ws || ws.readyState !== WebSocket.OPEN) return;

	const distance = getPoseDistance(jointA, jointB);
	if (distance === null) return;

	// Normalize to 0-1 range using min/max slider values
	let minDistance = sliderMinDistance.value();
	let maxDistance = sliderMaxDistance.value();
	let normalized = map(distance, minDistance, maxDistance, 0, 1);
	normalized = constrain(normalized, 0, 1);

	// Apply exponential smoothing (low-pass filter)
	// Higher smoothing value = smoother but more latency
	let smoothing = sliderSmoothing.value();
	smoothedValue = smoothing * smoothedValue + (1 - smoothing) * normalized;

	ws.send(JSON.stringify({ pose: smoothedValue }));
}