let model, musicVAE;
let isModelLoaded = false;

async function loadModel() {
    model = await tf.loadLayersModel('model.json');
    console.log('Emotion Model geladen.');
    isModelLoaded = true;
}

async function loadMusicVAE() {
    musicVAE = new music_vae.MusicVAE('https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/trio_4bar');
    await musicVAE.initialize();
    console.log('MusicVAE geladen.')
}

async function startWebcam() {
    const webcamElement = document.getElementById('webcam');
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        webcamElement.srcObject = stream;
        detectEmotion();
    } catch (error) {
        console.error('Fehler beim Laden der Webcam', error);

        document.getElementById('errorScreen').style.display = 'block';
        document.getElementById('loadingScreen').style.display = 'none';
    }
}

async function detectEmotion() {
    if (!isModelLoaded) return;

    requestAnimationFrame(detectEmotion); // Nächsten call schedulen

    const webcamElement = document.getElementById('webcam');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    // Bild von Webcam holen und preprocessen (wie bei webcam-test-windows)
    const inputWidth = 48;
    const inputHeight = 48;
    canvas.width = inputWidth;
    canvas.height = inputHeight;

    context.drawImage(webcamElement, 0, 0, inputWidth, inputHeight);

    // Bild zu grayscale konvertieren und normalisieren
    let imageData = context.getImageData(0, 0, inputWidth, inputHeight);
    let grayscaleImg = convertToGrayscale(imageData);
    let normalizedImg = normalizePixelValues(grayscaleImg);

    // Emotion predicten
    const prediction = await model.predict(tf.tensor([normalizedImg], [1, inputWidth, inputHeight, 1]));

    // Höchste Wahrscheinlichkeit aus der Prediction rausziehen
    const predictionData = await prediction.data();
    const highestProbabilityIndex = predictionData.indexOf(Math.max(...predictionData));

    // Index zum Label mappen
    const emotionLabels = ['Angry', 'Disgust', 'Fear', 'Happy', 'Sad', 'Surprise', 'Neutral'];
    const predictedEmotion = emotionLabels[highestProbabilityIndex];

    document.getElementById('emotionDisplay').innerText = `Emotion: ${predictedEmotion}`;

    generateAndPlayMusic(predictedEmotion);

    setTimeout(detectEmotion, 3000);
}

function convertToGrayscale(imageData) {
    let grayscale = [];
    for (let i=0; i < imageData.data.length; i += 4) {
        // Luminanz-Formel: 0.3 * R + 0.59 * G + 0.11 * B
        let lum = 0.3 * imageData.data[i] + 0.59 * imageData[i+1] + 0.11 * imageData[i+2];
        grayscale.push(lum);
    }
    return grayscale;
}

function normalizePixelValues(grayscaleImg) {
    return grayscaleImg.map(pixel => pixel/255);
}

async function generateAndPlayMusic(emotion) {
    const emotionMusicMap = {
        happy: { /* Einstellungen für happy Musik */},
        sad: { /* Einstellungen für sad Musik */},
        // Andere Emotionen
    };

    const musicSettings = emotionMusicMap[emotion];
    if (musicSettings) {
        const melodies = await musicVAE.sample(1, musicSettings.temperature);
        // TODO Generierte Melodien abspielen
    }
}

async function init() {
    await loadModel();
    await loadMusicVAE();
    startWebcam();
}

window.onload = init;