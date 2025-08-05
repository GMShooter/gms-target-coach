
# GMShooter - AI-Powered Shooting Performance Analyzer

GMShooter is a virtual shooting coach that transforms amateur shooters into precision marksmen. It uses AI-powered video analysis to provide real-time, data-driven feedback on shooting performance.

**Main Analysis Dashboard:**
![Main Analysis Dashboard showing target visualization and session metrics](https://github.com/user-attachments/assets/3a544660-0c15-4eb8-82d5-375a1c13e520)

**Detailed Shot-by-Shot Table:**
![image](https://github.com/user-attachments/assets/c75d04c1-a75c-41b9-b394-088ed4b2611d)


**AI Coach's Recommendations:**
![image](https://github.com/user-attachments/assets/ea54d469-276f-49dc-9def-4dddd92672ce)

## 🎯 Core Value Proposition

This application serves as a SaaS platform to democratize professional shooting instruction through cutting-edge AI technology. It provides shooters with instant, actionable insights that would otherwise require a personal coach, helping them identify and correct fundamental issues to improve accuracy and consistency.

**Target Market:** Competitive shooters, law enforcement training facilities, and commercial shooting ranges.

## ✨ Key Features

*   **AI Video Analysis:** Upload `.mp4` videos of shooting sessions for instant, automated analysis.
*   **Precision Shot Detection:** The AI identifies each bullet impact with high accuracy, determines its score based on a standard 10-ring target, and notes its position.
*   **Interactive Target Visualization:** An animated circular target graph displays the last 10 shots in sequence, with color-coding for score and a pulse effect on the most recent shot.
*   **Professional Performance Metrics:** Tracks key metrics used by coaches, including **Accuracy %**, **Group Size (mm)**, **Total Score**, and **Directional Trend**.
*   **Expert Coaching Feedback:** Generates personalized coaching advice and identifies patterns (e.g., trigger jerk, flinching) based on the shot data.
*   **Secure Data Storage:** All session and shot data is securely stored, allowing users to track their progress over time.

## 🛠️ Technology Stack

*   **Frontend:** React, TypeScript, Vite, Tailwind CSS, Shadcn/UI
*   **Backend:** Supabase (PostgreSQL Database, Edge Functions, Storage, Auth)
*   **AI Engine:** Google Gemini Pro Vision API

<details>
<summary><strong>Technical Implementation Highlights</strong></summary>

-   **Database Schema:** Created `sessions` and `shots` tables in Supabase with appropriate Row Level Security (RLS) policies.
-   **Edge Function (`analyze-video`):** A serverless function handles video processing by calling the Gemini API to analyze shot patterns and returns structured JSON data.
-   **Storage:** A dedicated Supabase Storage bucket is configured with security policies to handle user video uploads.
-   **Real Data Integration:** All frontend components are now fully dynamic, fetching and displaying real data from Supabase instead of mock data.
-   **Dynamic UI & Animations:** The UI features loading skeletons, animated shot markers appearing sequentially on the target, and numbers that count up for a polished user experience.

</details>
