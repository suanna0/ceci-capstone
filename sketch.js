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
  doAcquireHandLandmarks: true,
  doAcquirePoseLandmarks: true,
  doAcquireFaceLandmarks: true,
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

//------------------------------------------
async function preload() {
	preloadTracker();
}

//------------------------------------------
function setup() {
  createCanvas(640, 480);
	myCapture = createCapture(VIDEO);
	myCapture.size(160,120); 
  myCapture.hide();
	initiateTracking(); 
	
	checkboxHand = createCheckbox('hand', trackingConfig.doAcquireHandLandmarks);
  checkboxHand.position(0, 20);
	checkboxFace = createCheckbox('face', trackingConfig.doAcquireFaceLandmarks);
  checkboxFace.position(0, 40);
	checkboxPose = createCheckbox('pose', trackingConfig.doAcquirePoseLandmarks);
  checkboxPose.position(0, 60);
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
  drawPosePoints(); 
  drawFacePoints();
  drawFaceMetrics();
	
	// Example "applications"; for code, see below:
	drawClownNose();
	drawThumbPlum();
	drawJawOpenness(); 
	drawDiagnosticInfo();
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

//------------------------------------------
function drawVideoBackground() {
  push();
  translate(width, 0);
  scale(-1, 1);
  tint(255, 255, 255, 72);
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
}