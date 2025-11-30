# Awtad – Smart EMG-Based Muscle Activation Imbalance Detection System

Graduation Project – 2025-GP1-GroupNumber25  
Department of Information Technology – King Saud University  


## 1. Project Overview

Sports performance and injury prevention depend on **balanced muscle activation**.  
Hidden muscle imbalances can quietly increase joint overload, reduce stability, and lead to future
injuries long before pain appears.

**Awtad** (أوتاد) is a **wireless sEMG-based muscle activity analysis system** that:
- Collects surface EMG (sEMG) signals from lower-limb muscles.
- Processes and analyzes the signals to detect **left–right muscle imbalance**.
- Presents clear, easy-to-understand feedback for athletes and specialists.

The system is designed **for monitoring only**, not for diagnosis. Proper sensor placement and
**supervised use** are required to ensure accurate measurements and safe interpretation of results.


## 2. Problem & Proposed Solution

### Problem
- Even small muscle imbalances can accumulate and cause injuries, pain, and movement problems.
- Existing EMG tools are mostly **clinical/lab-based** (wired systems, complex setup).

### Solution
Awtad proposes a **wireless EMG solution** built around:

- **Delsys Trigno Lite** system with **Avanti sensors**.
- A preprocessing and ML pipeline that classifies movements as **balanced vs. imbalanced**.
- A simple web interface to visualize results after each guided exercise.

## 3. System Components

### 3.1 Hardware

- **Trigno Lite Wireless Biofeedback System**  
  - Trigno Avanti surface EMG sensors  
  - Trigno USB receiver + charging cradle  
  - Trigno Discover software  
  - Official Delsys API

The device is provided by the **Innovation and Interaction Technology (IIT) Lab,
Imam Mohammad Ibn Saud Islamic University**.

### 3.2 Dataset 

For Sprint-1, we use the open-access dataset:

> **“A Human Lower-Limb Biomechanics and Wearable Sensors Dataset during Cyclic and Non-Cyclic Activities”**

This dataset includes synchronized EMG, IMU, motion capture, and ground reaction forces
for multiple cyclic and non-cyclic tasks (squats, jumps, stair climbing, etc.) with
bilateral lower-limb recordings.

### 3.3 High-Level Architecture

Main subsystems:

1. **Sensor Input (Trigno Avanti)**  
   Captures raw sEMG signals from the athlete.

2. **Host PC + USB Adapter (Delsys API)**  
   Streams time-synchronized EMG data into the software using the official API.

3. **Preprocessing & ML Model**  
   - Cleans the signals.  
   - Extracts features (RMS, Symmetry Index).  
   - Classifies each trial as **balanced** or **imbalanced**.

4. **Database**  
   Stores processed results, session metadata, and history.

5. **Web Dashboard**  
   Displays imbalance results and session history in a simple athlete-friendly interface.

## 4. Technologies Used

- **Language / ML Stack (GP1)**  
  - Python, Jupyter / Google Colab  
  - NumPy, Pandas, SciPy  

- **Future Web Stack (GP2, planned)**  
  - Web framework (HTML+JS)  
  - Backend for API and database storage

- **Tools & Platforms**  
  - Jira & Confluence (Scrum management, documentation)  
  - Git & GitHub (version control)  
  - Delsys Trigno Lite & Avanti sensors (hardware)
