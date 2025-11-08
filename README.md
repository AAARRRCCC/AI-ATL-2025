# Study Autopilot

> AI-Powered Study Planning for Students

Study Autopilot is an automated study planner that breaks down assignments into scheduled, achievable work sessions using real calendar availability and smart task decomposition. Focused on reducing procrastination through momentum, not punishment.

## ✨ Features

- **AI-Powered Task Breakdown**: Uses Claude AI to intelligently analyze assignments and break them into manageable phases
- **Smart Scheduling**: Automatically schedules study sessions based on your Google Calendar availability
- **Progress Tracking**: Visual progress bars and completion tracking to build momentum
- **Auto-Rescheduling**: Automatically reschedules missed sessions to keep you on track
- **Context-Aware Planning**: Considers your productivity hours, preferences, and workload

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

```bash
# Install dependencies
npm install --legacy-peer-deps

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

The application will be available at [http://localhost:3000](http://localhost:3000)

## 🛠️ Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Smooth animations and transitions
- **Lucide Icons** - Beautiful, consistent iconography

### Planned Backend (Not Yet Implemented)
- **FastAPI** (Python) - Modern, fast API framework
- **SQLite** - Lightweight database for MVP
- **Claude API** - AI-powered assignment analysis
- **Google Calendar API** - Calendar integration

## 📁 Project Structure

```
AI-ATL-2025/
├── app/                      # Next.js App Router pages
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Landing page
│   └── globals.css          # Global styles
├── components/              # React components
│   ├── AnimatedBackground.tsx
│   ├── HeroSection.tsx
│   ├── FeaturesSection.tsx
│   ├── DemoSection.tsx
│   ├── CTASection.tsx
│   └── Footer.tsx
├── lib/                     # Utility functions
│   └── utils.ts
├── public/                  # Static assets
├── HACKATHON_MVP.md        # MVP implementation plan
├── PROJECT_OVERVIEW.md     # Complete project documentation
└── package.json            # Dependencies
```

## 📖 Documentation

- **[PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)** - Complete technical architecture, data models, and user flows
- **[HACKATHON_MVP.md](HACKATHON_MVP.md)** - 24-36 hour hackathon implementation plan

## 🎯 Current Status

**Phase**: Landing Page Complete ✅

The landing page features:
- Stunning animated gradient background
- Hero section with clear value proposition
- Feature cards highlighting key benefits
- Interactive "How It Works" demo preview
- Call-to-action sections
- Fully responsive design

**Next Steps**:
1. Set up FastAPI backend
2. Implement assignment input form with validation
3. Integrate Claude API for AI task breakdown
4. Build calendar scheduling algorithm
5. Create progress dashboard

## 🚧 Roadmap

### MVP (Version 1.0)
- [x] Landing page
- [ ] Assignment input form
- [ ] AI-powered task breakdown (Claude API)
- [ ] Basic scheduling algorithm
- [ ] Progress tracking dashboard
- [ ] Google Calendar integration

### Future Features
- PDF upload and parsing
- Advanced auto-rescheduling logic
- Machine learning from user patterns
- Mobile app (React Native)
- Team/group project support
- Integration with learning management systems

## 🤝 Contributing

This project was created for the AI ATL 2025 Hackathon. Contributions are welcome!

## 📝 License

This project is private and proprietary.

## 👥 Team

Built with ❤️ by the Study Autopilot team for AI ATL 2025 Hackathon.

---

**Note**: This is a hackathon MVP. The backend API and full functionality are planned but not yet implemented. The current version showcases the landing page and UI/UX design.
