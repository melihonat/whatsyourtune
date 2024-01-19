tf.setBackend('cpu');
let emotionModel;
let musicModel;

let player;

let lastEmotionDetection = Date.now();
const EMOTION_DETECTION_INTERVAL = 7000; // 1000 = 1s

async function loadEmotionModel() {
    emotionModel = await tf.loadLayersModel('/models/emotion/model.json');
}

async function loadMusicModel() {
    musicModel = new music_vae.MusicVAE('https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_2bar_small');
    await musicModel.initialize();
    console.log(musicModel);

    // Piano Soundfont
    player = new mm.SoundFontPlayer('https://storage.googleapis.com/magentadata/js/soundfonts/salamander');
    console.log(player);
}


document.addEventListener("DOMContentLoaded", function () {
    loadEmotionModel();
    loadMusicModel();

    let audioContext = new AudioContext();

    const video = document.getElementById('webcam');

    // Load Face-Api-JS TinyFaceDetector Model
    Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models/face'),
    ]).then(startVideo)

    function startVideo() {
        navigator.mediaDevices.getUserMedia({ video: {} })
            .then(function (stream) {
                video.srcObject = stream;
            })
            .catch(function (err) {
                console.error("Fehler beim Zugriff auf die Webcam: ", err);
            });
    }

    video.addEventListener('play', () => {
        // create a canvas and lay it over the webcam (although invisible)
        const canvas = faceapi.createCanvasFromMedia(video)
        const contentDiv = document.querySelector('.content');
        contentDiv.appendChild(canvas);

        const displaySize = { width: video.width, height: video.height }
        faceapi.matchDimensions(canvas, displaySize)

        setInterval(async () => {
            const now = Date.now();
            if (now - lastEmotionDetection > EMOTION_DETECTION_INTERVAL) {
                lastEmotionDetection = now;
                const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions);
                if (detection) {
                    const resizedDetection = faceapi.resizeResults(detection, displaySize)
                    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
                    faceapi.draw.drawDetections(canvas, resizedDetection)

                    // Resize to 48x48 px
                    const croppedFace = await cropAndResizeFace(video, detection);

                    // Letting the emotion detection model access Cropped Face
                    const emotion = await detectEmotion(croppedFace);

                    // display emotion
                    document.getElementById('emotionDisplay').innerText = `Emotion: ${emotion}`;

                    // generate music
                    generateMusicBasedOnEmotion(emotion);
                }
            }
        }, 100)
    });

    // Function to allow our emotion detection model to correctly predict since it was trained on 48x48px frames
    async function cropAndResizeFace(video, detection) {
        const face = detection.box;
        const canvas = document.createElement('canvas');
        canvas.width = 48;
        canvas.height = 48;
        const context = canvas.getContext('2d');

        context.drawImage(video, face.x, face.y, face.width, face.height, 0, 0, 48, 48);

        return canvas;
    }

    async function detectEmotion(croppedFace) {
        // convert CroppedFace to Tensor
        const tensor = tf.browser.fromPixels(croppedFace)
            .resizeNearestNeighbor([48, 48]) // expected input-shape (see cropAndResizeFace())
            .mean(2) // RGB-Channel-Averaging (convert to grayscale)
            .toFloat()
            .div(255.0) // normalize pixels
            .expandDims(-1) // add channel dimension
            .expandDims(0); // add batch dimension

        const prediction = await emotionModel.predict(tensor).data();

        // display the emotion in a readable format
        const emotionIndex = prediction.indexOf(Math.max(...prediction));
        const emotionLabels = ['Angry', 'Disgust', 'Fear', 'Happy', 'Sad', 'Surprised', 'Neutral'];
        const detectedEmotion = emotionLabels[emotionIndex];

        return detectedEmotion;
    }

    async function generateMusicBasedOnEmotion(emotion) {
        if (!musicModel) {
            console.error("Music Model ist noch nicht geladen!");
            return;
        }

        const primerMelody = getPrimerMelodyForEmotion(emotion);

        try {
            const generatedMusic = await musicModel.similar(primerMelody, 1, 0.5);
            console.log("Music generated: ", generatedMusic[0]);
            player.start(generatedMusic[0]);
            console.log("Generating music for emotion: " + emotion);
        } catch (error) {
            console.error("Error generating music: ", error);
        }
    }

    // Function to implement testing out sequences (edit the testSequence variable to play different melodies)
    function playMusicTest() {
        const testSequence = {
            "notes": [
                { "pitch": 60, "startTime": 0, "endTime": 0.5 },
                { "pitch": 62, "startTime": 0.5, "endTime": 1.0 },
                { "pitch": 64, "startTime": 1.0, "endTime": 1.5 },
                { "pitch": 65, "startTime": 1.5, "endTime": 2.0 },
                { "pitch": 67, "startTime": 2.0, "endTime": 2.5 },
                { "pitch": 69, "startTime": 2.5, "endTime": 3.0 },
                { "pitch": 71, "startTime": 3.0, "endTime": 3.5 },
                { "pitch": 72, "startTime": 3.5, "endTime": 4.0 }
            ],
            "totalTime": 4
        };

        console.log("Test music sequence: ", testSequence);

        if (player) {
            player.start(testSequence).then(() => {
                console.log("Playback started.");
            }).catch(error => {
                console.error("Error during playback: ", error);
            });
        } else {
            console.error("Player isnt initialized!");
        }
    }

    // Playing test sequence
    document.getElementById('playButton').addEventListener('click', function () {
        console.log("Audio Context state before: ", audioContext.state);
        audioContext.resume().then(() => {
            console.log("Audio context state after: ", audioContext.state);

            playMusicTest();
        }).catch(error => {
            console.error("Error resuming audio context. ", error);
        });
    });
});



// Setting primary melodies for the model to sample
function getPrimerMelodyForEmotion(emotion) {
    switch (emotion) {

        case 'Angry':
            return {
                notes: [ // C Minor, 140 BPM
                    { pitch: 60, quantizedStartStep: 0, quantizedEndStep: 2 }, // C4
                    { pitch: 63, quantizedStartStep: 2, quantizedEndStep: 4 }, // Eb4 (dissonant)
                    { pitch: 67, quantizedStartStep: 4, quantizedEndStep: 6 }, // G4
                    { pitch: 63, quantizedStartStep: 6, quantizedEndStep: 8 }, // Eb4
                    { pitch: 60, quantizedStartStep: 8, quantizedEndStep: 10 }, // C4
                    { pitch: 63, quantizedStartStep: 10, quantizedEndStep: 12 }, // Eb4
                    { pitch: 67, quantizedStartStep: 12, quantizedEndStep: 14 }, // G4
                    { pitch: 63, quantizedStartStep: 14, quantizedEndStep: 16 }  // Eb4
                ],
                totalQuantizedSteps: 16,
                quantizationInfo: { stepsPerQuarter: 4 },
                tempos: [{ time: 0, qpm: 140 }]
            };

        case 'Disgust':
            return {
                notes: [ // No key (lots of key changes), 110BPM
                    { pitch: 61, quantizedStartStep: 0, quantizedEndStep: 2 }, // C#4
                    { pitch: 58, quantizedStartStep: 2, quantizedEndStep: 4 }, // A#3
                    { pitch: 56, quantizedStartStep: 4, quantizedEndStep: 6 }, // G#3
                    { pitch: 54, quantizedStartStep: 6, quantizedEndStep: 8 }, // F#3
                    { pitch: 52, quantizedStartStep: 8, quantizedEndStep: 10 }, // E3
                    { pitch: 50, quantizedStartStep: 10, quantizedEndStep: 12 }, // D3
                    { pitch: 48, quantizedStartStep: 12, quantizedEndStep: 14 }, // C3
                    { pitch: 46, quantizedStartStep: 14, quantizedEndStep: 16 }  // A#2
                ],
                totalQuantizedSteps: 16,
                quantizationInfo: { stepsPerQuarter: 4 },
                tempos: [{ time: 0, qpm: 110 }]
            };

        case 'Fear':
            return {
                notes: [ // C Minor, 90 BPM
                    { pitch: 60, quantizedStartStep: 0, quantizedEndStep: 1 }, // C4
                    { pitch: 63, quantizedStartStep: 1, quantizedEndStep: 3 }, // Eb4
                    { pitch: 68, quantizedStartStep: 3, quantizedEndStep: 5 }, // Ab4
                    { pitch: 66, quantizedStartStep: 5, quantizedEndStep: 7 }, // F#4
                    { pitch: 63, quantizedStartStep: 7, quantizedEndStep: 9 }, // Eb4
                    { pitch: 68, quantizedStartStep: 9, quantizedEndStep: 11 }, // Ab4
                    { pitch: 66, quantizedStartStep: 11, quantizedEndStep: 13 }, // F#4
                    { pitch: 63, quantizedStartStep: 13, quantizedEndStep: 15 }, // Eb4
                    { pitch: 60, quantizedStartStep: 15, quantizedEndStep: 16 }  // C4
                ],
                totalQuantizedSteps: 16,
                quantizationInfo: { stepsPerQuarter: 4 },
                tempos: [{ time: 0, qpm: 90 }]
            };

        case 'Happy':
            return {
                notes: [ // C Major, 120 BPM, short notes
                    { pitch: 72, quantizedStartStep: 0, quantizedEndStep: 2 }, // C5
                    { pitch: 76, quantizedStartStep: 2, quantizedEndStep: 4 }, // E5
                    { pitch: 79, quantizedStartStep: 4, quantizedEndStep: 6 }, // G5
                    { pitch: 84, quantizedStartStep: 6, quantizedEndStep: 8 }, // C6
                    { pitch: 79, quantizedStartStep: 8, quantizedEndStep: 10 }, // G5
                    { pitch: 76, quantizedStartStep: 10, quantizedEndStep: 12 }, // E5
                    { pitch: 72, quantizedStartStep: 12, quantizedEndStep: 14 }, // C5
                    { pitch: 76, quantizedStartStep: 14, quantizedEndStep: 16 }, // E5
                ],
                totalQuantizedSteps: 16,
                quantizationInfo: { stepsPerQuarter: 4 },
                tempos: [{ time: 0, qpm: 120 }]
            };

        case 'Sad':
            return { // A Minor, 60 BPM, long notes
                notes: [
                    { pitch: 60, quantizedStartStep: 0, quantizedEndStep: 4 }, // C4
                    { pitch: 58,  quantizedStartStep: 4, quantizedEndStep: 8 }, // A3
                    { pitch: 57, quantizedStartStep: 8, quantizedEndStep: 12 }, // G3
                    { pitch: 55, quantizedStartStep: 12, quantizedEndStep: 16 } // F3
                ],
                totalQuantizedSteps: 16,
                quantizationInfo: { stepsPerQuarter: 4 },
                tempos: [{ time: 0, qpm: 60 }]
            };

        case 'Surprised':
            return { 
                notes: [ // unpredictable pattern, 100 BPM
                    { pitch: 60, quantizedStartStep: 0, quantizedEndStep: 2 }, // C4
                    { pitch: 72, quantizedStartStep: 2, quantizedEndStep: 4 }, // C5
                    { pitch: 67, quantizedStartStep: 4, quantizedEndStep: 6 }, // G4
                    { pitch: 69, quantizedStartStep: 6, quantizedEndStep: 8 }, // A4
                    { pitch: 71, quantizedStartStep: 8, quantizedEndStep: 10 }, // B4
                    { pitch: 60, quantizedStartStep: 10, quantizedEndStep: 12 }, // C4
                    { pitch: 72, quantizedStartStep: 12, quantizedEndStep: 14 }, // C5
                    { pitch: 64, quantizedStartStep: 14, quantizedEndStep: 16 }  // E4
                ],
                totalQuantizedSteps: 16,
                quantizationInfo: { stepsPerQuarter: 4 },
                tempos: [{ time: 0, qpm: 100 }]
             };

        case 'Neutral':
            return {
                notes: [ // C Major, 100 BPM, simple & balanced
                    { pitch: 60, quantizedStartStep: 0, quantizedEndStep: 2 }, // C4
                    { pitch: 62, quantizedStartStep: 2, quantizedEndStep: 4 }, // D4
                    { pitch: 64, quantizedStartStep: 4, quantizedEndStep: 6 }, // E4
                    { pitch: 65, quantizedStartStep: 6, quantizedEndStep: 8 }, // F4
                    { pitch: 67, quantizedStartStep: 8, quantizedEndStep: 10 }, // G4
                    { pitch: 65, quantizedStartStep: 10, quantizedEndStep: 12 }, // F4
                    { pitch: 64, quantizedStartStep: 12, quantizedEndStep: 14 }, // E4
                    { pitch: 62, quantizedStartStep: 14, quantizedEndStep: 16 }  // D4
                ],
                totalQuantizedSteps: 16,
                quantizationInfo: { stepsPerQuarter: 4 },
                tempos: [{ time: 0, qpm: 100 }]
            };

        default:
            return { 
                notes: [ // Same as Neutral
                    { pitch: 60, quantizedStartStep: 0, quantizedEndStep: 2 }, // C4
                    { pitch: 62, quantizedStartStep: 2, quantizedEndStep: 4 }, // D4
                    { pitch: 64, quantizedStartStep: 4, quantizedEndStep: 6 }, // E4
                    { pitch: 65, quantizedStartStep: 6, quantizedEndStep: 8 }, // F4
                    { pitch: 67, quantizedStartStep: 8, quantizedEndStep: 10 }, // G4
                    { pitch: 65, quantizedStartStep: 10, quantizedEndStep: 12 }, // F4
                    { pitch: 64, quantizedStartStep: 12, quantizedEndStep: 14 }, // E4
                    { pitch: 62, quantizedStartStep: 14, quantizedEndStep: 16 }  // D4
                ],
                totalQuantizedSteps: 16,
                quantizationInfo: { stepsPerQuarter: 4 },
                tempos: [{ time: 0, qpm: 100 }]
            };
    }
}