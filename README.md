# 🎯 GMShooter v2 - Target Coach

<div align="center">

![GMShooter Logo](public/GMShoot_logo.png)

**Advanced Shooting Analysis System with Real-time Hardware Integration**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)

[Live Demo](https://gms-target-coach.vercel.app) · [Documentation](#documentation) · [Report Bug](#issues) · [Request Feature](#features)

</div>

## 📋 Table of Contents

- [🌟 About](#-about)
- [✨ Features](#-features)
- [🚀 Quick Start](#-quick-start)
- [🛠️ Installation](#️-installation)
- [📁 Project Structure](#-project-structure)
- [🔧 Configuration](#-configuration)
- [🧪 Testing](#-testing)
- [📚 Documentation](#-documentation)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

## 🌟 About

GMShooter v2 is a cutting-edge shooting analysis platform designed for competitive shooters and firearms enthusiasts. Our system combines real-time hardware integration with advanced computer vision to provide instant feedback on shooting performance, helping users improve their accuracy and consistency.

### 🎯 Mission

To democratize professional-grade shooting analysis by making advanced technology accessible to shooters of all levels, from beginners to competitive athletes.

### 🔥 What's New in v2

- 🔄 **Real-time Hardware Integration** - Direct connection to Raspberry Pi target systems
- 📱 **Mobile Mirroring** - QR code-based mobile device synchronization
- 🤖 **AI-Powered Coaching** - Gemini API integration for personalized feedback
- 🎮 **Gamification System** - XP, achievements, and skill progression
- 📊 **Advanced Analytics** - SOTA metrics and performance tracking
- 🎨 **Modern UI/UX** - MagicUI components with stunning animations

## ✨ Features

### 🎯 Core Features
- **Live Target Analysis** - Real-time shot detection and scoring
- **Video Analysis** - Upload and analyze shooting videos
- **Camera Analysis** - Live camera feed processing
- **Session Management** - Track and organize practice sessions
- **Performance Reports** - Detailed analytics and insights

### 🔧 Technical Features
- **Hardware Integration** - WebSocket connection to Raspberry Pi
- **Geometric Scoring** - Advanced target hit calculation
- **QR Code Pairing** - Easy device synchronization
- **Real-time Updates** - Live shot overlay visualization
- **Mobile Responsive** - Works on all device sizes

### 🎨 UI/UX Features
- **Modern Design** - Digital Serenity theme with smooth animations
- **MagicUI Components** - Beautiful, interactive elements
- **Dark Mode** - Easy on the eyes during extended sessions
- **Accessibility** - WCAG 2.1 AA compliant
- **Progressive Web App** - Installable on mobile devices

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Firebase account
- Supabase account
- Raspberry Pi (for hardware features)

### One-Click Setup

```bash
# Clone the repository
git clone https://github.com/GMShooter/gms-target-coach.git
cd gms-target-coach

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Firebase and Supabase credentials

# Start development server
npm start
```

Visit [http://localhost:3000](http://localhost:3000) to see the application in action!

## 🛠️ Installation

### Step 1: Clone Repository

```bash
git clone https://github.com/GMShooter/gms-target-coach.git
cd gms-target-coach
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Environment Configuration

1. **Firebase Setup**
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication (Email/Password and Google OAuth)
   - Enable Hosting
   - Download service account key

2. **Supabase Setup**
   - Create a new Supabase project at [Supabase Dashboard](https://app.supabase.com/)
   - Run the migration scripts in `supabase/migrations/`
   - Set up storage buckets for videos and frames

3. **Environment Variables**
   
   Create `.env` file:
   ```env
   # Firebase
   REACT_APP_FIREBASE_API_KEY=your_api_key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   REACT_APP_FIREBASE_PROJECT_ID=your_project_id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   REACT_APP_FIREBASE_APP_ID=your_app_id

   # Supabase
   REACT_APP_SUPABASE_URL=your_supabase_url
   REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key

   # Roboflow (for computer vision)
   REACT_APP_ROBOFLOW_API_KEY=your_roboflow_api_key
   ```

### Step 4: Database Setup

```bash
# Apply Supabase migrations
supabase db push

# Start Supabase local development (optional)
supabase start
```

### Step 5: Run Application

```bash
# Development mode
npm start

# Build for production
npm run build

# Run tests
npm test
```

## 📁 Project Structure

```
gms-target-coach/
├── 📁 public/                 # Static assets
├── 📁 src/                   # Source code
│   ├── 📁 components/        # React components
│   │   ├── 📁 ui/           # Reusable UI components
│   │   ├── 📁 magicui/      # MagicUI components
│   │   ├── 📄 LiveTargetView.tsx
│   │   ├── 📄 VideoAnalysis.tsx
│   │   └── 📄 CameraAnalysis.tsx
│   ├── 📁 hooks/            # Custom React hooks
│   │   ├── 📄 useHardwareAPI.ts
│   │   ├── 📄 useVideoAnalysis.ts
│   │   └── 📄 useCameraAnalysis.ts
│   ├── 📁 services/         # API services
│   │   └── 📄 HardwareAPI.ts
│   ├── 📁 utils/            # Utility functions
│   └── 📁 __tests__/        # Test files
├── 📁 supabase/             # Supabase configuration
│   ├── 📁 functions/        # Edge Functions
│   └── 📁 migrations/       # Database migrations
├── 📁 cypress/              # E2E tests
├── 📁 .storybook/           # Storybook configuration
├── 📄 package.json
├── 📄 tailwind.config.js
├── 📄 tsconfig.json
└── 📄 README.md
```

## 🔧 Configuration

### Firebase Configuration

Update `src/firebase.ts` with your Firebase config:

```typescript
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};
```

### Supabase Configuration

Update `src/lib/supabase.ts` with your Supabase config:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### Hardware Configuration

For Raspberry Pi integration, update `src/services/HardwareAPI.ts`:

```typescript
const HARDWARE_CONFIG = {
  WEBSOCKET_URL: 'ws://your-pi-ip:8080',
  API_BASE_URL: 'http://your-pi-ip:3000',
  CONNECTION_TIMEOUT: 5000,
  RECONNECT_INTERVAL: 3000
};
```

## 🧪 Testing

### Run Tests

```bash
# Unit and integration tests
npm test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Test Structure

- **Unit Tests**: Individual component and function testing
- **Integration Tests**: Component interaction and API testing
- **E2E Tests**: Full user workflow testing with Cypress
- **Visual Tests**: Storybook-based visual regression testing

### Coverage Goals

- 🎯 **Overall Coverage**: 90%+
- 🧩 **Components**: 95%+
- 🔧 **Utilities**: 100%+
- 📊 **Services**: 85%+

## 📚 Documentation

### API Documentation

- [Hardware API Reference](./docs/hardware-api.md)
- [Supabase Schema](./docs/database-schema.md)
- [Firebase Integration](./docs/firebase-setup.md)

### Component Documentation

- [Storybook](http://localhost:6006) - Interactive component gallery
- [Component Guide](./docs/components.md)
- [UI Patterns](./docs/ui-patterns.md)

### Deployment

- [Firebase Hosting](./docs/deployment-firebase.md)
- [Vercel Deployment](./docs/deployment-vercel.md)
- [Docker Setup](./docs/docker-setup.md)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Development Process

1. 🍴 Fork the repository
2. 🌿 Create a feature branch (`git checkout -b feature/amazing-feature`)
3. 💾 Commit your changes (`git commit -m 'Add amazing feature'`)
4. 📤 Push to the branch (`git push origin feature/amazing-feature`)
5. 🔄 Open a Pull Request

### Code Standards

- ✅ Use TypeScript for all new code
- ✅ Follow ESLint configuration
- ✅ Write tests for new features
- ✅ Use Prettier for code formatting
- ✅ Follow conventional commit messages

### Reporting Issues

Please use the [issue tracker](https://github.com/GMShooter/gms-target-coach/issues) to report bugs or request features.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [React](https://reactjs.org/) - UI framework
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Firebase](https://firebase.google.com/) - Authentication and hosting
- [Supabase](https://supabase.com/) - Backend as a service
- [MagicUI](https://magicui.design/) - Beautiful UI components
- [Radix UI](https://www.radix-ui.com/) - Accessible component primitives

## 📞 Support

- 📧 Email: support@gmshooter.com
- 💬 Discord: [Join our community](https://discord.gg/gmshooter)
- 📖 Documentation: [docs.gmshooter.com](https://docs.gmshooter.com)
- 🐛 Issues: [GitHub Issues](https://github.com/GMShooter/gms-target-coach/issues)

---

<div align="center">

**Made with ❤️ by the GMShooter Team**

[![GitHub stars](https://img.shields.io/github/stars/GMShooter/gms-target-coach?style=social)](https://github.com/GMShooter/gms-target-coach/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/GMShooter/gms-target-coach?style=social)](https://github.com/GMShooter/gms-target-coach/network)
[![GitHub issues](https://img.shields.io/github/issues/GMShooter/gms-target-coach)](https://github.com/GMShooter/gms-target-coach/issues)

</div>
