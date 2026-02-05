# Kalyxi - AI-Powered Sales Call Analysis Platform

Kalyxi is a modern web application that uses AI to analyze sales calls, providing actionable insights to help sales teams improve their performance and close more deals.

## Features

- **AI Transcription**: Automatically transcribe sales calls using OpenAI's Whisper model
- **Smart Analysis**: Get detailed analysis including sentiment, talk ratio, objections, and more
- **Call Scoring**: Each call receives an AI-generated score based on best practices
- **Actionable Insights**: Receive personalized recommendations for improvement
- **Analytics Dashboard**: Track performance trends over time
- **Team Collaboration**: Share insights and reports with your team

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: SQLite with Prisma ORM
- **Authentication**: NextAuth.js
- **AI**: OpenAI GPT-4 & Whisper
- **Charts**: Recharts

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/IggyNunez/Kalyxi-AI-Powered-Sales-Call-Analysis-Platform.git
cd ai-powered-sales-call-analysis-platform
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your OpenAI API key:
```
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
OPENAI_API_KEY="sk-your-openai-api-key"
```

4. Initialize the database:
```bash
npx prisma migrate dev
```

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Dashboard pages
│   ├── api/               # API routes
│   └── page.tsx           # Landing page
├── components/            # React components
│   ├── ui/               # UI components
│   ├── layout/           # Layout components
│   ├── calls/            # Call-related components
│   └── analytics/        # Analytics components
├── lib/                   # Utility functions
│   ├── auth.ts           # Authentication config
│   ├── db.ts             # Database client
│   ├── openai.ts         # OpenAI integration
│   └── utils.ts          # Helper functions
├── types/                 # TypeScript types
└── hooks/                 # Custom React hooks
```

## Usage

### Uploading Calls

1. Navigate to the Upload page from the sidebar
2. Drag and drop an audio file or click to browse
3. Fill in call details (title, customer name, company)
4. Click "Upload & Analyze"

### Viewing Analysis

After uploading, you'll be redirected to the call detail page where you can view:
- Overall call score
- Sentiment analysis
- Key topics discussed
- Objections raised
- Action items
- Strengths and areas for improvement
- Full transcription

### Analytics

The Analytics page provides:
- Score distribution charts
- Weekly call trends
- Sentiment breakdown
- Top discussion topics
- Common objections

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/[...nextauth]` | * | Authentication endpoints |
| `/api/auth/register` | POST | User registration |
| `/api/calls` | GET | List all calls |
| `/api/calls/upload` | POST | Upload and analyze a call |
| `/api/calls/[id]` | GET/DELETE | Get or delete a specific call |
| `/api/calls/[id]/analyze` | POST | Re-analyze a call |
| `/api/stats` | GET | Get dashboard statistics |
| `/api/analytics` | GET | Get analytics data |
| `/api/insights` | GET | Get all insights |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | SQLite database connection string |
| `NEXTAUTH_SECRET` | Secret for NextAuth.js sessions |
| `NEXTAUTH_URL` | Base URL of your application |
| `OPENAI_API_KEY` | Your OpenAI API key |

## License

MIT License

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
