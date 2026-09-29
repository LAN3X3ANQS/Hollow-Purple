# 🟣 Hollow Purple

A browser-based computer vision experiment inspired by **Gojo Satoru's Hollow Purple** from *Jujutsu Kaisen*.

The project uses a webcam to track hand movements and recognize a sequence of gestures. When the expected sequence is detected, the application triggers a visual Hollow Purple effect on the screen.

## How It Works

The application runs directly in the browser and combines:

* **HTML** — page structure
* **CSS** — interface and visual effects
* **JavaScript** — application logic
* **MediaPipe Hand Landmarker** — real-time hand tracking
* **Canvas** — rendering the visual effect
* **Webcam** — live video input

The basic interaction is:

```text
Webcam
   ↓
Hand detection
   ↓
Hand landmarks
   ↓
Gesture recognition
   ↓
Gesture sequence
   ↓
💜 Hollow Purple
```

## Gesture Sequence

The project is designed around a simplified version of Gojo's hand-motion sequence.

```text
🤘
 ↓
🤏
 ↓
🫰 / flick
 ↓
💜 HOLLOW PURPLE
```

The application checks the detected hand positions and movements rather than simply triggering the effect from a button.

## Project Structure

```text
Hollow-Purple/
│
├── index.html
├── style.css
├── script.js
└── README.md
```

## Running the Project

Because the project uses the webcam and browser-based computer vision, it should be run through a local development server rather than opened directly as a `file://` page.

For example, with VS Code's Live Server extension:

1. Open the project in VS Code.
2. Start the local server.
3. Allow the browser to access the webcam.
4. Perform the gesture sequence.
5. Watch the effect trigger.

## What I Learned

This project was built as an experiment in combining software with real-world input.

It helped me practice:

* JavaScript event handling
* Browser APIs
* Webcam access
* Real-time computer vision
* Hand landmark detection
* Gesture recognition
* Canvas rendering
* Working with external libraries
* Turning sensor-like input into a visual response

## Why I Built It

The goal wasn't to build a production application.

It was an experiment:

> **What happens when I take a real-world physical interaction and turn it into a software-controlled visual effect?**

It is also a small step toward understanding how computer vision can interact with hardware and embedded systems later on.

## Status

🟢 **Experimental / Personal Project**

The project is functional but remains a learning experiment. Gesture detection and visual effects can be improved further.

## Future Ideas

* Improve gesture recognition accuracy.
* Add more detailed hand-motion tracking.
* Make the effect respond to the speed and direction of the movement.
* Add sound effects.
* Improve the Hollow Purple visual.
* Experiment with other gesture-controlled effects.
* Explore connecting computer-vision input to physical hardware.

---

**Built as an experiment in computer vision, web development, and interactive systems.**
