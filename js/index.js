tf.setBackend('cpu');
let emotionModel;

document.addEventListener("DOMContentLoaded", function() {
    // Emotion Detection Model laden
    loadEmotionModel();

    const video = document.getElementById('webcam');
    // Alle Face-Api-JS Models laden
    Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
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
        const canvas = faceapi.createCanvasFromMedia(video)
        document.body.append(canvas)
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
                        .div(255.0) // Pixelwerte normalisieren (0-1)
                        .expandDims(-1) // Channel dimension hinzufügen
                        .expandDims(0); // Batch dimension hinzufügen
        
        const prediction = await emotionModel.predict(tensor).data();

        // Prediction als lesbares Format darstellen
        const emotionIndex = prediction.indexOf(Math.max(...prediction));
        const emotionLabels = ['Angry', 'Disgust', 'Fear', 'Happy', 'Sad', 'Surprised', 'Neutral'];
        const detectedEmotion = emotionLabels[emotionIndex];

        return detectedEmotion;
    }

    function generateMusicBasedOnEmotion(emotion) {
        console.log("Generating music for emotion: " + emotion);
    }

    async function loadEmotionModel() {
        emotionModel = await tf.loadLayersModel('/models/model.json');
    }
});