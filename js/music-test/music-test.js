const musicModelURL = 'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_4bar_med_q2';
let musicModel;
let player;

async function loadMusicModel() {
    musicModel = new music_vae.MusicVAE(musicModelURL);
    await musicModel.initialize();
    //player = new mm.SoundFontPlayer('https://storage.googleapis.com/magentadata/js/soundfonts/salamander');
    player = new mm.SoundFontPlayer('https://storage.googleapis.com/magentadata/js/soundfonts/sgm_plus');
}

document.addEventListener('DOMContentLoaded', function () {
    loadMusicModel();

    document.getElementById('playSad').addEventListener('click', function () {
        playMelody(getMelodyForEmotion('Sad'), 'Sad');
    });

    document.getElementById('playHappy').addEventListener('click', function () {
        playMelody(getMelodyForEmotion('Happy'), 'Happy');
    });

    document.getElementById('playFear').addEventListener('click', function () {
        playMelody(getMelodyForEmotion('Fear'), 'Fear');
    });

    document.getElementById('playAngry').addEventListener('click', function () {
        playMelody(getMelodyForEmotion('Angry'), 'Angry');
    });

    document.getElementById('playSurprised').addEventListener('click', function () {
        playMelody(getMelodyForEmotion('Surprised'), 'Surprised');
    });

    document.getElementById('playNeutral').addEventListener('click', function () {
        playMelody(getMelodyForEmotion('Neutral'), 'Neutral');
    });

    document.getElementById('playDisgust').addEventListener('click', function () {
        playMelody(getMelodyForEmotion('Disgust'), 'Disgust');
    });

    document.getElementById('generateMusic').addEventListener('click', function () {
        generateAndPlayMusic();
    });
});

async function playMelody(melody, emotion) {
    if (!musicModel) {
        console.error("Music Model is not loaded yet!");
        return;
    }

    melody = getMelodyForEmotion(emotion);
    console.log("playing melody for emotion: ", emotion, melody);
    if (!player) {
        console.error("Player not initialized.");
        return;
    }

    if (!melody || !melody.notes) {
        console.error("Invalid melody for emotion: ", emotion);
        return;
    }

    try {
        await player.start(melody);
        console.log("Melody playback started.");
    } catch (error) {
        console.error("Error during melody playback:", error);
    }
}

async function generateAndPlayMusic() {
    if (!musicModel) {
        console.error("Music model not loaded yet!");
        return;
    }

    const emotions = ['Sad', 'Happy', 'Angry', 'Neutral', 'Disgust', 'Fear', 'Surprised'];
    const randomIndex = Math.floor(Math.random() * emotions.length);
    const randomElement = emotions[randomIndex];
    console.log(randomElement);
    
    const primerMelody = getMelodyForEmotion(randomElement);

    try {
        const generatedMusic = await musicModel.similar(primerMelody, 1, 0.65);
        if (player) {
            player.start(generatedMusic[0]);
            console.log("Playback started: ", generatedMusic[0]);
        }
    } catch (error) {
        console.error("Error during music generation/playback:", error);
    }
}

function getMelodyForEmotion(emotion) {
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
                    { pitch: 48, quantizedStartStep: 0, quantizedEndStep: 8, velocity: 80}, 
                    { pitch: 47, quantizedStartStep: 8, quantizedEndStep: 16, velocity: 80},
                    { pitch: 45, quantizedStartStep: 16, quantizedEndStep: 24, velocity: 80}, 
                    { pitch: 43, quantizedStartStep: 24, quantizedEndStep: 32, velocity: 80}, 
                    { pitch: 48, quantizedStartStep: 32, quantizedEndStep: 40, velocity: 80}, 
                    { pitch: 47, quantizedStartStep: 40, quantizedEndStep: 48, velocity: 80},
                    { pitch: 45, quantizedStartStep: 48, quantizedEndStep: 56, velocity: 80}, 
                    { pitch: 43, quantizedStartStep: 56, quantizedEndStep: 64, velocity: 80}, 
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
                notes: [ // C Major, 100 BPM, simple & balanced
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