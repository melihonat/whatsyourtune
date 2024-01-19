# What'sYourTune Repository
## Overview
Welcome to the "whatsyourtune" repository. This project aims to explore various aspects of music and emotions, incorporating tools for emotion detection, python experiments, some (not all) attempts of generating music using the [maestro dataset](https://magenta.tensorflow.org/datasets/maestro), of which some files, like the actual generation of the music, unfortunately are deleted, and, last but not least, our final switch of direction to JavaScript. The repository structure includes specific folders for organizing different components of the project.
## Repository Structure
### Emotion Detection
The "emotion detection" folder contains python code and resources related to analyzing emotions in a human's facial expressions. Explore this section to understand how the project integrates emotion detection techniques using a Tensorflow model.
### Magenta Tests
In the "magenta tests" folder, you'll find an experiment utilizing the Magenta API to pre-process the forementioned maestro dataset, which we ended up not using and decided to switch from Python to JS.
### Webcam Tests
This folder demonstrates the emotion detection logic inside a personal environment. By running the webcam-test files, explore how our emotion model operates.
### Archive
The "archive" folder should have served as a storage space for resources needed in the other folders, but as we switched to JS-based generation, this folder was not used any further. It still contains a MIDI sequence that we have decided not to delete as it was our first piece of model-generated music.
### JS
This, after long consideration, is the main folder for our implementation of Machine-Learning-based music generation. It contains:
- our emotion model, 
- a face detecting model to feed the frames to the emotion model,
- the HTML and CSS files to our website,
- and finally, our JavaScript implementation for generating music based on specific emotions.

To test it out for yourself, visit [our website](https://whatsyourtune.com/).
	
