tf.setBackend('cpu');
let emotionModel;
let musicModel;
let player = new mm.Player();

let lastEmotionDetection = Date.now();
const EMOTION_DETECTION_INTERVAL = 10000; // 1000 = 1s

async function loadEmotionModel() {
    emotionModel = await tf.loadLayersModel('/models/emotion/model.json');
}

async function loadMusicModel() {
    musicModel = new music_vae.MusicVAE('https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_2bar_small');
    await musicModel.initialize();
    console.log(musicModel);
}


document.addEventListener("DOMContentLoaded", function () {
    loadEmotionModel();
    loadMusicModel();

    let audioContext = new AudioContext();

    const video = document.getElementById('webcam');

    // Face-Api-JS TinyFaceDetector Model laden
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
        // Canvas erstellen und unsichtbar über die Webcam legen
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

                    // Resize auf 48x48 px
                    const croppedFace = await cropAndResizeFace(video, detection);

                    // Emotion Detection Model auf Cropped Face zugreifen lassen
                    const emotion = await detectEmotion(croppedFace);

                    // Emotion anzeigen
                    document.getElementById('emotionDisplay').innerText = `Emotion: ${emotion}`;

                    // Musik generieren
                    generateMusicBasedOnEmotion(emotion);
                }
            }
        }, 100)
    });

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
        // CroppedFace zu Tensor konvertieren
        const tensor = tf.browser.fromPixels(croppedFace)
            .resizeNearestNeighbor([48, 48]) // Models erwartete Inputgröße
            .mean(2) // Zu grayscale konvertieren mittels RGB-Channel-Averaging
            .toFloat()
            .div(255.0) // Pixelwerte normalisieren (-1, 1)
            .expandDims(-1) // Channel dimension hinzufügen
            .expandDims(0); // Batch dimension hinzufügen

        const prediction = await emotionModel.predict(tensor).data();

        // Prediction als lesbares Format darstellen
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
        const numSteps = 128; // Length of generated sequence
        const temperature = 1.0; // Randomness. 0: Exactly the same

        try {
            const generatedMusic = await musicModel.similar(primerMelody, 1, 0.5);
            console.log("Music generated.");
            player.start(generatedMusic[0]);
            console.log("Generating music for emotion: " + emotion);
        } catch (error) {
            console.error("Error generating music: ", error);
        }
    }

    function getPrimerMelodyForEmotion(emotion) {
        switch (emotion) {
            case 'Angry':
                return { /* Features für Angry */ };
            case 'Disgust':
                return { /* Features für Disgust */ };
            case 'Fear':
                return { /* Features für Fear */ };
            case 'Happy':
                return {};
            case 'Sad':
                return {
                    notes: [
                        {
                            pitch: 55, // A4
                            quantizedStartStep: 0,
                            quantizedEndStep: 2
                        },
                        {
                            pitch: 53, // G4
                            quantizedStartStep: 2,
                            quantizedEndStep: 4
                        },
                        {
                            pitch: 50, // E4
                            quantizedStartStep: 4,
                            quantizedEndStep: 6
                        },
                        {
                            pitch: 48, // C4
                            quantizedStartStep: 6,
                            quantizedEndStep: 8
                        }
                    ],
                    totalQuantizedSteps: 8,
                    quantizationInfo: { stepsPerQuarter: 2 }
                };
            case 'Surprised':
                return { /* Features für Surprised */ };
            case 'Neutral':
                return { /* Neutrale Features */ };
            default:
                return { /* Default wenn emotion nicht erkannt wird */ };
        }
    }


    // Spielt Musik ab.
    function playMusic(musicSequence) {
        if (!player) {
            console.error("Player is not initialized!");
            return;
        }

        if (player.isPlaying) {
            console.log("Player is already playing! Stopping current playback.");
            player.stop();
        }
        try {
            player.start(musicSequence);
            console.log("Playback started.");
        } catch (error) {
            console.error("Error during playback: ", error);
        }
    }

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