import React, { useState,useRef, useEffect } from "react";
import * as posenet from "@tensorflow-models/posenet";
import "@tensorflow/tfjs";

const ExerciseDetector = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [squatCount, setSquatCount] = useState(0); 
  const isSquatting = useRef(false); 
  const [leftCurlCount, setLeftCurlCount] = useState(0);
  const [rightCurlCount, setRightCurlCount] = useState(0); 
  const [jumpingJackCount,setJumpingJackCount]=useState(0);
  const isLeftCurlUp=useRef(false);
  const isRightCurlUp=useRef(false);
  const legRepDone = useRef(false); 
  const armRepDone = useRef(false);
  const isLegsApart = useRef(false);
  const isArmsUp = useRef(false);
  const holdFrameCount = useRef(0);
  
  const [legCount, setLegCount] = useState(0);
  const [armCount, setArmCount] = useState(0);
  
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
                flipHorizontal: false, 
                outputStride: 8,
                imageScaleFactor: 0.75
              });
              
              if (poseCount < 30) { 
                console.log(`Pose ${poseCount + 1}:`, pose);
                poseCount++;
              }
          detectArmMovement(pose);
          detectLegMovement(pose);
          detectBicepCurl(pose)
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
  
  ///////////////////////////////////////////////////////////
  const detectBicepCurl = (pose) => {
    const keypoints = pose.keypoints;
  
    const leftShoulder = keypoints[5];
    const leftElbow = keypoints[7];
    const rightShoulder = keypoints[6];
    const rightElbow = keypoints[8];
  
    if (
      leftShoulder.score < 0.5 ||
      leftElbow.score < 0.5 ||
      rightShoulder.score < 0.5 ||
      rightElbow.score < 0.5
    ) {
      return; 
    }
  
    const leftElbowAngle = getAngle(leftShoulder.position, leftElbow.position, keypoints[9].position); 
    const rightElbowAngle = getAngle(rightShoulder.position, rightElbow.position, keypoints[10].position); 
 
     if (leftElbowAngle < 45 && !isLeftCurlUp.current) {
      isLeftCurlUp.current = true; 
    } else if (leftElbowAngle > 160 && isLeftCurlUp.current) {
      setLeftCurlCount((prevCount) => prevCount + 1); 
      isLeftCurlUp.current = false; 
      
    }

    if (rightElbowAngle < 45 && !isRightCurlUp.current) {
      isRightCurlUp.current = true; 
    } else if (rightElbowAngle > 160 && isRightCurlUp.current) {
      setRightCurlCount((prevCount) => prevCount + 1); 
      isRightCurlUp.current = false; 
      
    }
  };
  ////////////////////////////////////////////////////////

  const detectArmMovement = (pose) => {
    if (!pose || !pose.keypoints) return;

    const leftWrist = pose.keypoints[9]?.position;
    const rightWrist = pose.keypoints[10]?.position;
    const leftShoulder = pose.keypoints[5]?.position;
    const rightShoulder = pose.keypoints[6]?.position;

    const leftWristScore = pose.keypoints[9]?.score || 0;
    const rightWristScore = pose.keypoints[10]?.score || 0;
    const leftShoulderScore = pose.keypoints[5]?.score || 0;
    const rightShoulderScore = pose.keypoints[6]?.score || 0;

    if (leftWristScore < 0.5 || rightWristScore < 0.5 || leftShoulderScore < 0.5 || rightShoulderScore < 0.5) return;

    const armsRaised = leftWrist.y < leftShoulder.y && rightWrist.y < rightShoulder.y;

    if (armsRaised && !isArmsUp.current) {
      isArmsUp.current = true;
    }
    
    else if (!armsRaised && isArmsUp.current) {
      setArmCount((prev) => prev + 1);
      isArmsUp.current = false;
      armRepDone.current = true; 
      checkJumpingJack(); 
    }
  };
  ///////////////////////////////////////////////////////
  const detectLegMovement = (pose) => {
    if (!pose || !pose.keypoints) return;
  
    const leftAnkle = pose.keypoints[15]?.position;
    const rightAnkle = pose.keypoints[16]?.position;
  
    const leftAnkleScore = pose.keypoints[15]?.score || 0;
    const rightAnkleScore = pose.keypoints[16]?.score || 0;
  
    if (leftAnkleScore < 0.5 || rightAnkleScore < 0.5) return;
  
    const footDistance = Math.abs(leftAnkle.x - rightAnkle.x);

    const legCloseThreshold = 40; 
    const legOpenThreshold = 80;  
  
    if (footDistance > legOpenThreshold && !isLegsApart.current) {
      isLegsApart.current = true; 
    }
  
    else if (footDistance < legCloseThreshold && isLegsApart.current) {
      setLegCount((prev) => prev + 1); 
      isLegsApart.current = false; 
      legRepDone.current = true; 
      checkJumpingJack(); 
    }
  };
  /////////////////////////////////////////////////////
  const checkJumpingJack = () => {
    if (legRepDone.current && armRepDone.current) {
      setJumpingJackCount((prev) => prev + 1); 
      legRepDone.current = false; 
      armRepDone.current = false;
      console.log("Jumping Jacks Count:", jumpingJackCount);
    }
  }
  ///////////////////////////////////////////////////
  const detectLeftSquat = (pose) => {
    const keypoints = pose.keypoints;
  
    const leftHip = keypoints[11];
    const leftKnee = keypoints[13];
    const leftAnkle = keypoints[15];
  
    if (leftHip.score < 0.5 || leftKnee.score < 0.5 || leftAnkle.score < 0.5) {
      return false;
    }
  
    const leftKneeAngle = getAngle(leftHip.position, leftKnee.position, leftAnkle.position);
  
    return leftKneeAngle < 90; 
  };
  ///////////////////////////////////////////////////
  const detectRightSquat = (pose) => {
    const keypoints = pose.keypoints;
  
    const rightHip = keypoints[12];
    const rightKnee = keypoints[14];
    const rightAnkle = keypoints[16];
  
    if (rightHip.score < 0.5 || rightKnee.score < 0.5 || rightAnkle.score < 0.5) {
      return false;
    }
  
    const rightKneeAngle = getAngle(rightHip.position, rightKnee.position, rightAnkle.position);
  
    return rightKneeAngle < 90; 
  };
  //////////////////////////////////////////////////
  const detectSquats = (pose) => {
    const isLeftSquatting = detectLeftSquat(pose);
    const isRightSquatting = detectRightSquat(pose);
  
    if (isLeftSquatting && isRightSquatting && !isSquatting.current) {
      isSquatting.current = true; 
    }
  
    else if (isLeftSquatting && !isRightSquatting && !isSquatting.current) {
      isSquatting.current = true; 
    }
  
    else if (!isLeftSquatting && isRightSquatting && !isSquatting.current) {
      isSquatting.current = true; 
    }
  
   
    const leftKneeAngle = getAngle(
      pose.keypoints[11].position,
      pose.keypoints[13].position,
      pose.keypoints[15].position
    );
    const rightKneeAngle = getAngle(
      pose.keypoints[12].position,
      pose.keypoints[14].position,
      pose.keypoints[16].position
    );
  
    if (leftKneeAngle > 160 && rightKneeAngle > 160 && isSquatting.current) {
      setSquatCount((prevCount) => prevCount + 1); 
      isSquatting.current = false; 
      console.log(`✅ Squat Count: ${squatCount + 1}`); 
    }
  };
  
  ///////////////////////////////////////////////
  const drawPose = (pose) => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    pose.keypoints.forEach((point) => {
      if (point.score > 0.5) {
        ctx.beginPath();
        ctx.arc(point.position.x, point.position.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = "red";
        ctx.fill();
      }
    });

    drawSkeleton(pose, ctx);
  };
 //////////////////////////////////////////////
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
    {/*Ensure joints are clearly plotted on screen to get accurate result  */}
    <h1>Squat count:{squatCount}</h1>
    <h1>Bicep Curl Count(Left): {leftCurlCount}</h1>
    <h1>Bicep Curl Count(Right): {rightCurlCount}</h1>
    {/* jumping jack count will inc only when both arm and keg count will increse */}
    <h1>Leg Count: {legCount}</h1>
    <h1>Arm Count: {armCount}</h1>
    <h1>Jumping Jack :{jumpingJackCount}</h1>
    </div>
  );
};

export default ExerciseDetector;
