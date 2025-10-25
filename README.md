# GMShoot v2 - Hardware-First Analysis Pipeline

A modern web application for shooting practice analysis, connecting hardware via QR codes and providing real-time shot analysis with AI-powered target detection.

## 🎯 Features

- **Hardware Connection**: Connect to Raspberry Pi hardware via QR code scanning
- **Real-time Analysis**: Live shot detection and analysis using Roboflow AI
- **Session Management**: Start, stop, and save shooting sessions
- **Performance Analytics**: Comprehensive statistics and shot distribution visualization
- **Session History**: Review past sessions with detailed reports
- **Modern UI**: Built with MagicUI and shadcn/ui components

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Raspberry Pi hardware with GMShoot server (optional for development)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd gmshooter-v2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` with your configuration:
   ```env
   # Supabase Configuration
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # Roboflow API (handled by Supabase Edge Functions)
   # ROBOFLOW_API_KEY=your_roboflow_api_key
   ```

4. **Database Setup**
   ```bash
   # Apply database migrations
   supabase db push
   ```

5. **Deploy Edge Functions**
   ```bash
   # Deploy Supabase Edge Functions
   supabase functions deploy analyze-frame
   supabase functions deploy start-session
   supabase functions deploy end-session
   supabase functions deploy session-data
   ```

### Running the Application

**Development Mode**
```bash
npm run dev
```

**Production Build**
```bash
npm run build
npm run preview
```

## 🏗️ Project Structure

```
gmshooter-v2/
├── src/
│   ├── components/          # React components
│   │   ├── ui/            # shadcn/ui and MagicUI components
│   │   ├── layout/         # Layout components
│   │   └── ...            # Feature components
│   ├── pages/               # Page components
│   ├── hooks/               # Custom React hooks
│   ├── services/            # API services
│   ├── utils/               # Utility functions
│   └── store/               # Zustand state management
├── supabase/
│   ├── functions/           # Supabase Edge Functions
│   └── migrations/          # Database schema migrations
├── cypress/               # E2E tests
└── public/                 # Static assets
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|-----------|
| `VITE_SUPABASE_URL` | Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `ROBOFLOW_API_KEY` | Roboflow API key (set in Supabase) | Yes |

### Supabase Setup

1. **Create Project**: Set up a new project at [supabase.com](https://supabase.com)
2. **Database**: Run migrations from `supabase/migrations/`
3. **Edge Functions**: Deploy functions from `supabase/functions/`
4. **Authentication**: Enable email/password authentication
5. **RLS Policies**: Security policies are applied via migrations

### Hardware Setup

For development without physical hardware:

1. **Mock Server**: Use the built-in mock responses in Cypress tests
2. **Test Data**: Sample QR codes and frame data available in test fixtures

For production hardware:

1. **Raspberry Pi**: Set up GMShoot server on Raspberry Pi 4
2. **Network**: Configure ngrok for external access
3. **QR Code**: Generate QR code with ngrok URL

## 🧪 Testing

### Unit Tests
```bash
npm run test
```

### E2E Tests
```bash
npm run test:e2e
```

### Test Coverage
```bash
npm run test:coverage
```

## 📊 Architecture

### Frontend
- **React 18+** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **MagicUI + shadcn/ui** for components
- **Zustand** for state management
- **React Router** for navigation

### Backend
- **Supabase** for database and authentication
- **Edge Functions** for serverless API
- **PostgreSQL** for data storage
- **Roboflow** for AI analysis

### Hardware Integration
- **QR Code** scanning for device pairing
- **WebSocket** for real-time communication
- **ngrok** for secure tunneling
- **Raspberry Pi** as hardware server

## 🔒 Security

- **Row Level Security (RLS)**: All database tables have RLS policies
- **API Key Protection**: Roboflow API key secured in Edge Functions
- **Authentication**: Supabase Auth for user management
- **CORS**: Properly configured for cross-origin requests

## 📈 Performance

- **Analysis Latency**: < 2 seconds from shot detection to display
- **Lighthouse Score**: 90+ for Performance and Accessibility
- **Bundle Size**: Optimized with code splitting
- **Caching**: Strategic caching for API responses

## 🚀 Deployment

### Firebase Hosting (Recommended)

1. **Install Firebase CLI**
   ```bash
   npm install -g firebase-tools
   ```

2. **Initialize Firebase**
   ```bash
   firebase init hosting
   ```

3. **Deploy**
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

### Alternative Deployment

The application can be deployed to any static hosting service:
- Vercel
- Netlify
- AWS S3 + CloudFront
- GitHub Pages

## 🔧 Development

### Code Style

- **TypeScript** for type safety
- **ESLint** for linting
- **Prettier** for formatting
- **Husky** for git hooks

### Git Workflow

1. **Feature Branches**: `feature/feature-name`
2. **Pull Requests**: Required for all changes
3. **CI/CD**: Automated testing and deployment
4. **Semantic Versioning**: Follow SemVer for releases

## 🐛 Troubleshooting

### Common Issues

**Build Errors**
- Check Node.js version (requires 18+)
- Clear node_modules: `rm -rf node_modules && npm install`
- Check environment variables in `.env.local`

**Database Connection**
- Verify Supabase URL and keys
- Check RLS policies in Supabase dashboard
- Ensure migrations are applied

**Hardware Connection**
- Verify ngrok URL is accessible
- Check Raspberry Pi network connection
- Ensure QR code contains valid URL

**Analysis Not Working**
- Check Roboflow API key in Supabase secrets
- Verify Edge Function deployment
- Check frame data format from hardware

### Debug Mode

Enable debug logging:
```bash
# Development
VITE_DEBUG=true npm run dev

# Production
VITE_DEBUG=true npm run build
```

## 📚 API Reference

### Hardware API

```typescript
// Start session with hardware
const session = await HardwareAPI.startSession(ngrokUrl);

// Get latest frame from hardware
const frame = await HardwareAPI.getLatestFrame(sessionId);
```

### Supabase Functions

```typescript
// Analyze frame (proxy to Roboflow)
const analysis = await supabase.functions.invoke('analyze-frame', {
  body: { imageData: base64Data }
});

// Start session
const session = await supabase.functions.invoke('start-session', {
  body: { userId, title }
});
```

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch
3. **Make** your changes
4. **Test** thoroughly
5. **Submit** a pull request

### Development Guidelines

- Follow existing code patterns
- Add tests for new features
- Update documentation
- Ensure TypeScript compliance
- Check accessibility compliance

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

- **Documentation**: [Wiki/Docs](link-to-docs)
- **Issues**: [GitHub Issues](link-to-issues)
- **Discussions**: [GitHub Discussions](link-to-discussions)

## 🗺 Roadmap

- [ ] Mobile app development
- [ ] Multi-user sessions
- [ ] Advanced analytics dashboard
- [ ] Integration with shooting ranges
- [ ] AI-powered coaching recommendations
- [ ] Live streaming capabilities
