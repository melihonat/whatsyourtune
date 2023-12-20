// Generieren einer Melodie basierend auf der erkannten Emotion
async function generateMelody(emotion) {
    console.log(`Generating melody for: ${emotion}`);
    const characteristics = getMusicCharacteristics(emotion);

    try {
        // Magenta MusicVAE Model initialisieren
        const mvae = new music_vae.MusicVAE('https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/trio_4bar');
        await mvae.initialize();
        console.log('Model loaded.');

        // Sample-Melodie mit dem Model generieren
        const sample = await mvae.sample(1, characteristics.temperature);
        console.log('Melody generated.');

        // Generierte Melodie abspielen
        const player = new core.Player();
        player.start(sample[0]);
        console.log('Playback started.');
    } catch (error) {
        console.error('Error generating melody:', error);
    }
}

// Je nach Emotion soll andere Musik abgespielt werden
function getMusicCharacteristics(emotion) {
    switch(emotion) {
        case 'happy':
            return { temperature: 1.2 };
        case 'sad':
            return { temperature: 0.8 };
        default:
            return { temperature: 1.0 };
    }
}

// Webcam starten und clmtrackr initialisieren
function startWebcamAndTracking() {
    const video = document.getElementById('webcam');

    // Webcam-Access
    navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
            video.srcObject = stream;
            video.onloadedmetadata = function() {
                video.play();
                // Wenn der Webcamfeed ready ist, anfangen Gesichtszüge zu erkennen
                startTracking(video);
            };
        })
        .catch((err) => {
            console.error("Error accessing webcam:", err);
        });
}

// Clmtrackr initialisieren und starten
function startTracking(videoElement) {
    var ctracker = new clm.tracker();
    ctracker.init();
    ctracker.start(videoElement);

    // Durchgehend nach Emotionen checken
    trackExpression(ctracker);
}

// Emotion aus Gesichtszüge herausinterpretieren
function trackExpression(ctracker) {
    function drawLoop() {
        requestAnimationFrame(drawLoop);
        var positions = ctracker.getCurrentPosition();
        if (positions) {
            // Basic Logik um Emotionen zu erkennen, basierend auf der Distanz der Mundecken
            const mouthCornerDistance = Math.abs(positions[44][1] - positions[50][1]); // Beispiel indices für Mundecken
            const emotion = mouthCornerDistance > 15 ? 'happy' : 'sad';

            // Melodie generieren
            generateMelody(emotion);
        }
    }
    drawLoop();
}
// Webcam und Facial Tracking starten
startWebcamAndTracking();