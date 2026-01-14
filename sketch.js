// Demonstration of drawing skeletons on poses with ml5 BlazePose.
// Information: https://docs.ml5js.org/#/reference/bodypose
// Requires: https://unpkg.com/ml5@1.3.0/dist/ml5.js & p5.js v.1.11.11
// (via https://unpkg.com/ml5@1/dist/ml5.js)
// Version of 10/22/2025. 
// Learn more about the ml5.js project: https://ml5js.org/
// License: https://github.com/ml5js/ml5-next-gen/blob/main/LICENSE.md

let video;
let bodyPose;
let poses = [];
let connections;
let bodyPoseOptions = { maxPoses: 1, flipHorizontal: true, runtime: "mediapipe"};

function preload() {
  // Load the bodyPose model. See this page for options info:
	// https://docs.ml5js.org/#/reference/bodypose?id=ml5bodypose
  bodyPose = ml5.bodyPose("BlazePose", bodyPoseOptions);
}

//==================================================
function setup() {
  createCanvas(640, 480);

  // Create the video and hide it
  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();

  // Start detecting poses in the webcam video
  bodyPose.detectStart(video, gotPoses);
  // Get the skeleton connection information
  connections = bodyPose.getSkeleton();
}

//==================================================
function draw() {
	background('black'); 
	drawWebcamVideo(); 
	
	// Draw a clown nose. 
	if (poses.length === 1){
		let pose = poses[0];
		let nosePoint = pose.keypoints[ML5BODY_NOSE];
		fill('Maroon');
    circle(nosePoint.x, nosePoint.y, 50);
	}

  // Draw the skeleton connections.
  for (let i = 0; i < poses.length; i++) {
    let pose = poses[i];
    for (let j = 0; j < connections.length; j++) {
      let pointAIndex = connections[j][0];
      let pointBIndex = connections[j][1];
      let pointA = pose.keypoints[pointAIndex];
      let pointB = pose.keypoints[pointBIndex];
      // Only draw a line if both points are confident enough
      if (pointA.confidence > 0.1 && pointB.confidence > 0.1) {
        stroke(255, 0, 0);
        strokeWeight(2);
        line(pointA.x, pointA.y, pointB.x, pointB.y);
      }
    }
  }

  // Draw all the tracked landmark points
  for (let i = 0; i < poses.length; i++) {
    let pose = poses[i];
    for (let j = 0; j < pose.keypoints.length; j++) {
      let keypoint = pose.keypoints[j];
      // Only draw a circle if the keypoint's confidence is bigger than 0.1
      if (keypoint.confidence > 0.1) {
        fill(0, 255, 0);
        noStroke();
        circle(keypoint.x, keypoint.y, 10);
      }
    }
  }
}

//==================================================
// Callback function for when bodyPose outputs data
function gotPoses(results) {
  // Save the output to the poses variable
  poses = results;
}

function drawWebcamVideo(){
  // Draw the webcam video
	push();
	if (bodyPoseOptions.flipHorizontal){
		translate(width,0); 
		scale(-1,1);
	}
	let transparency = 100; // reduce this to make video transparent
	tint(255,255,255,transparency); 
  image(video, 0, 0, width, height);
	pop();
}

// Point indices:
// This information may be helpful:
const ML5BODY_NOSE = 0;
const ML5BODY_LEFT_EYE_INNER = 1;
const ML5BODY_LEFT_EYE = 2;
const ML5BODY_LEFT_EYE_OUTER = 3;
const ML5BODY_RIGHT_EYE_INNER = 4;
const ML5BODY_RIGHT_EYE = 5;
const ML5BODY_RIGHT_EYE_OUTER = 6;
const ML5BODY_LEFT_EAR = 7;
const ML5BODY_RIGHT_EAR = 8;
const ML5BODY_MOUTH_LEFT = 9;
const ML5BODY_MOUTH_RIGHT = 10;
const ML5BODY_LEFT_SHOULDER = 11;
const ML5BODY_RIGHT_SHOULDER = 12;
const ML5BODY_LEFT_ELBOW = 13;
const ML5BODY_RIGHT_ELBOW = 14;
const ML5BODY_LEFT_WRIST = 15;
const ML5BODY_RIGHT_WRIST = 16;
const ML5BODY_LEFT_PINKY = 17;
const ML5BODY_RIGHT_PINKY = 18;
const ML5BODY_LEFT_INDEX = 19;
const ML5BODY_RIGHT_INDEX = 20;
const ML5BODY_LEFT_THUMB = 21;
const ML5BODY_RIGHT_THUMB = 22;
const ML5BODY_LEFT_HIP = 23;
const ML5BODY_RIGHT_HIP = 24;
const ML5BODY_LEFT_KNEE = 25;
const ML5BODY_RIGHT_KNEE = 26;
const ML5BODY_LEFT_ANKLE = 27;
const ML5BODY_RIGHT_ANKLE = 28;
const ML5BODY_LEFT_HEEL = 29;
const ML5BODY_RIGHT_HEEL = 30;
const ML5BODY_LEFT_FOOT_INDEX = 31;
const ML5BODY_RIGHT_FOOT_INDEX = 32;