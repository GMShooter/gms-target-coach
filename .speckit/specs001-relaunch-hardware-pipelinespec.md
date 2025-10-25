\# Feature Specification: GMShoot v2 Relaunch: Hardware-First Analysis Pipeline



\*\*Feature Branch\*\*: `001-relaunch-hardware-pipeline`

\*\*Created\*\*: 2023-10-26

\*\*Status\*\*: Approved

\*\*Input\*\*: User description: "i want your advices as official files .md - i delete old files and listen to your plan. i also dont want mock tests mock implemenation - i want clear design."



\## User Scenarios \& Testing \*(mandatory)\*# Feature Specification: GMShoot v2 Relaunch: Hardware-First Analysis Pipeline



\*\*Feature Branch\*\*: `001-relaunch-hardware-pipeline`

\*\*Created\*\*: 2023-10-26

\*\*Status\*\*: Approved

\*\*Input\*\*: User description: "i want your advices as official files .md - i delete old files and listen to your plan. i also dont want mock tests mock implemenation - i want clear design."



\## User Scenarios \& Testing \*(mandatory)\*



\### User Story 1 - Connect to Hardware and View First Analysis (Priority: P1)



As a user, I want to scan a QR code to securely connect my app to my Raspberry Pi hardware. Once connected, I want to see a live video feed and have the first detected shot automatically analyzed by Roboflow, with the result (location and score) displayed as an overlay on the image.



\*\*Why this priority\*\*: This is the core Minimum Viable Product (MVP). It validates the entire technical architecture from end-to-end: hardware connection, secure API proxy, and AI analysis. If this works, the project is viable.



\*\*Independent Test\*\*: The entire journey can be tested by starting the app, scanning a code, and verifying that an image appears with an analysis overlay. It delivers the fundamental value proposition of the application.



\*\*Acceptance Scenarios\*\*:

1\.  \*\*Given\*\* the application is open on the "Connect Hardware" page, \*\*When\*\* I scan a valid GMShoot QR code, \*\*Then\*\* I am redirected to the "Live Session" page and see a real-time video feed.

2\.  \*\*Given\*\* I am viewing the live feed, \*\*When\*\* the hardware detects a shot and a frame is sent for analysis, \*\*Then\*\* I see a visual overlay on the image indicating the shot's location and score within 2 seconds.



---



\### User Story 2 - Manage and Persist a Full Shooting Session (Priority: P2)



As a user, I want to be able to start and stop a formal shooting session. During the session, I want every analyzed shot to be recorded and numbered sequentially. When I stop the session, all shot data should be saved to my account.



\*\*Why this priority\*\*: This elevates the application from a technical demo to a useful tool for tracking performance within a single practice.



\*\*Independent Test\*\*: A user can start a session, generate several shots (which are counted and displayed in a list), stop the session, and the application confirms it's saved.



\*\*Acceptance Scenarios\*\*:

1\.  \*\*Given\*\* I am on the "Live Session" page, \*\*When\*\* I click the "Start Session" button, \*\*Then\*\* a new session is created and the shot counter is set to 1.

2\.  \*\*Given\*\* a session is active, \*\*When\*\* multiple shots are detected and analyzed, \*\*Then\*\* each shot is added to a real-time log with its number and score.

3\.  \*\*Given\*\* a session is active, \*\*When\*\* I click the "End Session" button, \*\*Then\*\* the session is marked as complete and all associated shot data is permanently saved.



---



\### User Story 3 - Review Past Session Performance (Priority: P3)



As a user, I want to view a history of all my past shooting sessions. I want to be able to select a specific session and see a detailed report of every shot, including its location on the target and its score.



\*\*Why this priority\*\*: This provides long-term value, allowing users to track their progress over time, which is a key retention feature.



\*\*Independent Test\*\*: A user can navigate to a "History" page, see a list of completed sessions, and click one to view its detailed shot-by-shot breakdown.



\*\*Acceptance Scenarios\*\*:

1\.  \*\*Given\*\* I have completed at least one session, \*\*When\*\* I navigate to the "/history" page, \*\*Then\*\* I see a list of my past sessions with dates and summary statistics.

2\.  \*\*Given\*\* I am viewing the session history list, \*\*When\*\* I click on a specific session, \*\*Then\*\* I am taken to a detailed report page showing a visual representation of all shots on a target and a table of individual shot data.



---



\### Edge Cases



\-   \*\*Hardware Disconnection\*\*: The app must detect when the connection to the Pi server is lost and display a clear "Reconnecting..." status to the user.

\-   \*\*Invalid QR Code\*\*: If a non-GMShoot QR code is scanned, the app must show an error message: "Invalid QR Code. Please scan the code from your GMShoot hardware."

\-   \*\*Roboflow API Failure\*\*: If the analysis function fails, the UI must show a "Analysis failed for last shot" message without crashing the live feed.

\-   \*\*No Shots Detected\*\*: The application should remain in a "listening" state if the live feed is active but no shots are being fired.



\## Requirements \*(mandatory)\*



\### Functional Requirements



\-   \*\*FR-001\*\*: System MUST connect to hardware via QR code parsing an ngrok URL.

\-   \*\*FR-002\*\*: System MUST display a real-time video feed from the connected hardware.

\-   \*\*FR-003\*\*: System MUST send frame data securely to a Supabase Edge Function for analysis.

\-   \*\*FR-004\*\*: The Supabase function MUST act as a proxy, calling the Roboflow API with a secret key. It MUST NOT expose the API key to the client.

\-   \*\*FR-005\*\*: System MUST render Roboflow's JSON analysis response as a visual overlay on the video feed.

\-   \*\*FR-006\*\*: Users MUST be able to start, stop, and end a shooting session.

\-   \*\*FR-007\*\*: System MUST persist all shot data from a completed session to the Supabase database.

\-   \*\*FR-008\*\*: Users MUST be able to view a historical list of their past sessions.

\-   \*\*FR-009\*\*: The UI MUST be completely rebuilt using MagicUI and shadcn/ui to resolve all known visual bugs (overlapping text, poor layout).

\-   \*\*FR-010\*\*: All identified Supabase security and performance warnings MUST be resolved.



\### Key Entities



\-   \*\*User\*\*: Represents a registered user of the application. (Managed by Supabase Auth).

\-   \*\*Session\*\*: Represents a single shooting practice. Attributes: `user\_id`, `start\_time`, `end\_time`.

\-   \*\*Shot\*\*: Represents a single shot within a session. Attributes: `session\_id`, `shot\_number`, `score`, `coordinates`, `timestamp`, `raw\_analysis\_data`.



\## Success Criteria \*(mandatory)\*



\### Measurable Outcomes



\-   \*\*SC-001\*\*: End-to-end latency from shot detection on hardware to analysis display in the UI is under 2 seconds.

\-   \*\*SC-002\*\*: The new UI, built with MagicUI, achieves a Lighthouse score of 90+ for Performance and Accessibility.

\-   \*\*SC-003\*\*: All critical Supabase security and performance warnings are resolved and no longer appear in the Supabase dashboard.

\-   \*\*SC-004\*\*: The application can handle a 30-minute continuous session without crashing or significant performance degradation.



\### User Story 1 - Connect to Hardware and View First Analysis (Priority: P1)



As a user, I want to scan a QR code to securely connect my app to my Raspberry Pi hardware. Once connected, I want to see a live video feed and have the first detected shot automatically analyzed by Roboflow, with the result (location and score) displayed as an overlay on the image.



\*\*Why this priority\*\*: This is the core Minimum Viable Product (MVP). It validates the entire technical architecture from end-to-end: hardware connection, secure API proxy, and AI analysis. If this works, the project is viable.



\*\*Independent Test\*\*: The entire journey can be tested by starting the app, scanning a code, and verifying that an image appears with an analysis overlay. It delivers the fundamental value proposition of the application.



\*\*Acceptance Scenarios\*\*:

1\.  \*\*Given\*\* the application is open on the "Connect Hardware" page, \*\*When\*\* I scan a valid GMShoot QR code, \*\*Then\*\* I am redirected to the "Live Session" page and see a real-time video feed.

2\.  \*\*Given\*\* I am viewing the live feed, \*\*When\*\* the hardware detects a shot and a frame is sent for analysis, \*\*Then\*\* I see a visual overlay on the image indicating the shot's location and score within 2 seconds.



---



\### User Story 2 - Manage and Persist a Full Shooting Session (Priority: P2)



As a user, I want to be able to start and stop a formal shooting session. During the session, I want every analyzed shot to be recorded and numbered sequentially. When I stop the session, all shot data should be saved to my account.



\*\*Why this priority\*\*: This elevates the application from a technical demo to a useful tool for tracking performance within a single practice.



\*\*Independent Test\*\*: A user can start a session, generate several shots (which are counted and displayed in a list), stop the session, and the application confirms it's saved.



\*\*Acceptance Scenarios\*\*:

1\.  \*\*Given\*\* I am on the "Live Session" page, \*\*When\*\* I click the "Start Session" button, \*\*Then\*\* a new session is created and the shot counter is set to 1.

2\.  \*\*Given\*\* a session is active, \*\*When\*\* multiple shots are detected and analyzed, \*\*Then\*\* each shot is added to a real-time log with its number and score.

3\.  \*\*Given\*\* a session is active, \*\*When\*\* I click the "End Session" button, \*\*Then\*\* the session is marked as complete and all associated shot data is permanently saved.



---



\### User Story 3 - Review Past Session Performance (Priority: P3)



As a user, I want to view a history of all my past shooting sessions. I want to be able to select a specific session and see a detailed report of every shot, including its location on the target and its score.



\*\*Why this priority\*\*: This provides long-term value, allowing users to track their progress over time, which is a key retention feature.



\*\*Independent Test\*\*: A user can navigate to a "History" page, see a list of completed sessions, and click one to view its detailed shot-by-shot breakdown.



\*\*Acceptance Scenarios\*\*:

1\.  \*\*Given\*\* I have completed at least one session, \*\*When\*\* I navigate to the "/history" page, \*\*Then\*\* I see a list of my past sessions with dates and summary statistics.

2\.  \*\*Given\*\* I am viewing the session history list, \*\*When\*\* I click on a specific session, \*\*Then\*\* I am taken to a detailed report page showing a visual representation of all shots on a target and a table of individual shot data.



---



\### Edge Cases



\-   \*\*Hardware Disconnection\*\*: The app must detect when the connection to the Pi server is lost and display a clear "Reconnecting..." status to the user.

\-   \*\*Invalid QR Code\*\*: If a non-GMShoot QR code is scanned, the app must show an error message: "Invalid QR Code. Please scan the code from your GMShoot hardware."

\-   \*\*Roboflow API Failure\*\*: If the analysis function fails, the UI must show a "Analysis failed for last shot" message without crashing the live feed.

\-   \*\*No Shots Detected\*\*: The application should remain in a "listening" state if the live feed is active but no shots are being fired.



\## Requirements \*(mandatory)\*



\### Functional Requirements



\-   \*\*FR-001\*\*: System MUST connect to hardware via QR code parsing an ngrok URL.

\-   \*\*FR-002\*\*: System MUST display a real-time video feed from the connected hardware.

\-   \*\*FR-003\*\*: System MUST send frame data securely to a Supabase Edge Function for analysis.

\-   \*\*FR-004\*\*: The Supabase function MUST act as a proxy, calling the Roboflow API with a secret key. It MUST NOT expose the API key to the client.

\-   \*\*FR-005\*\*: System MUST render Roboflow's JSON analysis response as a visual overlay on the video feed.

\-   \*\*FR-006\*\*: Users MUST be able to start, stop, and end a shooting session.

\-   \*\*FR-007\*\*: System MUST persist all shot data from a completed session to the Supabase database.

\-   \*\*FR-008\*\*: Users MUST be able to view a historical list of their past sessions.

\-   \*\*FR-009\*\*: The UI MUST be completely rebuilt using MagicUI and shadcn/ui to resolve all known visual bugs (overlapping text, poor layout).

\-   \*\*FR-010\*\*: All identified Supabase security and performance warnings MUST be resolved.



\### Key Entities



\-   \*\*User\*\*: Represents a registered user of the application. (Managed by Supabase Auth).

\-   \*\*Session\*\*: Represents a single shooting practice. Attributes: `user\_id`, `start\_time`, `end\_time`.

\-   \*\*Shot\*\*: Represents a single shot within a session. Attributes: `session\_id`, `shot\_number`, `score`, `coordinates`, `timestamp`, `raw\_analysis\_data`.



\## Success Criteria \*(mandatory)\*



\### Measurable Outcomes



\-   \*\*SC-001\*\*: End-to-end latency from shot detection on hardware to analysis display in the UI is under 2 seconds.

\-   \*\*SC-002\*\*: The new UI, built with MagicUI, achieves a Lighthouse score of 90+ for Performance and Accessibility.

\-   \*\*SC-003\*\*: All critical Supabase security and performance warnings are resolved and no longer appear in the Supabase dashboard.

\-   \*\*SC-004\*\*: The application can handle a 30-minute continuous session without crashing or significant performance degradation.

