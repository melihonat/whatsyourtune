let mvae;
let isMusicPlaying = false;

async function initializeModel() {
    mvae = new music_vae.MusicVAE('https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/trio_4bar');
    await mvae.initialize();
    console.log('Modell geladen.');

    // Loading Screen verstecken
    document.getElementById('loadingScreen').style.display= 'none';
}

initializeModel();

// Generieren einer Melodie basierend auf der erkannten Emotion
async function generateMelody(emotion) {
    // Checken ob Musik schon spielt
    if (isMusicPlaying) return;

    console.log(`Generating melody for: ${emotion}`);
    const characteristics = getMusicCharacteristics(emotion);

    try {
        // Sample-Melodie mit dem Model generieren
        const sample = await mvae.sample(1, characteristics.temperature);    

        // GainNode erstellen um Lautstärke zu kontrollieren
        Tone.Master.volume.value = -6;

        // Player erstellen und Melodie abspielen
        const player = new core.Player();
        player.start(sample[0]);

        // Loading Screen verstecken
        document.getElementById('loadingScreen').style.display = 'none';
        isMusicPlaying = true;
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
                
                // Error Screen verstecken und Loading Screen anzeigen wenn Zugriff zur Kamera erlaubt wurde
                document.getElementById('errorScreen').style.display = 'none';
                document.getElementById('loadingScreen').style.display = 'flex';

                // Wenn der Webcamfeed ready ist, anfangen Gesichtszüge zu erkennen
                startTracking(video);
            };
        })
        .catch((err) => {
            console.error("Error accessing webcam:", err);

            // Error Screen zeigen wenn Zugriff abgelehnt wurde
            document.getElementById('errorScreen').style.display = 'flex';
            document.getElementById('loadingScreen').style.display = 'none';
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

            // EmotionDisplay updaten
            document.getElementById('emotionDisplay').innerText = `Emotion: ${emotion}`;
            // Melodie generieren
            generateMelody(emotion);
        }
    }
    drawLoop();
}
// Webcam und Facial Tracking starten
startWebcamAndTracking();