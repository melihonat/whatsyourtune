tf.setBackend('cpu');
let emotionModel;
let musicModel;

const seed1 = {
    notes: [
        // Piano (right hand) - Melody in C Major
        { pitch: 60, startTime: 0, endTime: 0.5, instrument: 0 },   // C4
        { pitch: 64, startTime: 0.5, endTime: 1, instrument: 0 },  // E4
        { pitch: 67, startTime: 1, endTime: 1.5, instrument: 0 },  // G4
        { pitch: 72, startTime: 1.5, endTime: 2, instrument: 0 },  // C5
        { pitch: 71, startTime: 2, endTime: 2.5, instrument: 0 },  // B4
        { pitch: 67, startTime: 2.5, endTime: 3, instrument: 0 },  // G4
        { pitch: 64, startTime: 3, endTime: 3.5, instrument: 0 },  // E4
        { pitch: 60, startTime: 3.5, endTime: 4, instrument: 0 },  // C4

        // Bass - Root notes of the C Major chord progression
        { pitch: 48, startTime: 0, endTime: 1, instrument: 1 },    // C3
        { pitch: 48, startTime: 1, endTime: 2, instrument: 1 },    // C3
        { pitch: 48, startTime: 2, endTime: 3, instrument: 1 },    // C3
        { pitch: 48, startTime: 3, endTime: 4, instrument: 1 },    // C3

        // Drums - Simple drum pattern
        { pitch: 36, startTime: 0, endTime: 0.5, instrument: 2 },  // Kick drum
        { pitch: 38, startTime: 0.5, endTime: 1, instrument: 2 },  // Snare drum
        { pitch: 42, startTime: 1, endTime: 1.5, instrument: 2 },  // Closed Hi-hat
        { pitch: 36, startTime: 1.5, endTime: 2, instrument: 2 },  // Kick drum
        { pitch: 38, startTime: 2, endTime: 2.5, instrument: 2 },  // Snare drum
        { pitch: 42, startTime: 2.5, endTime: 3, instrument: 2 },  // Closed Hi-hat
        { pitch: 36, startTime: 3, endTime: 3.5, instrument: 2 },  // Kick drum
        { pitch: 38, startTime: 3.5, endTime: 4, instrument: 2 },  // Snare drum
    ],
    totalTime: 4 // Length of the seed in quarter notes
};


document.addEventListener("DOMContentLoaded", function() {
    // Emotion Detection und Music Model laden
    loadEmotionModel();
    loadMusicModel();

    async function loadEmotionModel() {
        emotionModel = await tf.loadLayersModel('/models/emotion/model.json');
    }

    async function loadMusicModel() {
        musicModel = new mm.MusicVAE('https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/trio_4bar');
        await musicModel.initialize();
    }

    const player = new mm.Player();

    const video = document.getElementById('webcam');

    // Face-Api-JS TinyFaceDetector Model laden
    Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models/face'),
    ]).then(startVideo)

    function startVideo() {
        navigator.mediaDevices.getUserMedia({ video: {} })
        .then(function(stream) {
            video.srcObject = stream;
        })
        .catch(function(err) {
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
        console.log(prediction);
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

        let seed; // Musikalischen Seed oder Features für jede Emotion definieren

        switch(emotion) {
            case 'Angry':
                seed = seed1;
                break;
            case 'Disgust':
                seed = seed1;
                break;
            case 'Fear':
                seed = seed1;
                break;
            case 'Happy':
                seed = seed1;
                break;
            case 'Sad':
                seed = seed1;
                break;
            case 'Surprised':
                seed = seed1;
                break;
            case 'Neutral':
                seed = seed1;
                break;
        }

        const generatedMusic = await musicModel.sample(seed);
        playMusic(generatedMusic);

        console.log("Generating music for emotion: " + emotion);
        console.log(seed)
    }

    // Spielt Musik ab.
    function playMusic(musicSequence) {
        if (!player.isPlaying) {
            player.stop();
        }
        player.start(musicSequence);
    }
});