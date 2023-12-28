# Emotion Detection scripts
Dieser Ordner enthält das Skript "emotion_model.py" zum Training eines Convolutional Neural Networks mithilfe des Datasets FER2013 und der Sequential-Models von Tensorflow.

Das aus dem Training entstandene CNN ist bereits gespeichert, einmal im .keras-Dateiformat, welches eigentlich Standard ist, und einmal im .h5-Legacy-Dateiformat, da das .keras-Dateiformat auf einem macOS-Gerät mit Apple Chip später zu Fehlern führt.

## Modell neu trainieren

Um das Convolutional Neural Network neu zu trainieren, lösche zunächst die beiden gespeicherten Modelle und füge das entpackte FER2013-Dataset (oder ein Dataset deiner Wahl) in den "archive"-Ordner hinzu.

Das FER2013-Dataset ist nicht in diesem Repository enthalten, sondern ist hier als Download verfügbar:
https://www.kaggle.com/datasets/msambare/fer2013

Nach diesem Schritt führe einfach das Skript "emotion_model.py" aus. Die beiden trainierten Modelle werden wieder in diesem Ordner gespeichert.

## TFJS-Model speichern

Um das Modell auf unserer Website ausführen zu können, konvertieren wir es zu einem TFJS-Modell, welches wir dann im js-Ordner weiter verwenden.
``` tensorflowjs_converter --input_format=keras emotion_model.h5 ../js ``` 
