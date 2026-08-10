# MeetAI – Meeting Intelligence Platform

MeetAI is an AI-powered meeting intelligence platform that transforms meeting conversations into useful and actionable information.

## Features

- Meeting management
- Meeting summaries
- Action item extraction
- Decision tracking
- Topic and discussion tracking
- AI Assistant
- Knowledge Search
- Analytics Dashboard
- Meeting history

## Technology Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Supabase
- PostgreSQL

## Database

Supabase is used for authentication and database management.

Main tables:

- profiles
- meetings
- transcripts
- action_items
- decisions
- topics

## How It Works

1. User signs in to MeetAI.
2. User creates or uploads meeting information.
3. Meeting data is processed by the platform.
4. AI extracts useful information.
5. The platform displays summaries, action items, decisions and insights.
6. Users can search and analyze previous meetings.

## Project Structure

```text
src/
├── components/
├── context/
├── layouts/
├── lib/
├── pages/
├── types/
├── App.tsx
├── main.tsx
└── index.css

supabase/
└── migrations/