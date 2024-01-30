// CPU-Backend für Kompatibilität
tf.setBackend('cpu');


let emotionModel;
let musicModel;
let player = new mm.Player();

// Emotion detection alle 7 Sekunden (+ Countdown)
let lastEmotionDetection = Date.now();
const EMOTION_DETECTION_INTERVAL = 7000; // 1000 = 1s
let countdownValue = 3;

// Laden unseres Emotion-Detection-Models, aus Python geportet (im "Emotion model"-Ordner)
async function loadEmotionModel() {
    emotionModel = await tf.loadLayersModel('/models/emotion/model.json');
}

// https://github.com/magenta/magenta-js/blob/master/music/checkpoints/README.md
async function loadMusicModel() {
    musicModel = new music_vae.MusicVAE('https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_2bar_small');
    await musicModel.initialize();
    console.log(musicModel);

    // https://archive.org/details/SalamanderGrandPianoV3
    player = new mm.SoundFontPlayer('https://storage.googleapis.com/magentadata/js/soundfonts/salamander');
    console.log(player);
}

document.addEventListener("DOMContentLoaded", function () {
    // Models initialisieren
    loadEmotionModel();
    loadMusicModel();

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

    function startCountdown() {
        let countdown = 3; // 3 seconds countdown
        const countdownDisplay = document.getElementById('countdownDisplay');
    
        const countdownInterval = setInterval(() => {
            countdownDisplay.innerText = `Get ready: ${countdown}`;
            countdown--;
    
            if (countdown < 0) {
                clearInterval(countdownInterval);
                countdownDisplay.innerText = '';
            }
        }, 1000); // Jede Sekunde updaten
    }

    video.addEventListener('play', () => {
        // Canvas erstellen und unsichtbar über die Webcam legen (auf diesem Canvas wird die Emotion detectet)
        const canvas = faceapi.createCanvasFromMedia(video)
        const contentDiv = document.querySelector('.content');
        contentDiv.appendChild(canvas);

        const displaySize = { width: video.width, height: video.height }
        faceapi.matchDimensions(canvas, displaySize)

        setInterval(async () => {
            const now = Date.now();

            // Countdown starten
            if (now - lastEmotionDetection > EMOTION_DETECTION_INTERVAL - 3000 && countdownValue) {
                startCountdown();
                countdownValue = 0;
            }

            // Emotion detecten und Musik generieren
            if (now - lastEmotionDetection > EMOTION_DETECTION_INTERVAL) {
                lastEmotionDetection = now;
                countdownValue = 3;

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

    // Emotion-Model braucht ein grayscale Bild in Größe 48x48px
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
            .expandDims(-1) // Channel dimension hinzufügen (um input shape zu matchen)
            .expandDims(0); // Batch dimension hinzufügen (nicht klar ob das überhaupt nötig ist)

        const prediction = await emotionModel.predict(tensor).data();

        // Prediction als lesbares Format darstellen
        const emotionIndex = prediction.indexOf(Math.max(...prediction));
        const emotionLabels = ['Angry', 'Disgust', 'Fear', 'Happy', 'Sad', 'Surprised', 'Neutral'];
        const detectedEmotion = emotionLabels[emotionIndex];

        // Update Partikelfarbe 
        updateParticleColor(detectedEmotion.toLowerCase());

        // Update Emotionsanzeige mit entsprechender Farbe
        const emotionDisplay = document.getElementById('emotionDisplay');
        emotionDisplay.className = ''; // Vorhandene Klassen löschen
        emotionDisplay.classList.add(`emotion-${detectedEmotion.toLowerCase()}`);
        emotionDisplay.innerText = `Emotion: ${detectedEmotion}`;

        // Background basierend auf erkannter Emotion updaten
        updateBackgroundAnimation(detectedEmotion.toLowerCase());

        return detectedEmotion;
    }

    // Background Animation Farbe ändern
    function updateBackgroundAnimation(emotion) {
        const animationContainer = document.getElementById('animationContainer');
        animationContainer.className = '';
        animationContainer.classList.add(`animation-${emotion}`);
    }

    // Ähnliche Musik von vorher gesetzten Primer-Melodien generieren und abspielen
    async function generateMusicBasedOnEmotion(emotion) {
        if (!musicModel) {
            console.error("Music Model ist noch nicht geladen!");
            return;
        }
        
        // Melodie zum Samplen (je nach Emotion anders, alle Melodien ab Zeile 185)
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
});

function getPrimerMelodyForEmotion(emotion) {
    switch (emotion) {

        case 'Angry':
            return {
                notes: [ // Tiefe Töne
                    { pitch: 28, quantizedStartStep: 0, quantizedEndStep: 4 },
                    { pitch: 36, quantizedStartStep: 4, quantizedEndStep: 6 },
                    { pitch: 38, quantizedStartStep: 6, quantizedEndStep: 8 },

                    { pitch: 30, quantizedStartStep: 8, quantizedEndStep: 9 },
                    { pitch: 30, quantizedStartStep: 9, quantizedEndStep: 10 },
                    { pitch: 30, quantizedStartStep: 10, quantizedEndStep: 11 },
                    { pitch: 30, quantizedStartStep: 11, quantizedEndStep: 12 },

                    { pitch: 36, quantizedStartStep: 12, quantizedEndStep: 16 },
                    { pitch: 28, quantizedStartStep: 16, quantizedEndStep: 20 },

                    { pitch: 36, quantizedStartStep: 20, quantizedEndStep: 21 },
                    { pitch: 30, quantizedStartStep: 21, quantizedEndStep: 22 },
                    { pitch: 38, quantizedStartStep: 22, quantizedEndStep: 24 },

                    { pitch: 30, quantizedStartStep: 24, quantizedEndStep: 28 },
                    { pitch: 30, quantizedStartStep: 28, quantizedEndStep: 30 },
                    { pitch: 36, quantizedStartStep: 30, quantizedEndStep: 32 },

                    { pitch: 28, quantizedStartStep: 32, quantizedEndStep: 36 },
                    { pitch: 36, quantizedStartStep: 36, quantizedEndStep: 38 },
                    { pitch: 38, quantizedStartStep: 38, quantizedEndStep: 39 },
                    { pitch: 38, quantizedStartStep: 39, quantizedEndStep: 40 },

                    { pitch: 30, quantizedStartStep: 40, quantizedEndStep: 44 },
                    { pitch: 36, quantizedStartStep: 44, quantizedEndStep: 46 },
                    { pitch: 36, quantizedStartStep: 46, quantizedEndStep: 47 },
                    { pitch: 36, quantizedStartStep: 47, quantizedEndStep: 48 },

                    { pitch: 28, quantizedStartStep: 48, quantizedEndStep: 52 },
                    { pitch: 36, quantizedStartStep: 52, quantizedEndStep: 54 },
                    { pitch: 38, quantizedStartStep: 54, quantizedEndStep: 56 },

                    { pitch: 30, quantizedStartStep: 56, quantizedEndStep: 60 },
                    { pitch: 36, quantizedStartStep: 60, quantizedEndStep: 61 },
                    { pitch: 36, quantizedStartStep: 61, quantizedEndStep: 62 },
                    { pitch: 36, quantizedStartStep: 62, quantizedEndStep: 63 },
                    { pitch: 36, quantizedStartStep: 63, quantizedEndStep: 64 },
                ],
                totalQuantizedSteps: 64,
                quantizationInfo: { stepsPerQuarter: 4 },
                tempos: [{ time: 0, qpm: 120 }]
            };

        case 'Disgust':
            return {
                notes: [ // Bisschen dissonanz
                    { pitch: 76, quantizedStartStep: 0, quantizedEndStep: 2 },
                    { pitch: 75, quantizedStartStep: 2, quantizedEndStep: 4 },
                    { pitch: 74, quantizedStartStep: 4, quantizedEndStep: 6 },
                    { pitch: 74, quantizedStartStep: 6, quantizedEndStep: 8 },

                    { pitch: 73, quantizedStartStep: 8, quantizedEndStep: 10 },
                    { pitch: 72, quantizedStartStep: 10, quantizedEndStep: 12 },
                    { pitch: 71, quantizedStartStep: 12, quantizedEndStep: 14 },
                    { pitch: 71, quantizedStartStep: 14, quantizedEndStep: 16 },

                    { pitch: 74, quantizedStartStep: 16, quantizedEndStep: 18 },
                    { pitch: 73, quantizedStartStep: 18, quantizedEndStep: 20 },
                    { pitch: 73, quantizedStartStep: 20, quantizedEndStep: 22 },
                    { pitch: 72, quantizedStartStep: 22, quantizedEndStep: 24 },

                    { pitch: 71, quantizedStartStep: 24, quantizedEndStep: 26 },
                    { pitch: 70, quantizedStartStep: 26, quantizedEndStep: 28 },
                    { pitch: 69, quantizedStartStep: 28, quantizedEndStep: 30 },
                    { pitch: 69, quantizedStartStep: 31, quantizedEndStep: 32 },

                    { pitch: 79, quantizedStartStep: 32, quantizedEndStep: 34 },
                    { pitch: 78, quantizedStartStep: 34, quantizedEndStep: 36 },
                    { pitch: 78, quantizedStartStep: 36, quantizedEndStep: 38 },
                    { pitch: 77, quantizedStartStep: 38, quantizedEndStep: 40 },

                    { pitch: 76, quantizedStartStep: 40, quantizedEndStep: 42 },
                    { pitch: 75, quantizedStartStep: 42, quantizedEndStep: 44 },
                    { pitch: 74, quantizedStartStep: 44, quantizedEndStep: 46 },
                    { pitch: 74, quantizedStartStep: 46, quantizedEndStep: 48 },

                    { pitch: 79, quantizedStartStep: 48, quantizedEndStep: 50 },
                    { pitch: 78, quantizedStartStep: 50, quantizedEndStep: 52 },
                    { pitch: 78, quantizedStartStep: 52, quantizedEndStep: 54 },
                    { pitch: 77, quantizedStartStep: 54, quantizedEndStep: 56 },

                    { pitch: 76, quantizedStartStep: 56, quantizedEndStep: 58 },
                    { pitch: 75, quantizedStartStep: 58, quantizedEndStep: 60 },
                    { pitch: 74, quantizedStartStep: 60, quantizedEndStep: 62 },
                    { pitch: 74, quantizedStartStep: 62, quantizedEndStep: 64 },
                ],
                totalQuantizedSteps: 64,
                quantizationInfo: { stepsPerQuarter: 4 },
                tempos: [{ time: 0, qpm: 110 }]
            };

        case 'Fear':
            return {
                notes: [ // Hoch zu tief
                    { pitch: 84, quantizedStartStep: 0, quantizedEndStep: 2 },
                    { pitch: 36, quantizedStartStep: 2, quantizedEndStep: 4 },
                    { pitch: 84, quantizedStartStep: 4, quantizedEndStep: 6 },
                    { pitch: 36, quantizedStartStep: 7, quantizedEndStep: 8 },

                    { pitch: 84, quantizedStartStep: 8, quantizedEndStep: 10 },
                    { pitch: 36, quantizedStartStep: 10, quantizedEndStep: 12 },
                    { pitch: 84, quantizedStartStep: 12, quantizedEndStep: 14 },
                    { pitch: 36, quantizedStartStep: 15, quantizedEndStep: 16 },

                    { pitch: 84, quantizedStartStep: 16, quantizedEndStep: 18 },
                    { pitch: 36, quantizedStartStep: 18, quantizedEndStep: 20 },
                    { pitch: 84, quantizedStartStep: 20, quantizedEndStep: 22 },
                    { pitch: 36, quantizedStartStep: 23, quantizedEndStep: 24 },

                    { pitch: 84, quantizedStartStep: 24, quantizedEndStep: 26 },
                    { pitch: 36, quantizedStartStep: 26, quantizedEndStep: 28 },
                    { pitch: 72, quantizedStartStep: 28, quantizedEndStep: 30 },
                    { pitch: 36, quantizedStartStep: 31, quantizedEndStep: 32 },

                    { pitch: 84, quantizedStartStep: 32, quantizedEndStep: 34 },
                    { pitch: 36, quantizedStartStep: 34, quantizedEndStep: 36 },
                    { pitch: 84, quantizedStartStep: 36, quantizedEndStep: 38 },
                    { pitch: 36, quantizedStartStep: 39, quantizedEndStep: 40 },

                    { pitch: 84, quantizedStartStep: 40, quantizedEndStep: 42 },
                    { pitch: 36, quantizedStartStep: 42, quantizedEndStep: 44 },
                    { pitch: 84, quantizedStartStep: 44, quantizedEndStep: 46 },
                    { pitch: 36, quantizedStartStep: 47, quantizedEndStep: 48 },

                    { pitch: 84, quantizedStartStep: 48, quantizedEndStep: 50 },
                    { pitch: 36, quantizedStartStep: 50, quantizedEndStep: 52 },
                    { pitch: 84, quantizedStartStep: 52, quantizedEndStep: 54 },
                    { pitch: 36, quantizedStartStep: 55, quantizedEndStep: 56 },

                    { pitch: 84, quantizedStartStep: 56, quantizedEndStep: 58 },
                    { pitch: 36, quantizedStartStep: 58, quantizedEndStep: 60 },
                    { pitch: 72, quantizedStartStep: 60, quantizedEndStep: 62 },
                    { pitch: 36, quantizedStartStep: 63, quantizedEndStep: 64 },
                ],
                totalQuantizedSteps: 64,
                quantizationInfo: { stepsPerQuarter: 4 },
                tempos: [{ time: 0, qpm: 90 }]
            };

        case 'Happy':
            return {
                notes: [ // Bisschen Rhythmus
                    { pitch: 76, quantizedStartStep: 0, quantizedEndStep: 3 },
                    { pitch: 77, quantizedStartStep: 3, quantizedEndStep: 4 },
                    { pitch: 79, quantizedStartStep: 4, quantizedEndStep: 7 }, // 1
                    { pitch: 81, quantizedStartStep: 7, quantizedEndStep: 8 },

                    { pitch: 81, quantizedStartStep: 8, quantizedEndStep: 10 },
                    { pitch: 79, quantizedStartStep: 10, quantizedEndStep: 12 },
                    { pitch: 77, quantizedStartStep: 12, quantizedEndStep: 14 }, // 2
                    { pitch: 76, quantizedStartStep: 14, quantizedEndStep: 16 },

                    { pitch: 74, quantizedStartStep: 16, quantizedEndStep: 19 },
                    { pitch: 76, quantizedStartStep: 19, quantizedEndStep: 20 },
                    { pitch: 77, quantizedStartStep: 20, quantizedEndStep: 23 }, // 3
                    { pitch: 79, quantizedStartStep: 23, quantizedEndStep: 24 },

                    { pitch: 79, quantizedStartStep: 24, quantizedEndStep: 26 },
                    { pitch: 77, quantizedStartStep: 26, quantizedEndStep: 28 },
                    { pitch: 76, quantizedStartStep: 28, quantizedEndStep: 30 }, // 4
                    { pitch: 74, quantizedStartStep: 30, quantizedEndStep: 32 },

                    { pitch: 76, quantizedStartStep: 32, quantizedEndStep: 35 },
                    { pitch: 77, quantizedStartStep: 35, quantizedEndStep: 36 },
                    { pitch: 79, quantizedStartStep: 36, quantizedEndStep: 39 }, // 5
                    { pitch: 81, quantizedStartStep: 39, quantizedEndStep: 40 },

                    { pitch: 81, quantizedStartStep: 40, quantizedEndStep: 42 },
                    { pitch: 79, quantizedStartStep: 42, quantizedEndStep: 44 },
                    { pitch: 77, quantizedStartStep: 44, quantizedEndStep: 46 }, // 6
                    { pitch: 76, quantizedStartStep: 46, quantizedEndStep: 48 },

                    { pitch: 74, quantizedStartStep: 48, quantizedEndStep: 51 },
                    { pitch: 76, quantizedStartStep: 51, quantizedEndStep: 52 },
                    { pitch: 77, quantizedStartStep: 52, quantizedEndStep: 55 }, // 7
                    { pitch: 79, quantizedStartStep: 55, quantizedEndStep: 56 },

                    { pitch: 79, quantizedStartStep: 56, quantizedEndStep: 58 },
                    { pitch: 77, quantizedStartStep: 58, quantizedEndStep: 60 },
                    { pitch: 76, quantizedStartStep: 60, quantizedEndStep: 62 }, // 8
                    { pitch: 74, quantizedStartStep: 62, quantizedEndStep: 64 },
                ],
                totalQuantizedSteps: 16,
                quantizationInfo: { stepsPerQuarter: 4 },
                tempos: [{ time: 0, qpm: 120 }]
            };

        case 'Sad':
            return {
                notes: [ // Lange Töne
                    { pitch: 48, quantizedStartStep: 0, quantizedEndStep: 8, velocity: 80 },
                    { pitch: 47, quantizedStartStep: 8, quantizedEndStep: 16, velocity: 80 },
                    { pitch: 45, quantizedStartStep: 16, quantizedEndStep: 24, velocity: 80 },
                    { pitch: 43, quantizedStartStep: 24, quantizedEndStep: 32, velocity: 80 },
                    { pitch: 48, quantizedStartStep: 32, quantizedEndStep: 40, velocity: 80 },
                    { pitch: 47, quantizedStartStep: 40, quantizedEndStep: 48, velocity: 80 },
                    { pitch: 45, quantizedStartStep: 48, quantizedEndStep: 56, velocity: 80 },
                    { pitch: 43, quantizedStartStep: 56, quantizedEndStep: 64, velocity: 80 },
                ],
                totalQuantizedSteps: 64,
                quantizationInfo: { stepsPerQuarter: 4 },
                tempos: [{ time: 0, qpm: 100 }],
            };

        case 'Surprised':
            return {
                notes: [ // unpredictable pattern
                    { pitch: 100, quantizedStartStep: 0, quantizedEndStep: 1 },
                    { pitch: 100, quantizedStartStep: 1, quantizedEndStep: 2 },
                    { pitch: 100, quantizedStartStep: 2, quantizedEndStep: 3 },
                    { pitch: 100, quantizedStartStep: 3, quantizedEndStep: 4 },
                    { pitch: 96, quantizedStartStep: 4, quantizedEndStep: 5 }, // 1
                    { pitch: 96, quantizedStartStep: 5, quantizedEndStep: 6 },
                    { pitch: 96, quantizedStartStep: 6, quantizedEndStep: 7 },
                    { pitch: 96, quantizedStartStep: 7, quantizedEndStep: 8 },

                    { pitch: 100, quantizedStartStep: 11, quantizedEndStep: 14 }, // 2
                    { pitch: 96, quantizedStartStep: 14, quantizedEndStep: 16 },

                    { pitch: 96, quantizedStartStep: 16, quantizedEndStep: 19 },
                    { pitch: 96, quantizedStartStep: 19, quantizedEndStep: 20 },
                    { pitch: 94, quantizedStartStep: 20, quantizedEndStep: 23 }, // 3
                    { pitch: 94, quantizedStartStep: 23, quantizedEndStep: 24 },

                    { pitch: 100, quantizedStartStep: 24, quantizedEndStep: 26 },
                    { pitch: 100, quantizedStartStep: 26, quantizedEndStep: 28 },
                    { pitch: 96, quantizedStartStep: 28, quantizedEndStep: 30 }, // 4
                    { pitch: 96, quantizedStartStep: 30, quantizedEndStep: 32 },

                    { pitch: 96, quantizedStartStep: 32, quantizedEndStep: 35 },
                    { pitch: 96, quantizedStartStep: 35, quantizedEndStep: 36 },
                    { pitch: 94, quantizedStartStep: 36, quantizedEndStep: 39 }, // 5
                    { pitch: 81, quantizedStartStep: 39, quantizedEndStep: 40 },

                    { pitch: 81, quantizedStartStep: 40, quantizedEndStep: 42 },
                    { pitch: 79, quantizedStartStep: 42, quantizedEndStep: 44 },
                    { pitch: 77, quantizedStartStep: 44, quantizedEndStep: 46 }, // 6
                    { pitch: 76, quantizedStartStep: 46, quantizedEndStep: 48 },

                    { pitch: 81, quantizedStartStep: 48, quantizedEndStep: 51 },
                    { pitch: 81, quantizedStartStep: 51, quantizedEndStep: 52 },
                    { pitch: 90, quantizedStartStep: 52, quantizedEndStep: 55 }, // 7
                    { pitch: 90, quantizedStartStep: 55, quantizedEndStep: 56 },

                    { pitch: 100, quantizedStartStep: 56, quantizedEndStep: 58 },
                    { pitch: 100, quantizedStartStep: 58, quantizedEndStep: 60 },
                    { pitch: 96, quantizedStartStep: 60, quantizedEndStep: 62 }, // 8
                    { pitch: 100, quantizedStartStep: 62, quantizedEndStep: 64 },
                ],
                totalQuantizedSteps: 64,
                quantizationInfo: { stepsPerQuarter: 4 },
                tempos: [{ time: 0, qpm: 100 }]
            };

        case 'Neutral':
            return {
                notes: [ // simple & balanced
                    { pitch: 64, quantizedStartStep: 0, quantizedEndStep: 4 },
                    { pitch: 64, quantizedStartStep: 4, quantizedEndStep: 8 },
                    { pitch: 64, quantizedStartStep: 8, quantizedEndStep: 12 },
                    { pitch: 64, quantizedStartStep: 12, quantizedEndStep: 16 },
                    { pitch: 64, quantizedStartStep: 16, quantizedEndStep: 20 },
                    { pitch: 64, quantizedStartStep: 20, quantizedEndStep: 24 },
                    { pitch: 64, quantizedStartStep: 22, quantizedEndStep: 28 },
                    { pitch: 64, quantizedStartStep: 26, quantizedEndStep: 32 },
                    { pitch: 64, quantizedStartStep: 32, quantizedEndStep: 36 },
                    { pitch: 64, quantizedStartStep: 36, quantizedEndStep: 40 },
                    { pitch: 64, quantizedStartStep: 40, quantizedEndStep: 44 },
                    { pitch: 64, quantizedStartStep: 44, quantizedEndStep: 48 },
                    { pitch: 64, quantizedStartStep: 48, quantizedEndStep: 52 },
                    { pitch: 64, quantizedStartStep: 52, quantizedEndStep: 56 },
                    { pitch: 64, quantizedStartStep: 56, quantizedEndStep: 50 },
                    { pitch: 64, quantizedStartStep: 60, quantizedEndStep: 64 }
                ],
                totalQuantizedSteps: 64,
                quantizationInfo: { stepsPerQuarter: 4 },
                tempos: [{ time: 0, qpm: 100 }]
            };
    }
}

function updateParticleColor(emotion) {
    var color;
    switch (emotion) {
        case 'angry':
            color = 'red';
            break;
        case 'disgust':
            color = 'olive';
            break;
        case 'fear':
            color = 'black';
            break;
        case 'happy':
            color = 'yellow';
            break;
        case 'sad':
            color = 'rgb(19, 196, 255)';
            break;
        case 'surprised':
            color = 'purple';
            break;
        case 'neutral':
            color = 'gray';
            break;
        default:
            color = 'white'; // Standardfarbe
    }

    var particles = document.querySelectorAll('.particle');
    particles.forEach(function (particle) {
        particle.style.background = color;
    });
}

function particlesMain() {
    var np = document.documentElement.clientWidth / 29;
    particles.innerHTML = "";
    for (var i = 0; i < np; i++) {
        var w = document.documentElement.clientWidth;
        var h = document.documentElement.clientHeight;
        var rndw = Math.floor(Math.random() * w) + 1;
        var rndh = Math.floor(Math.random() * h) + 1;
        var widthpt = Math.floor(Math.random() * 8) + 3;
        var opty = Math.floor(Math.random() * 5) + 2;
        var anima = Math.floor(Math.random() * 12) + 8;

        var div = document.createElement("div");
        div.classList.add("particle");
        div.style.marginLeft = rndw + "px";
        div.style.marginTop = rndh + "px";
        div.style.width = widthpt + "px";
        div.style.height = widthpt + "px";
        div.style.background = "white";
        div.style.opacity = opty;
        div.style.animation = "move " + anima + "s ease-in infinite";
        particles.appendChild(div);
    }
}

window.addEventListener("resize", particlesMain);
window.addEventListener("load", particlesMain);