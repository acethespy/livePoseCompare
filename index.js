
const videoWidth = 600;
const videoHeight = 500;

///const calibratedWeightMeaning = ['rfa', 'rbi', 'lfa', 'lbi', 'rca', 'rth', 'lca', 'lth']
const calibratedWeightMeaning = ['lfa', 'lbi', 'rfa', 'rbi', 'lca', 'lth', 'rca', 'rth']

const calibratedWeightPairs = [[10, 8], [8, 6], [9, 7], [7, 5], [16, 14], [14, 12], [15, 13], [13, 11]]

var modelCalibrateLoc = "models/calibrate.png"
var modelCalibratedWeights = [];
var userCalibratedWeights = [];
var modelVectors = [];
var calib = false;
var save = false;

function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

function isiOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isMobile() {
  return isAndroid() || isiOS();
}

function calibrate()
{
  setTimeout(function(){calib = true} ,3000)
}

function saver()
{
  setTimeout(function(){save = true}, 3000)
}

/**
async function calibrate(net) {
  var canvas = document.getElementById('images');
  canvas.width = 300
  canvas.height = 300
  var ctx = canvas.getContext('2d');
  var imgEle = document.getElementById('filler')
  imgEle.src = modelCalibrateLoc
  var imageScaleFactor = 0.5;
  var outputStride = 16;
  var flipHorizontal = false;

  ///var imageElement = document.getElementById('cat');
  var modelImg = new Image()
  modelImg.crossOrigin = null;
  modelImg.src = modelCalibrateLoc;
  modelImg.addEventListener('load', function() {
    console.log('My width is: ', this.naturalWidth);
    console.log('My height is: ', this.naturalHeight);
    modelImg.height = this.naturalHeight
    modelImg.width = this.naturalWidth
    canvas.width = this.naturalWidth
    canvas.height = this.naturalHeight
    var imag = new Image()
    imag.crossOrigin = "anonymous";
    imag.src = modelCalibrateLoc;
    imag.height = this.naturalHeight
    imag.width = this.naturalWidth
    var modelPose = net.estimateSinglePose(imag, imageScaleFactor, flipHorizontal, outputStride)
    modelPose.then(function(result){
      console.log(result['keypoints'])
      ctx.drawImage(modelImg, 0, 0)
      drawSkeleton(result['keypoints'], 0, ctx)
      console.log('asdf')
    });
  });

  imgEle.addEventListener('load', function() {
    console.log('My width is: ', this.naturalWidth);
    console.log('My height is: ', this.naturalHeight);
    imgEle.height = this.naturalHeight
    imgEle.width = this.naturalWidth
    canvas.width = this.naturalWidth
    canvas.height = this.naturalHeight
    var imag = new Image()
    imag.crossOrigin = "anonymous";
    imag.src = modelCalibrateLoc;
    imag.height = this.naturalHeight
    imag.width = this.naturalWidth
    const input = tf.fromPixels(imag)
    var modelPose = net.estimateSinglePose(input, imageScaleFactor, flipHorizontal, outputStride)
    modelPose.then(function(result){
      console.log(result['keypoints'])
      ctx.drawImage(modelImg, 0, 0)
      drawSkeleton(result['keypoints'], 0, ctx)
      drawKeypoints(result['keypoints'], 0, ctx)
      console.log('asdf')
    });
  });

  imgEle.src = modelCalibrateLoc;
  imgEle.width = 300;
  imgEle.height = 300;
  
  modelPose.forEach(({ score, keypoints }) => {
      if (guiState.output.showPoints) {
        drawKeypoints(keypoints, minPartConfidence, ctx);
      }
      if (guiState.output.showSkeleton) {
        drawSkeleton(keypoints, minPartConfidence, ctx);
      }
    });

} */

/**
 * Loads a the camera to be used in the demo
 *
 */
async function setupCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error(
        'Browser API navigator.mediaDevices.getUserMedia not available');
  }

  const video = document.getElementById('video');
  video.width = videoWidth;
  video.height = videoHeight;

  const mobile = isMobile();
  const stream = await navigator.mediaDevices.getUserMedia({
    'audio': false,
    'video': {
      facingMode: 'user',
      width: mobile ? undefined : videoWidth,
      height: mobile ? undefined : videoHeight,
    },
  });
  video.srcObject = stream;

  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      resolve(video);
    };
  });
}

async function loadVideo() {
  const video = await setupCamera();
  video.play();

  return video;
}

const guiState = {
  algorithm: 'single-pose',
  input: {
    mobileNetArchitecture: isMobile() ? '0.50' : '0.75',
    outputStride: 16,
    imageScaleFactor: 0.5,
  },
  singlePoseDetection: {
    minPoseConfidence: 0.1,
    minPartConfidence: 0.5,
  },
  multiPoseDetection: {
    maxPoseDetections: 5,
    minPoseConfidence: 0.15,
    minPartConfidence: 0.1,
    nmsRadius: 30.0,
  },
  output: {
    showVideo: true,
    showSkeleton: true,
    showPoints: true,
    showBoundingBox: false,
  },
  net: null,
};

function setupGui(cameras, net) {
  guiState.net = net;

  if (cameras.length > 0) {
    guiState.camera = cameras[0].deviceId;
  }
}

function calcDistance(p1, p2) {
  var a = p1['y'] - p2['y']
  var b = p1['x'] - p2['x']
  return Math.sqrt( a * a + b * b )
}

/**
 * Feeds an image to posenet to estimate poses - this is where the magic
 * happens. This function loops with a requestAnimationFrame method.
 */
function detectPoseInRealTime(video, net) {
  const canvas = document.getElementById('output');
  const ctx = canvas.getContext('2d');
  var canvas2 = document.getElementById('images');
  var ctx2 = canvas2.getContext('2d');
  var angleText = document.getElementById('angles');
  // since images are being fed from a webcam
  const flipHorizontal = true;

  canvas.width = videoWidth;
  canvas.height = videoHeight;
  canvas2.width = videoWidth;
  canvas2.height = videoHeight;

  async function poseDetectionFrame() {

    // Scale an image down to a certain factor. Too large of an image will slow
    // down the GPU
    const imageScaleFactor = guiState.input.imageScaleFactor;
    const outputStride = +guiState.input.outputStride;

    let poses = [];
    let minPoseConfidence;
    let minPartConfidence;
    switch (guiState.algorithm) {
      case 'single-pose':
        const pose = await guiState.net.estimateSinglePose(
            video, imageScaleFactor, flipHorizontal, outputStride);
        poses.push(pose);

        minPoseConfidence = +guiState.singlePoseDetection.minPoseConfidence;
        minPartConfidence = +guiState.singlePoseDetection.minPartConfidence;
        break;
      case 'multi-pose':
        poses = await guiState.net.estimateMultiplePoses(
            video, imageScaleFactor, flipHorizontal, outputStride,
            guiState.multiPoseDetection.maxPoseDetections,
            guiState.multiPoseDetection.minPartConfidence,
            guiState.multiPoseDetection.nmsRadius);

        minPoseConfidence = +guiState.multiPoseDetection.minPoseConfidence;
        minPartConfidence = +guiState.multiPoseDetection.minPartConfidence;
        break;
    }

    ctx.clearRect(0, 0, videoWidth, videoHeight);

    if (guiState.output.showVideo) {
      ctx.save();
      ctx.scale(-1, 1);
      ctx.translate(-videoWidth, 0);
      ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
      ctx.restore();
    }

    // For each pose (i.e. person) detected in an image, loop through the poses
    // and draw the resulting skeleton and keypoints if over certain confidence
    // scores
    poses.forEach(({score, keypoints}) => {
      if (score >= minPoseConfidence) {
        if (guiState.output.showPoints) {
          drawKeypoints(keypoints, minPartConfidence, ctx);
        }
        if (guiState.output.showSkeleton) {
          drawSkeleton(keypoints, minPartConfidence, ctx);
        }
        if (guiState.output.showBoundingBox) {
          drawBoundingBox(keypoints, ctx);
        }
      }
      if (calib) {
        userCalibratedWeights = []
        ctx2.save();
        ctx2.scale(-1, 1);
        ctx2.drawImage(video, 0, 0, videoWidth*-1, videoHeight)
        ctx2.restore()
        drawKeypoints(keypoints, minPartConfidence, ctx2)
        drawSkeleton(keypoints, minPartConfidence, ctx2)
        for (i = 0; i < calibratedWeightPairs.length; i++) {
          var pair = calibratedWeightPairs[i]
          var a = keypoints[pair[0]]
          var b = keypoints[pair[1]]
          var a1 = a['position']
          var b1 = b['position']
          userCalibratedWeights.push(calcDistance(a1, b1))
        }
        calib = false
      }
      else if (save && userCalibratedWeights.length > 0) {
        ctx2.save();
        ctx2.scale(-1, 1);
        ctx2.drawImage(video, 0, 0, videoWidth*-1, videoHeight)
        ctx2.restore()
        drawKeypoints(keypoints, minPartConfidence, ctx2)
        drawSkeleton(keypoints, minPartConfidence, ctx2)
        modelVectors = convertToVectors(keypoints, userCalibratedWeights)
        save = false
      }
      else if (userCalibratedWeights.length > 0 && modelVectors.length > 0) {
        var angles = compareVectors(convertToVectors(keypoints, userCalibratedWeights), modelVectors)
        var str = ''
        var filler = '0'
        for (i = 0; i < angles.length; i++) {
          var angle = Math.round(angles[i])
          var formattedAngle = ("00" + angle).slice(-3);
          str += calibratedWeightMeaning[i] + ":" + (formattedAngle) + " "
        }
        angleText.innerHTML = str
      }
    });

    // End monitoring code for frames per second
 
    requestAnimationFrame(poseDetectionFrame);
  }
  poseDetectionFrame();
}

/**
 * Kicks off the demo by loading the posenet model, finding and loading
 * available camera devices, and setting off the detectPoseInRealTime function.
 */
async function bindPage() {
  // Load the PoseNet model weights with architecture 0.75
  const net = await posenet.load(0.75);
  const netMod = await posenet.load(0.75);

  document.getElementById('loading').style.display = 'none';
  document.getElementById('main').style.display = 'block';
  document.getElementById('secondary').style.display = 'block';

  let video;

  try {
    video = await loadVideo();
  } catch (e) {
    let info = document.getElementById('info');
    info.textContent = 'this browser does not support video capture,' +
        'or this device does not have a camera';
    info.style.display = 'block';
    throw e;
  }

  setupGui([], net);
  detectPoseInRealTime(video, net);

}

navigator.getUserMedia = navigator.getUserMedia ||
    navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
// kick off the demo
bindPage();
