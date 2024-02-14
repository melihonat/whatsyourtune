#!/usr/bin/env python
# coding: utf-8

# In[2]:


import cv2
import numpy as np
from tensorflow.keras.models import load_model
import pygame
import time
import os


# In[3]:


# Pygame Mixer initialisierung
pygame.mixer.init()

# Musik nach Emotion abspielen
def generate_music(emotion):
    music_mapping = {
        'Happy': 'happy.mp3',
        'Sad': 'sad.mp3'
        # mehr emotionen können hinzugefügt werden
    }
    return music_mapping.get(emotion, 'mert.mp3')

face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
loaded_model = load_model('../Emotion Detection/emotion_model.keras')

# Emotion indices to Labels mappen
emotion_labels = {0: 'Angry', 1: 'Disgust', 2: 'Fear', 3: 'Happy', 4: 'Sad', 5: 'Surprise', 6: 'Neutral'}

# Webcam-Verbindung herstellen (Hier Webcam-Nummer eingeben, z.B. 0, 1, 2...)
cap = cv2.VideoCapture(1)

update_interval = 2 # Update every 2 seconds
last_update_time = time.time()
predicted_label=''
last_cropped_frame = None

while True:
    ret, frame = cap.read()
    
    frame_gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY) # Zu grayscale konvertieren (weil Trainingsdaten auch grayscale waren)
    
    # Face detection
    faces = face_cascade.detectMultiScale(frame_gray, minNeighbors=5, minSize=(30, 30))
    
    if len(faces) > 0:
        # Erstes erkanntes Gesicht speichern
        x, y, w, h = faces[0]
        
        # Erkanntes Gesicht als neuen Frame ausgeben
        frame_cropped = frame[y:y+h, x:x+w]
        
        # Frame resize
        frame_small = cv2.resize(frame_cropped, (48, 48)) # Bild muss input shape matchen
        
        frame_small_gray = cv2.cvtColor(frame_small, cv2.COLOR_BGR2GRAY) # Convert zu Grayscale
        frame_small_gray = frame_small_gray.astype('float32') / 255.0  # Pixelwerte auf den Bereich 0-1 normalisieren
        frame_small_gray = np.expand_dims(frame_small_gray, axis=0) # Batch dimension hinzufügen
        
        # Emotionsprediction nach bestimmter Zeit updaten
        current_time = time.time()
        if current_time - last_update_time > update_interval:
            # Prediction testen
            prediction = loaded_model.predict(frame_small_gray.reshape(1, 48, 48, 1))
            
            # Vorhergesehenes Label holen
            predicted_label = emotion_labels[np.argmax(prediction)]

            # Musik basierend auf Emotion spielen
            music_file = generate_music(predicted_label)
            if music_file and os.path.exists(music_file):
                pygame.mixer.music.load(music_file)
                pygame.mixer.music.play()
            else:
                print(f"Error: Music file '{music_file}' not found.")
            
            # Update time resetten und den Frame holen um ihn anzuzeigen
            last_update_time = current_time
            last_cropped_frame = frame_cropped
    
    for (x, y, w, h) in faces:       
        cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 0, 255), 2)
        
    frame = cv2.resize(frame, (800, 600))
    
    # Prediction displayen (https://www.geeksforgeeks.org/python-opencv-cv2-puttext-method/)
    cv2.putText(frame, f'Emotion: {predicted_label}', (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, 255, 2)
    
    # Den zuletzt genommenen Frame displayen
    if last_cropped_frame is not None:
        frame[50:250, 20:220] = cv2.resize(last_cropped_frame, (200, 200))
        
    cv2.imshow('Emotions-Prediction', frame)
    cv2.namedWindow('Emotions-Prediction', cv2.WINDOW_NORMAL)
    cv2.resizeWindow('Emotions-Prediction', 800, 600)
    
    # Break loop wenn B gedrückt wird
    if cv2.waitKey(1) & 0xFF == ord('b'):
        break
        
# Fenster schließen
cap.release()
cv2.destroyAllWindows()

