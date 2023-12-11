#!/usr/bin/env python
# coding: utf-8

# In[60]:


from magenta.music import midi_io
from magenta.music import sequences_lib
from sklearn.model_selection import train_test_split
import os
import tensorflow as tf


# In[61]:


# Ordner-Locations
maestro_path = '../archive/maestro-v3.0.0/data'
train_output_path = '../archive/music_train_data'
test_output_path = '../archive/music_test_data'

# Ordner erstellen, falls es sie noch nicht gibt
os.makedirs(maestro_path, exist_ok=True)
os.makedirs(train_output_path, exist_ok=True)
os.makedirs(test_output_path, exist_ok=True)


# In[62]:


def process_midi_file(midi_file_path):
    """
    Verarbeitung einer MIDI-Datei und Konvertierung zu NoteSequence.
    
    Parameter:
    - midi_file_path (str): Der Dateipfad zur MIDI-Datei.
    
    Rückgabe:
    - NoteSequence oder None: Die verarbeitete NoteSequence wenn erfolgreich, sonst None.
    
    """
    try:
        # In Binary Mode ('rb') öffnen und mit read() passen um TypeError in process_maestro_dataset() zu vermeiden.
        # midi_io.midi_to_note_sequence benötigt ein "bytes-like object'
        with open(midi_file_path, 'rb') as midi_file:
            sequence = midi_io.midi_to_note_sequence(midi_file.read())
        return sequence
    except Exception as e:
        print(f"Error processing {midi_file}: {e}")
        return None


# In[67]:


# Quasi dieselbe Methode wie magenta/scripts/convert_dir_to_note_sequences.py,
# nur einige Änderungen um es mit Maestro kompatibel zu machen

def process_maestro_dataset(maestro_path, train_output_path, test_output_path, test_size=0.2):
    """
    Verarbeitung von Dateien des Maestro Datasets, Aufteilung in Training- und Test-Sets,
    und Speichern der verarbeiteten Daten als TFRecord-Dateien.
    
    Parameter:
    - maestro_path (str): Der Ordner, der das Maestro Dataset mit Unterordnern für jedes Jahr enthält.
    - train_output_path (str): Der Ordner, an dem die verarbeiteten Trainingsdaten gespeichert werden.
    - test_output_path (str): Der Ordner, an dem die verarbeiteten Testdaten gespeichert werden.
    - test_size (float): Der Anteil der Daten, die dem Test-Set zugewiesen werden (Standard ist 0.2).
    
    Rückgabe:
    - None
    """
    subdirectories = ['2004', '2006', '2008', '2009', '2011', '2013', '2014', '2015', '2017', '2018']
    
    for subdir in subdirectories:
        subdir_path = os.path.join(maestro_path, subdir)
        
        if not os.path.exists(subdir_path):
            print(f"Directory {subdir_path} does not exist.")
            continue
            
        midi_files = [file for file in os.listdir(subdir_path) if file.endswith('.midi') or file.endswith('.mid')]
        
        # Train-Test-Split
        train_files, test_files = train_test_split(midi_files, test_size=test_size, random_state=42)
        
        def process_and_save_files(file_list, output_path):
            
            for midi_file in file_list:
                
                midi_path = os.path.join(subdir_path, midi_file)
                sequence = process_midi_file(midi_path)
                
                if sequence:
                    
                    sequences_lib.quantize_note_sequence(sequence, steps_per_quarter=4)
                    output_file = os.path.join(output_path, f'{os.path.splitext(midi_file)[0]}.tfrecord')
                    
                    with tf.io.TFRecordWriter(output_file) as writer:
                        writer.write(sequence.SerializeToString())
                        
        # Training set speichern
        process_and_save_files(train_files, train_output_path)
        
        # Test set speichern
        process_and_save_files(test_files, test_output_path)


# In[66]:


process_maestro_dataset(maestro_path, train_output_path, test_output_path)

