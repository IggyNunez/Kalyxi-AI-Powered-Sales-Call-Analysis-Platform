# Kalyxi

### AI-Powered Sales Call Analysis Platform

<p align="center">
  <img src="public/logo.png" alt="Kalyxi Logo" width="120" height="120">
</p>

<p align="center">
  <strong>Transform your sales calls into actionable insights with AI</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#demo">Demo</a> •
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#api">API</a> •
  <a href="#contributing">Contributing</a>
</p>

---

## Overview

Kalyxi is a modern, AI-powered platform that analyzes sales calls to provide actionable insights, performance scoring, and coaching recommendations. Built for sales teams who want to improve their performance and close more deals.

### Why Kalyxi?

- **Save Hours** - Automated call analysis instead of manual review
- **Consistent Scoring** - AI-powered grading removes subjective bias
- **Actionable Insights** - Specific recommendations, not generic feedback
- **Team Analytics** - Track performance trends across your organization

---

## Features

### Core Features

| Feature | Description |
|---------|-------------|
| **AI Analysis** | GPT-4 powered analysis with customizable grading criteria |
| **Performance Scoring** | Weighted scoring based on your organization's priorities |
| **Coaching Insights** | Strengths, improvements, and action items for every call |
| **Team Dashboard** | Real-time metrics and performance tracking |
| **Multi-tenant** | Organization-based data isolation with role-based access |

### Analysis Capabilities

- **Sentiment Analysis** - Track emotional progression throughout calls
- **Objection Handling** - Identify objections and evaluate responses
- **Script Adherence** - Check if key talking points were covered
- **Competitor Mentions** - Track competitive intelligence
- **Gatekeeper Detection** - Identify and score gatekeeper interactions
- **Talk Ratio** - Monitor caller vs. prospect speaking time

### Integrations

- **Webhook API** - Receive calls from external systems
- **Manual Upload** - Submit call notes directly
- **Customizable Templates** - Define your own grading criteria

---

## Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth |
| **AI** | OpenAI GPT-4o |
| **Styling** | Tailwind CSS 4 |
| **UI** | Radix UI + Custom Components |
| **Charts** | Recharts |

---

## Demo

### Dashboard
![Dashboard](docs/screenshots/dashboard.png)

### Call Analysis
![Analysis](docs/screenshots/analysis.png)

### Analytics
![Analytics](docs/screenshots/analytics.png)

> *Screenshots coming soon*

---

## Installation

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- OpenAI API key

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/IggyNunez/Kalyxi-AI-Powered-Sales-Call-Analysis-Platform.git
   cd Kalyxi-AI-Powered-Sales-Call-Analysis-Platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**

   - Create a new project at [supabase.com](https://supabase.com)
   - Go to SQL Editor and run the migration script:
     ```bash
     # Copy contents of supabase/migrations/001_initial_schema.sql
     # Paste and run in Supabase SQL Editor
     ```

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your credentials:
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

   # OpenAI
   OPENAI_API_KEY=sk-your-openai-key

   # App
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open the app**

   Visit [http://localhost:3000](http://localhost:3000)

---

## Usage

### Getting Started

1. **Register** - Create an account with your company name
2. **Add Callers** - Set up your sales team members
3. **Submit Calls** - Upload call notes via the dashboard or webhook
4. **View Analysis** - Review AI-generated insights and scores

### User Roles

| Role | Permissions |
|------|-------------|
| **Caller** | View own calls and analytics |
| **Admin** | Manage team, templates, view all calls |
| **Superadmin** | Full platform access, cross-org management |

### Submitting Calls

#### Manual Entry
```
Dashboard → Submit Call → Enter call notes → Submit
```

#### Webhook Integration
```bash
POST /api/webhook/{org-slug}
Authorization: Bearer {webhook-secret}

{
  "callerEmail": "rep@company.com",
  "customerName": "John Doe",
  "customerCompany": "Acme Corp",
  "rawNotes": "Call transcript or notes...",
  "duration": 1800,
  "callTimestamp": "2024-01-15T10:30:00Z"
}
```

### Customizing Grading

1. Go to **Grading** in the sidebar
2. Edit the default template or create a new one
3. Define criteria with types:
   - **Score** (1-10 rating)
   - **Text** (detailed feedback)
   - **Checklist** (items to check)
   - **Boolean** (yes/no)
   - **Percentage** (0-100%)

---

## API Reference

### Authentication

All API routes require authentication via Supabase session cookies.

### Endpoints

#### Calls

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/calls` | List calls (paginated) |
| POST | `/api/calls` | Create new call |
| GET | `/api/calls/:id` | Get call details |
| PATCH | `/api/calls/:id` | Update call |
| DELETE | `/api/calls/:id` | Delete call |
| POST | `/api/calls/:id/analyze` | Trigger AI analysis |

#### Callers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/callers` | List callers |
| POST | `/api/callers` | Create caller |
| PATCH | `/api/callers/:id` | Update caller |
| DELETE | `/api/callers/:id` | Delete caller |

#### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/stats` | Dashboard statistics |
| GET | `/api/analytics` | Detailed analytics |
| GET | `/api/insights` | AI-generated insights |

#### Configuration

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/grading-templates` | Grading templates |
| GET/PATCH/DELETE | `/api/grading-templates/:id` | Single template |
| GET/POST | `/api/scorecard-configs` | Scorecard configs |

#### Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/webhook/:orgSlug` | Receive external calls |

### Response Format

**Success**
```json
{
  "data": { ... },
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

**Error**
```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

---

## Project Structure

```
src/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Login, Register pages
│   ├── (dashboard)/         # Protected dashboard pages
│   ├── api/                 # API routes
│   └── auth/                # Auth callbacks
│
├── components/
│   ├── ui/                  # Base UI components
│   ├── layout/              # Header, Sidebar
│   ├── calls/               # Call-specific components
│   └── providers/           # Context providers
│
├── lib/
│   ├── supabase/            # Supabase clients
│   ├── ai-engine.ts         # OpenAI integration
│   ├── api-utils.ts         # API helpers
│   └── utils.ts             # Utilities
│
├── types/
│   ├── database.ts          # Supabase types
│   └── index.ts             # Shared types
│
└── hooks/                   # Custom React hooks
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `NEXT_PUBLIC_APP_URL` | Yes | Application URL |
| `REDIS_URL` | No | Redis URL for rate limiting |

---

## Database Schema

### Core Tables

- `organizations` - Multi-tenant organizations
- `users` - User accounts linked to Supabase Auth
- `callers` - Sales team members
- `calls` - Call records with notes/transcriptions
- `analyses` - AI-generated analysis results
- `grading_templates` - Customizable grading criteria
- `scorecard_configs` - Scorecard configurations
- `reports` - Generated reports

### Security

- **Row Level Security (RLS)** enabled on all tables
- Organization-based data isolation
- Role-based access control

See [KALYXI_PROJECT_AUDIT.md](KALYXI_PROJECT_AUDIT.md) for complete schema documentation.

---

## Development

### Scripts

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Code Style

- TypeScript strict mode
- ESLint for linting
- Prettier for formatting (recommended)

---

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Other Platforms

The app can be deployed to any platform supporting Next.js:
- Railway
- Render
- AWS Amplify
- Self-hosted with Node.js

---

## Roadmap

- [ ] Audio transcription (Whisper integration)
- [ ] PDF report generation
- [ ] Email notifications
- [ ] Salesforce/HubSpot integrations
- [ ] Mobile app
- [ ] Team leaderboards
- [ ] Custom AI model fine-tuning

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Guidelines

- Follow existing code style
- Add tests for new features
- Update documentation as needed
- Keep PRs focused and atomic

---

## Support

- **Documentation**: [KALYXI_PROJECT_AUDIT.md](KALYXI_PROJECT_AUDIT.md)
- **Issues**: [GitHub Issues](https://github.com/IggyNunez/Kalyxi-AI-Powered-Sales-Call-Analysis-Platform/issues)

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Acknowledgments

- [Next.js](https://nextjs.org) - React framework
- [Supabase](https://supabase.com) - Backend as a Service
- [OpenAI](https://openai.com) - AI/ML capabilities
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [Radix UI](https://radix-ui.com) - Accessible components
- [Lucide](https://lucide.dev) - Icons

---

<p align="center">
  Built with ❤️ by the Kalyxi Team
</p>
