import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
import random

import keras
from keras.models import Sequential
from keras.layers import Conv2D,Flatten,Dense,MaxPooling2D,Dropout
from sklearn.metrics import accuracy_score

import ipywidgets as widgets
import io
import os
from PIL import Image
import tqdm
from sklearn.model_selection import train_test_split
import cv2
from sklearn.utils import shuffle
import tensorflow as tf

X_train = []
Y_train = []
image_size = 150
labels = ['glioma_tumor','meningioma_tumor','no_tumor','pituitary_tumor']
for i in labels:
    folderPath = os.path.join('/kaggle/input/brain-tumor-classification-mri/Training',i)
    for j in os.listdir(folderPath):
        img = cv2.imread(os.path.join(folderPath,j))
        img = cv2.resize(img,(image_size,image_size))
        X_train.append(img)
        Y_train.append(i)
        
for i in labels:
    folderPath = os.path.join('/kaggle/input/brain-tumor-classification-mri/Testing',i)
    for j in os.listdir(folderPath):
        img = cv2.imread(os.path.join(folderPath,j))
        img = cv2.resize(img,(image_size,image_size))
        X_train.append(img)
        Y_train.append(i)

X_train = np.array(X_train)
Y_train = np.array(Y_train)

print("Total images:", len(X_train))
print("Image shape:", X_train[0].shape)
print("Unique labels:", np.unique(Y_train))

df = pd.DataFrame(Y_train, columns=['Tumor_Type'])
print("\nClass Distribution:")
print(df['Tumor_Type'].value_counts())

plt.figure(figsize=(8,5))
sns.countplot(x='Tumor_Type', data=df, palette='coolwarm')
plt.title('Distribution of Brain Tumor Classes')
plt.xlabel('Tumor Type')
plt.ylabel('Count')
plt.show()

plt.figure(figsize=(10,10))
for i, label in enumerate(labels):
    plt.subplot(2,2,i+1)
    indices = np.where(Y_train == label)[0]
    if len(indices) > 0:
        sample = random.choice(indices)
        plt.imshow(cv2.cvtColor(X_train[sample], cv2.COLOR_BGR2RGB))
        plt.title(label)
        plt.axis('off')
    else:
        plt.text(0.3, 0.5, f"No images for {label}", fontsize=12)
        plt.axis('off')
plt.suptitle("Random Samples from Each Brain Tumor Class", fontsize=16)
plt.show()


X_train,Y_train = shuffle(X_train,Y_train,random_state=101)
X_train.shape


X_train,X_test,y_train,y_test = train_test_split(X_train,Y_train,test_size=0.1,random_state=101)

y_train_new = []
for i in y_train:
    y_train_new.append(labels.index(i))
y_train=y_train_new
y_train = tf.keras.utils.to_categorical(y_train)

y_test_new = []
for i in y_test:
    y_test_new.append(labels.index(i))
y_test=y_test_new
y_test = tf.keras.utils.to_categorical(y_test)

model = Sequential()
model.add(Conv2D(32,(3,3),activation = 'relu',input_shape=(150,150,3)))
model.add(Conv2D(64,(3,3),activation='relu', kernel_regularizer=tf.keras.regularizers.L2(l2=0.007)))
model.add(MaxPooling2D(2,2))
model.add(Dropout(0.2))
model.add(Conv2D(64,(3,3),activation='relu'))
model.add(Conv2D(64,(3,3),activation='relu'))
model.add(Dropout(0.25))
model.add(MaxPooling2D(2,2))
model.add(Dropout(0.2))
model.add(Conv2D(128,(3,3),activation='relu'))
model.add(Conv2D(128,(3,3),activation='relu'))
model.add(Conv2D(128,(3,3),activation='relu', kernel_regularizer=tf.keras.regularizers.L2(l2=0.005)))
model.add(MaxPooling2D(2,2))
model.add(Dropout(0.35))
model.add(Conv2D(128,(3,3),activation='relu'))
model.add(Conv2D(256,(3,3),activation='relu'))
model.add(MaxPooling2D(2,2))
model.add(Dropout(0.3))
model.add(Flatten())
model.add(Dense(512,activation = 'relu'))
model.add(Dense(512,activation = 'relu', kernel_regularizer=tf.keras.regularizers.L2(l2=0.003)))
model.add(Flatten())
model.add(Dense(50,activation='relu'))
model.add(Dropout(0.25))
model.add(Dense(4,activation='softmax'))

model.summary()

model.compile(loss='categorical_crossentropy',
              optimizer=tf.keras.optimizers.AdamW(),
              metrics=['accuracy'])
history = model.fit(X_train,y_train,epochs=25,validation_split=0.1)

#model.save('braintumor.keras')

acc = history.history['accuracy']
val_acc = history.history['val_accuracy']
epochs = range(len(acc))
fig = plt.figure(figsize=(14,7))
plt.plot(epochs,acc,'r',label="Training Accuracy")
plt.plot(epochs,val_acc,'b',label="Validation Accuracy")
plt.legend(loc='upper left')
plt.show()



loss = history.history['loss']
val_loss = history.history['val_loss']
epochs = range(len(loss))
fig = plt.figure(figsize=(14,7))
plt.plot(epochs,loss,'r',label="Training loss")
plt.plot(epochs,val_loss,'b',label="Validation loss")
plt.legend(loc='upper left')
plt.show()

test_loss, test_acc = model.evaluate(X_test, y_test)
print(f"Test Accuracy: {test_acc*100:.2f}%")
print(f"Test Loss: {test_loss:.4f}")

from sklearn.metrics import classification_report, confusion_matrix

# Predictions
y_pred = model.predict(X_test)
y_pred_classes = np.argmax(y_pred, axis=1)
y_true = np.argmax(y_test, axis=1)

print(classification_report(y_true, y_pred_classes, target_names=labels))

img = cv2.imread('../input/brain-tumor-classification-mri/Training/pituitary_tumor/p (107).jpg')
img = cv2.resize(img,(150,150))
img_array = np.array(img)
img_array.shape

img_array = img_array.reshape(1,150,150,3)
img_array.shape

from tensorflow.keras.preprocessing import image
img = image.load_img('../input/brain-tumor-classification-mri/Training/pituitary_tumor/p (107).jpg')
plt.imshow(img,interpolation='nearest')
plt.show()

a=model.predict(img_array)
indices = a.argmax()
indices

model.save('braintumor_20nov2025_retry.keras')

print("Model saved successfully.")



