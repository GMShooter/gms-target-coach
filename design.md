
### Principal System Design: A Data-Centric, State-Driven Architecture

The core principle is simple: **The UI is a function of the state.** The application's main job is to acquire data, run it through an analysis pipeline, update a central state object, and then re-render the UI based on the new state. Streamlit is designed to work exactly this way.

#### System Components

1.  **State Management (`st.session_state`):** The single source of truth. It's a persistent dictionary holding the entire history of the session.
    *   `shots`: A list of all unique shots detected, with their properties (coordinates, frame index, timestamp).
    *   `frames`: A log of all analyzed frames, including the raw detections for each.
    *   `metrics`: A dictionary holding the latest calculated SOTA report.
    *   `ui_controls`: Current settings, like which frame is being viewed.

2.  **Data Acquisition Layer (`data_source.py`):** A module responsible for getting frames. It will have two modes, easily switchable.
    *   `get_local_frame(index)`: Loads a frame from the `test_frames/` directory.
    *   `get_live_frame()`: Contains the `api_frame_latest` logic from `ngrok_server.py`. This clear separation means 90% of your development can happen offline.

3.  **Analysis Engine (`analysis.py`):** The heart of the system. This is a pure, stateless module. It takes data from the state and returns a comprehensive report. It *never* modifies the state directly.
    *   **Computer Vision Service:** A function that calls the Roboflow API. It takes image data and returns a list of detections.
    *   **Sequential Analysis Service:** A function that compares the latest detections to the historical list of shots to identify *new* shots.
    *   **Metrics Calculation Service:** A function that takes the complete list of unique shots and calculates all SOTA metrics.

4.  **UI/Presentation Layer (`app.py`):** The main Streamlit application. Its only job is to orchestrate the other components and display the results from the state. It handles user input (button clicks) and renders charts, metrics, and annotated images.

#### Data Flow (The Reactive Loop)

This is the sequence of events when a user clicks "Analyze Next Frame":

1.  **Event Trigger:** `app.py` detects the button press.
2.  **Data Acquisition:** `app.py` calls the appropriate function from `data_source.py` to get a new frame.
3.  **Computer Vision:** `app.py` sends the frame data to the `Analysis Engine`'s Roboflow service.
4.  **Sequential Analysis:** `app.py` passes the new detections and the current `state.shots` to the `Analysis Engine`'s sequential service. A list of *newly identified shots* is returned.
5.  **State Update:** `app.py` appends the new shots to the `st.session_state.shots` list. This is the *only* place the state is mutated.
6.  **Metrics Recalculation:** `app.py` passes the *entire, updated* `st.session_state.shots` list to the `Analysis Engine`'s metrics service. A new, comprehensive `metrics` dictionary is returned.
7.  **State Update (Metrics):** `app.py` replaces `st.session_state.metrics` with the new dictionary.
8.  **Automatic Re-render:** Streamlit detects the change in `session_state` and automatically reruns `app.py` from the top. The UI components now read the new data from the state and display the updated images, tables, and metrics.

This design is robust because the analysis is **idempotent**: you can re-run the calculation on the same set of shots and always get the same result.

---

### SOTA Calculations: The Metrics That Matter

Here is a menu of calculations to implement in your `analysis.py` module. We'll categorize them from basic to advanced. You'll need libraries like `numpy`, `pandas`, and `scipy`.

Let's assume you have a list of all shot coordinates, e.g., `shots = [(x1, y1), (x2, y2), ...]`.

#### Category 1: Group Characteristics (Accuracy & Precision)

These metrics describe the overall shot group.

| Metric | What It Is | How to Calculate | Why It's SOTA |
| :--- | :--- | :--- | :--- |
| **Mean Point of Impact (MPI)** | The geometric center of the shot group. The single point that best represents the group. | `mpi_x = np.mean([s[0] for s in shots])`<br>`mpi_y = np.mean([s[1] for s in shots])` | The fundamental measure of **accuracy**. It shows where the group is centered relative to the bullseye. |
| **Extreme Spread** | The distance between the two farthest shots in the group. The simplest measure of group size. | Calculate the pairwise Euclidean distance between all shots. The maximum value is the Extreme Spread. `scipy.spatial.distance.pdist` is perfect for this. | A universally understood measure of **precision**. Easy to calculate and communicate. |
| **Group Radius (Mean Radius)** | The average distance of each shot from the Mean Point of Impact (MPI). | For each shot, calculate its Euclidean distance to the MPI. The average of these distances is the Mean Radius. | A more statistically robust measure of **precision** than Extreme Spread, as it's less influenced by a single wild outlier. |
| **Convex Hull Area** | The area of the smallest polygon that encloses all the shots. | Use `scipy.spatial.ConvexHull`. It returns an object with an `area` attribute representing the area of the polygon formed by the outermost shots. | Provides a 2D measure of group dispersion. Excellent for visualizing the group's footprint and for advanced shape analysis. |
| **Group Shape (Standard Deviation)** | The spread of shots along the horizontal (X) and vertical (Y) axes. | `std_dev_x = np.std([s[0] for s in shots])`<br>`std_dev_y = np.std([s[1] for s in shots])` | Reveals shooter tendencies. A larger `std_dev_x` might indicate trigger control issues, while a larger `std_dev_y` could relate to breathing. This is diagnostic gold. |

#### Category 2: Sequential Analysis (Shot-to-Shot Dynamics)

These metrics analyze the order in which shots were fired. This is where you get deep insights.

| Metric | What It Is | How to Calculate | Why It's SOTA |
| :--- | :--- | :--- | :--- |
| **First Shot Analysis** | The location of the first shot relative to the final group's MPI. | Record the coordinates of the very first shot. After firing the group, compare its position to the final MPI. | Critically important for cold bore shots or measuring a shooter's ability to settle in. A large displacement indicates a need for warm-up. |
| **Shot-to-Shot Displacement** | The average distance between consecutive shots. | Calculate the Euclidean distance between shot 1 and 2, shot 2 and 3, etc. Average these distances. | Measures the consistency of the shooter's process (recoil management, sight picture, etc.) between shots. A low value is highly desirable. |
| **Group Centroid Drift** | A plot showing how the MPI moves as each new shot is added to the group. | Calculate MPI for `[shot1]`, then `[shot1, shot2]`, then `[shot1, shot2, shot3]`, and so on. Plot this sequence of MPI coordinates. | Visualizes how the group "settles." A group that spirals or walks in one direction is a sign of a systematic issue (e.g., barrel heating, shooter fatigue). |
| **Flyer Detection** | Identifying shots that are statistical outliers from the main group. | A simple method: any shot that is more than 2 or 3 standard deviations away from the MPI is a potential flyer. More advanced methods use clustering algorithms like DBSCAN. | Automatically flags shots that were likely due to shooter error, not the inherent precision of the system. This allows for "what if" analysis (e.g., "group size without the flyer"). |

#### Category 3: Scoring (Performance Measurement)

These are based on the target's scoring rings. This requires you to know the center of the target and the radius of each ring in pixels.

| Metric | What It Is | How to Calculate | Why It's SOTA |
| :--- | :--- | :--- | :--- |
| **Score per Shot** | The point value of each individual shot based on the ring it landed in. | For each shot, calculate its distance from the target's center. Use a lookup table (e.g., if distance < 20px, score=10; if < 40px, score=9) to assign a point value. | The most direct measure of performance against a standard. |
| **Total Score** | The sum of all individual shot scores. | `total_score = sum([score_for_shot_1, score_for_shot_2, ...])` | The final performance metric. Essential for tracking progress and for any competitive simulation. |

By implementing these three categories of calculations, your prototype will go far beyond simple "hole counting" and provide the kind of deep, actionable insights that define a State-of-the-Art system.