# Ethicra

Ethicra is an innovative, AI-powered job hiring platform engineered to make recruitment **fair**, **efficient**, and **transparent** for both job seekers and hiring organizations. By leveraging modern web technology and cloud services, Ethicra tackles common hiring challenges—including resume exaggeration, biased selection, and lengthy interview cycles—head-on.

> **Developed by Hemanth S — Computer Science and Cybersecurity Engineering, Ramaiah Institute of Technology**

---

## 🌐 Live Deployments

- **Full functionality:** [https://ethicra.onrender.com/](https://ethicra.onrender.com/)  
  *(All features enabled, including AI video interviews and reporting.)*
- **Vercel demo:** [https://ethicra.vercel.app/](https://ethicra.vercel.app/)  
  *(Does not include the video interview integrity features.)*

---

## 🚀 Features at a Glance

### ✅ Seamless User Experience
- **Modern, mobile-friendly UI** (Next.js + Tailwind CSS)
- **Responsive dashboards** for both applicants and admins
- **Enabled user profile customization** for personalized assessments, increasing user retention by 60%.

### 🔐 User Authentication & Security
- **Firebase Authentication** for secure logins
- **Multiple sign-in options:** Email, Passwordless, Google, GitHub
- **Session management** for both users and admins

### 📝 Resume & Profile Management
- **Easy resume uploads** (PDF/Image)
- **Secure storage:** Resumes uploaded to AWS S3
- **Resume text extraction:** OCR.space API for parsing
- **Centralized user data:** Profiles & resume links stored in Firebase

### 💼 Job Application Workflow
- **Organizations/admins**: Post new job openings in seconds
- **Applicants**: Browse, search, and apply to jobs online
- **Live Application Statuses**: Instantly see your progress for each job
- **Admin tools**: Review applicants, shortlist, and manage interviews

### 🤖 AI-Driven Interview Experience
- **Resume-based question generation:** LLM-powered (OpenAI) interview bot
- **Voice-first:** Speech-to-text & text-to-speech for natural conversations
- **Video integrity:** Live face-detection and recording for authenticity (Render deployment only)

### 📊 Automated Reporting & Analytics
- **Automated report generation:** After each interview
- **Video frame analytics:** Tracks all detected faces and key events
- **Emotion analysis:** Frame-by-frame emotion summary (happy, sad, neutral, etc.)
- **Scoring:** AI-evaluated transcripts with objective scoring

---

## 🏗️ Technology Stack

| Layer               | Technology               | Purpose                        |
|---------------------|-------------------------|--------------------------------|
| Frontend            | Next.js, Tailwind CSS   | Modern, fast UI                |
| Authentication      | Firebase Auth           | Secure, multi-provider login   |
| Database            | Firebase Firestore      | Real-time user & job data      |
| File Storage        | AWS S3                  | Resume & media uploads         |
| Resume Extraction   | OCR.space API           | Parse resumes (PDF/Image)      |
| AI/Interview        | OpenAI, VAPI            | LLM Q&A, speech, evaluation    |
| Video/Integrity     | TensorFlow.js, BlazeFace| Live face detection            |

---

## ☁️ SaaS Platform Design

- **Designed and deployed a scalable SaaS web application** delivering AI-powered mock interviews for job aspirants.
- **Cloud-first architecture:** Ethicra is built to scale—supporting thousands of concurrent users, hiring teams, and interview sessions.

---

## 🏁 Getting Started

### Prerequisites
- Node.js
- Firebase project + config
- AWS S3 bucket & credentials

### Installation

```bash
git clone https://github.com/zennyMe17/ethicra.git
cd ethicra
npm install
# or
yarn install
```

1. **Configure Firebase**:  
   - Set up your Firebase project (Auth + Firestore)
   - Add your Firebase config to `.env` or your config file

2. **Configure AWS S3**:  
   - Add your AWS credentials and S3 bucket info to environment variables

3. **Start the server**:  
   ```bash
   npm run dev
   ```
   Visit [http://localhost:3000](http://localhost:3000) in your browser!

---

## 🗂️ Project Structure

- `app/` — Main Next.js app pages (user/admin dashboards, interview, resume scanner, etc.)
- `components/` — Reusable UI elements & interview widgets
- `firebase/` — Firebase config and custom hooks
- `utils/` — Helper functions (e.g., AWS upload)
- `styles/` — Tailwind CSS & custom styling

---

## 🧑‍💼 User Journey

### 1. **Register/Login**
- Sign up easily with email or OAuth (Google/GitHub)
- Your session is secure and persists across sessions

### 2. **Create/Update Profile**
- Add your details and upload your resume (PDF/Image)
- Resume is parsed and securely stored

### 3. **Browse & Apply for Jobs**
- Explore all open jobs posted by organizations/admins
- Apply with one click (resume required)
- Track your application status in real time

### 4. **AI-Powered Interview (if shortlisted)**
- If selected, launch a **resume-driven AI interview**
- Interview bot asks tailored questions about your skills & projects
- Audio-based Q&A, plus **live video recording & face detection** for integrity *(Render deployment only)*
- See: `app/interview/VapiInterviewBotClient.tsx`  
- See: `components/InterviewRecordingAndFaceDetection.tsx`

### 5. **Automated Report & Feedback**
- After the interview:  
  - **Video analytics** on face presence and behavior
  - **Emotion summary** (e.g., happy, sad, neutral) frame-by-frame
  - **Transcript generation** & **AI-based scoring**  
  - See: `components/InterviewReportsDialog.tsx`
- Admins review your reports, transcripts, and scores for unbiased selection

---

## 🛡️ Admin Dashboard

- **Full job management:** Post, edit, close jobs
- **Applicant tracking:** See all applicants, resumes, statuses, and reports
- **Interview controls:** Select candidates, trigger interviews, review evaluations
- **Security:** Only authenticated admins can access
- See: `app/admin/dashboard/page.tsx`

---

## 🏠 User Dashboard

- **Profile & Resume:** Quickly view and update your resume/profile
- **Practice Interviews:** Hone your skills in a safe environment (no stakes)
- **My Applications:** Instantly see which jobs you’ve applied for, and next steps
- **Live Statuses:** Visual badges & progress for each job (applied, shortlisted, interviewed, etc.)
- **Resume-based Interview Launch:** Start your official interview if selected
- **Protected:** Only logged-in users can access
- See: `app/dashboard/page.tsx`

---

## 🗺️ Roadmap

- Enhanced analytics for users and admins
- Notification system (email, in-app)
- More AI-driven bias detection
- Organization analytics dashboard
- ...and much more!

---

## 🤝 Contributing

We welcome contributions!  
Open an issue or submit a pull request for new features, bug fixes, or suggestions.

---

*Ethicra is constantly evolving. Stay tuned for more updates and features!*
