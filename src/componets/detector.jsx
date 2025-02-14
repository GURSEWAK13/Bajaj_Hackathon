import React, { useState,useRef, useEffect } from "react";
import * as posenet from "@tensorflow-models/posenet";
import "@tensorflow/tfjs";
import { div } from "@tensorflow/tfjs";

const ExerciseDetector = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [squatCount, setSquatCount] = useState(0); // ✅ Squat counter state
  const isSquatting = useRef(false); 
  useEffect(() => {
    const setupCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error("Error accessing webcam:", error);
      }
    };

    const loadPoseNet = async () => {
      const net = await posenet.load();
      console.log("PoseNet model loaded!");
        let poseCount=0;
      const detectPose = async () => {
        if (videoRef.current && videoRef.current.readyState === 4) {
          
            const pose = await net.estimateSinglePose(videoRef.current, {
                flipHorizontal: false, // Directly passing a boolean value
                outputStride: 16,
                imageScaleFactor: 0.50
              });
              
              if (poseCount < 30) { // Log only first 10 poses
                console.log(`Pose ${poseCount + 1}:`, pose);
                poseCount++;
              }
          detectSquats(pose);
          drawPose(pose);
        }
        requestAnimationFrame(detectPose);
      };

      detectPose();
    };

    setupCamera().then(loadPoseNet);
  }, []);
  const getAngle = (A, B, C) => {
    let angle =
      (Math.atan2(C.y - B.y, C.x - B.x) - Math.atan2(A.y - B.y, A.x - B.x)) *
      (180 / Math.PI);
    return Math.abs(angle);
  };

  const detectSquats = (pose) => {
    const keypoints = pose.keypoints;

    if (keypoints[11].score < 0.5 || keypoints[13].score < 0.5 || keypoints[15].score < 0.5) {
      return;
    }

    const leftHip = keypoints[11].position;
    const leftKnee = keypoints[13].position;
    const leftAnkle = keypoints[15].position;

    const kneeAngle = getAngle(leftHip, leftKnee, leftAnkle);

    // ✅ Detect Squatting Position
    if (kneeAngle < 90 && !isSquatting.current) {
      isSquatting.current = true; // Enter squat
    }

    // ✅ Detect Standing Position
    else if (kneeAngle > 160 && isSquatting.current) {
      setSquatCount((prevCount) => prevCount + 1); // ✅ Correctly increase count
      isSquatting.current = false; // Reset for next squat
      console.log(`✅ Squat Count: ${squatCount + 1}`); // Debugging log
    }
  };

  
  const drawPose = (pose) => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    // Draw keypoints (joints)
    pose.keypoints.forEach((point) => {
      if (point.score > 0.5) {
        ctx.beginPath();
        ctx.arc(point.position.x, point.position.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = "red";
        ctx.fill();
      }
    });

    // Draw skeleton (connections)
    drawSkeleton(pose, ctx);
  };

  const drawSkeleton = (pose, ctx) => {
    const adjacentKeyPoints = posenet.getAdjacentKeyPoints(pose.keypoints, 0.5);
    adjacentKeyPoints.forEach(([partA, partB]) => {
      ctx.beginPath();
      ctx.moveTo(partA.position.x, partA.position.y);
      ctx.lineTo(partB.position.x, partB.position.y);
      ctx.strokeStyle = "blue";
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  };

  return (
    <div>
    <div style={{ position: "relative", width: "640px", height: "480px" }}>
      <video
        ref={videoRef}
        width="640"
        height="480"
        autoPlay
        playsInline
        style={{ position: "absolute" }}
      />
      <canvas
        ref={canvasRef}
        width="640"
        height="480"
        style={{ position: "absolute", top: 0, left: 0, zIndex: 1 }}
      />
        
    </div>
    <h1>Squat count:{squatCount}</h1>
    </div>
  );
};

export default ExerciseDetector;
