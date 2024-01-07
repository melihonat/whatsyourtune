tf.setBackend('cpu');
let emotionModel;
let musicModel;


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

    let player = new mm.Player();
    console.log("Player initialized: ", player);

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

        // DONT TOUCH FROM HERE

        let seed; // Musikalischen Seed oder Features für jede Emotion definieren

        switch(emotion) {
            case 'Angry':
                break;
            case 'Disgust':
                break;
            case 'Fear':
                break;
            case 'Happy':
                break;
            case 'Sad':
                break;
            case 'Surprised':
                break;
            case 'Neutral':
                break;
        }

        // DONT TOUCH UNTIL HERE

        const numSamples = 1;
        const sampleLength = 4;

        try {
            const generatedMusic = await musicModel.sample(numSamples, sampleLength);
            playMusic(generatedMusic[0]);
            console.log("Generating music for emotion: " + emotion);
        } catch (error) {
            console.error("Error generating music: ", error);
        }
    }

    // Spielt Musik ab.
    function playMusic(musicSequence) {
        if (!player) {
            console.error("Player is not initialized!");
            return;
        }

        if (!player.isPlaying) {
            console.log("Player isnt playing!");
            player.stop();
        }
        console.log("Playing Music Sequence: ", musicSequence);
        player.start(musicSequence);
    }
});