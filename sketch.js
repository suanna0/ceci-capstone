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
let sliderMaxDistance;

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

	// 640 * 480 ratio is 4:3
  createCanvas(windowHeight * 4/3, windowHeight);

	// Create webcam capture
	myWebcam = createCapture(VIDEO);
	myWebcam.size(windowHeight * 4/3, windowHeight);
	myWebcam.hide();

	// Create video file element (16:9 aspect ratio)
	myVideoFile = createVideo('assets/evelyn_0.mp4');
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

	// Slider for maxDistance (0.1 to 1.0, default 0.5)
	sliderMaxDistance = createSlider(0.1, 1.0, 0.5, 0.01);
	sliderMaxDistance.position(0, 105);
	sliderMaxDistance.style('width', '100px');

	// Initialize connection to OSC bridge
	setupWebSocket();
}

//------------------------------------------
function onVideoSourceChange() {
	useVideoFile = checkboxVideoFile.checked();
	if (useVideoFile) {
		// Switch to video file with 16:9 aspect ratio
		resizeCanvas(windowHeight * 16/9, windowHeight);
		myCapture = myVideoFile;
		myVideoFile.play();
	} else {
		// Switch to webcam with 4:3 aspect ratio
		resizeCanvas(windowHeight * 4/3, windowHeight);
		myCapture = myWebcam;
		myVideoFile.pause();
	}
}

//------------------------------------------
let videoPaused = false;
function keyPressed() {
	if (key === ' ' && useVideoFile) {
		if (videoPaused) {
			myVideoFile.play();
			videoPaused = false;
		} else {
			myVideoFile.pause();
			videoPaused = true;
		}
		return false; // Prevent default space behavior
	}
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
  drawVideoBackground();
	
	trackingConfig.doAcquireHandLandmarks = checkboxHand.checked();
	trackingConfig.doAcquireFaceLandmarks = checkboxFace.checked();
	trackingConfig.doAcquirePoseLandmarks = checkboxPose.checked();
	
	// These functions are defined in trackerstuff.js
  drawHandPoints();
//   drawPosePoints(); 
  drawFacePoints();
  drawFaceMetrics();
	
	// Example "applications"; for code, see below:
	drawClownNose();
	drawThumbPlum();
	drawJawOpenness();
	drawChosenJoints();
	drawDiagnosticInfo();

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
	var jointA = 11;
	var jointB = 15;
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
  translate(width, 0);
  scale(-1, 1);
  tint(255, 255, 255, 255);
  image(myCapture, 0, 0, width, height);
  tint(255);
  pop();
}

//------------------------------------------
let frameRateAvg = 60.0;
function drawDiagnosticInfo() {
  noStroke();
  fill("black");
  textSize(12);
	frameRateAvg = 0.98*frameRateAvg + 0.02*frameRate();
  text("FPS: " + nf(frameRateAvg,1,2), 40, 30);

	// Show OSC bridge connection status
	if (wsConnected) {
		fill(0, 200, 0);
		text("OSC: Connected", 40, 45);
	} else {
		fill(200, 0, 0);
		text("OSC: Disconnected", 40, 45);
	}

	// Show maxDistance slider value
	fill("black");
	text("maxDist/sensitivity: " + nf(sliderMaxDistance.value(), 1, 2), 20, 140);
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

	const distance = getPoseDistance(11, 15);
	if (distance === null) return;

	// Normalize to 0-1 range using slider value
	let maxDistance = sliderMaxDistance.value();
	let normalized = constrain(distance / maxDistance, 0, 1);

	ws.send(JSON.stringify({ pose: normalized }));
}