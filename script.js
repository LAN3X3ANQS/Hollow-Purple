import {
    HandLandmarker,
    FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.mjs";

const video = document.getElementById("webcam");
const canvas = document.getElementById("output");
const ctx = canvas.getContext("2d");

const status = document.getElementById("status");
const startButton = document.getElementById("startButton");

let handLandmarker;
let lastVideoTime = -1;
let effectTime = 0;
let chargeStartedAt = 0;
let chargeProgress = 0;
let lastOrbPosition = { x: 0, y: 0 };
let launchStartedAt = 0;
let launchOrigin = { x: 0, y: 0 };
let wasFlickPose = false;

const connections = [
    [0,1], [1,2], [2,3], [3,4],
    [0,5], [5,6], [6,7], [7,8],
    [5,9], [9,10], [10,11], [11,12],
    [9,13], [13,14], [14,15], [15,16],
    [13,17], [17,18], [18,19], [19,20],
    [0,17]
];


// ------------------------------------
// 1. Load MediaPipe
// ------------------------------------

async function createHandLandmarker() {
    status.textContent = "Loading hand tracking...";

    try {
        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
        );

        const options = {
            baseOptions: {
                modelAssetPath:
                    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
            },
            runningMode: "VIDEO",
            numHands: 2,
            minHandDetectionConfidence: 0.5,
            minHandPresenceConfidence: 0.5,
            minTrackingConfidence: 0.5
        };

        try {
            handLandmarker = await HandLandmarker.createFromOptions(
                vision,
                { ...options, baseOptions: { ...options.baseOptions, delegate: "GPU" } }
            );
        } catch (gpuError) {
            console.warn("GPU hand tracking unavailable; using CPU.", gpuError);
            handLandmarker = await HandLandmarker.createFromOptions(vision, options);
        }

        status.textContent = "MediaPipe ready.";
        startButton.disabled = false;
    } catch (error) {
        console.error("Unable to load MediaPipe.", error);
        status.textContent = "Hand tracking could not load. Check your internet connection and reload.";
    }
}


// ------------------------------------
// 2. Start webcam
// ------------------------------------

async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
        status.textContent = "Camera access requires HTTPS or localhost.";
        return;
    }

    startButton.disabled = true;
    status.textContent = "Requesting camera access...";

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false
        });

        video.srcObject = stream;
        await video.play();
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        status.textContent = "Camera running - show me your hands.";
        detectHands();
    } catch (error) {
        console.error("Unable to start camera.", error);
        status.textContent = "Camera could not start. Allow camera access and try again.";
        startButton.disabled = false;
    }
}


// ------------------------------------
// 3. Detect hands every frame
// ------------------------------------

function detectHands() {

    if (
        video.currentTime !== lastVideoTime &&
        handLandmarker
    ) {

        lastVideoTime = video.currentTime;

        const results = handLandmarker.detectForVideo(
            video,
            performance.now()
        );

        drawHands(results);
    }

    requestAnimationFrame(detectHands);
}


// ------------------------------------
// 4. Draw the landmarks
// ------------------------------------

function drawHands(results) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!results.landmarks?.length) {
        if (chargeProgress > 0.15 && !launchStartedAt) {
            launchStartedAt = performance.now();
            launchOrigin = { ...lastOrbPosition };
        }

        if (launchStartedAt) {
            drawLaunch();
        } else {
            status.textContent = "Camera running - press thumb to index and middle.";
        }
        return;
    }

    if (launchStartedAt) {
        drawLaunch();
        return;
    }

    const hand = results.landmarks[0];

    for (const landmarks of results.landmarks) {
        ctx.strokeStyle = "#00ff00";
        ctx.lineWidth = 4;

        for (const [a, b] of connections) {
            const pointA = landmarks[a];
            const pointB = landmarks[b];
            ctx.beginPath();
            ctx.moveTo(pointA.x * canvas.width, pointA.y * canvas.height);
            ctx.lineTo(pointB.x * canvas.width, pointB.y * canvas.height);
            ctx.stroke();
        }

        for (const point of landmarks) {
            ctx.beginPath();
            ctx.arc(point.x * canvas.width, point.y * canvas.height, 7, 0, Math.PI * 2);
            ctx.fillStyle = "red";
            ctx.fill();
        }
    }

    const flickPose = isFlickPose(hand);
    const releasePose = isReleasePose(hand);

    if (flickPose) {
        if (!chargeStartedAt) {
            chargeStartedAt = performance.now();
        }

        chargeProgress = Math.min((performance.now() - chargeStartedAt) / 1400, 1);
        lastOrbPosition = getOrbPosition(hand);
        drawHollowPurple(lastOrbPosition.x, lastOrbPosition.y, chargeProgress);
        status.textContent = `Hollow Purple charging - ${Math.round(chargeProgress * 100)}%`;
    } else if (wasFlickPose && releasePose && chargeProgress > 0.15) {
        launchStartedAt = performance.now();
        launchOrigin = { ...lastOrbPosition };
        drawLaunch();
        status.textContent = "Hollow Purple fired!";
    } else if (releasePose) {
        lastOrbPosition = getOrbPosition(hand);
        drawHollowPurple(lastOrbPosition.x, lastOrbPosition.y, 0.12);
        status.textContent = "Index and middle locked - press thumb to charge.";
    } else {
        chargeStartedAt = 0;
        chargeProgress = 0;
        status.textContent = "Extend index and middle, then press your thumb to charge.";
    }

    wasFlickPose = flickPose;
}

function distance(firstPoint, secondPoint) {
    return Math.hypot(firstPoint.x - secondPoint.x, firstPoint.y - secondPoint.y);
}

function isFingerExtended(landmarks, tipIndex, pipIndex) {
    return distance(landmarks[tipIndex], landmarks[0]) > distance(landmarks[pipIndex], landmarks[0]) * 1.05;
}

function isFingerCurled(landmarks, tipIndex, pipIndex) {
    return distance(landmarks[tipIndex], landmarks[0]) < distance(landmarks[pipIndex], landmarks[0]) * 1.25;
}

function isFlickPose(landmarks) {
    const indexAndMiddleExtended = isFingerExtended(landmarks, 8, 6) &&
        isFingerExtended(landmarks, 12, 10);
    const thumbTouchesFinger = Math.min(
        distance(landmarks[4], landmarks[8]),
        distance(landmarks[4], landmarks[12])
    ) < 0.2;

    return indexAndMiddleExtended && thumbTouchesFinger;
}

function isReleasePose(landmarks) {
    return isFingerExtended(landmarks, 8, 6) &&
        isFingerExtended(landmarks, 12, 10);
}

function getOrbPosition(landmarks) {
    return {
        x: ((landmarks[4].x + landmarks[8].x + landmarks[12].x) / 3) * canvas.width,
        y: ((landmarks[4].y + landmarks[8].y + landmarks[12].y) / 3) * canvas.height
    };
}

function drawHollowPurple(centerX, centerY, intensity = 1) {
    effectTime += 0.08;
    const vibration = intensity * intensity * 34;
    centerX += Math.sin(effectTime * 11.7) * vibration + Math.cos(effectTime * 19.3) * vibration * 0.45;
    centerY += Math.cos(effectTime * 13.3) * vibration + Math.sin(effectTime * 23.1) * vibration * 0.45;
    const pulse = 1 + Math.sin(effectTime * 2) * (0.08 + intensity * 0.14);
    const radius = (62 + intensity * 14) * pulse;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const glow = ctx.createRadialGradient(centerX, centerY, 4, centerX, centerY, radius * 2.8);
    glow.addColorStop(0, "rgba(255, 255, 255, 0.95)");
    glow.addColorStop(0.2, "rgba(197, 92, 255, 0.9)");
    glow.addColorStop(0.55, "rgba(92, 36, 255, 0.35)");
    glow.addColorStop(1, "rgba(50, 0, 150, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 2.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(224, 164, 255, 0.9)";
    ctx.lineWidth = 5 + intensity * 3;
    for (let index = 0; index < 8 + Math.floor(intensity * 10); index += 1) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius + index * 13, effectTime * 1.5 + index, effectTime * 1.5 + Math.PI * 1.5 + index);
        ctx.stroke();
    }

    const core = ctx.createRadialGradient(centerX - 14, centerY - 16, 3, centerX, centerY, radius);
    core.addColorStop(0, "#ffffff");
    core.addColorStop(0.18, "#f2c6ff");
    core.addColorStop(0.52, "#a62cff");
    core.addColorStop(1, "#26006b");
    ctx.fillStyle = core;
    ctx.shadowColor = "#b83cff";
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawLaunch() {
    const launchProgress = Math.min((performance.now() - launchStartedAt) / 900, 1);
    const easedProgress = launchProgress * launchProgress;
    const centerX = launchOrigin.x + (canvas.width / 2 - launchOrigin.x) * easedProgress;
    const centerY = launchOrigin.y + (canvas.height / 2 - launchOrigin.y) * easedProgress;
    const radius = 62 + easedProgress * Math.max(canvas.width, canvas.height) * 0.8;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(190, 91, 255, ${1 - launchProgress * 0.7})`;
    ctx.lineWidth = 3 + easedProgress * 12;
    for (let index = 0; index < 32; index += 1) {
        const angle = index * Math.PI / 16;
        const startRadius = radius * 0.45;
        ctx.beginPath();
        ctx.moveTo(centerX + Math.cos(angle) * startRadius, centerY + Math.sin(angle) * startRadius);
        ctx.lineTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
        ctx.stroke();
    }
    ctx.restore();

    drawHollowPurple(centerX, centerY, 1 + easedProgress * 2);

    if (launchProgress >= 1) {
        launchStartedAt = 0;
        chargeProgress = 0;
        chargeStartedAt = 0;
        status.textContent = "Impact. Form the pose again to recharge.";
    } else {
        status.textContent = "Hollow Purple fired!";
    }
}


// ------------------------------------
// Buttons
// ------------------------------------

startButton.disabled = true;

startButton.addEventListener("click", startCamera);

createHandLandmarker();