This is a web‑based flashcard app with a Node/Express backend and React frontend that lets users create and study their own cards, with Supabase handling authentication and storage.

Overview
This project is a simple flashcard application built as a full‑stack app:

Backend: Node.js + Express, Supabase (Auth + Postgres).

Frontend: React (Create React App).

Auth: Email/password with JWT; Express talks to Supabase, frontend only handles the token.

Data: Each user can create, view, and (later) update/delete their own flashcards.

The goal is to eventually extend this into a more powerful Quizlet‑style tool with extra features like spaced repetition (SRS) and AI‑assisted card creation.

Features (current)
User signup and login with email and password (no email verification).

JWT issued by Supabase, passed to the frontend and stored in localStorage.

Protected API routes using Authorization: Bearer <token>.

Create basic flashcards with:

front (question/prompt)

back (answer)

deck_id for grouping

List all cards belonging to the logged‑in user.

Tech stack
Backend

Node.js

Express

Supabase (@supabase/supabase-js) for:

Auth (signUp, signInWithPassword, getUser)

Postgres storage for cards table

dotenv, cors

Frontend

React (Create React App)

fetch for calling the backend API

API endpoints
All routes are under http://localhost:4000 in development.

POST /auth/signup
Body: { "email": string, "password": string }
Returns: user, access_token.

POST /auth/login
Body: { "email": string, "password": string }
Returns: user, access_token.

GET /cards (auth required)
Header: Authorization: Bearer <access_token>
Returns: list of cards for that user.

POST /cards (auth required)
Header: Authorization: Bearer <access_token>
Body: { "front": string, "back": string, "deck_id": string }
Returns: created card.

(Planned: PUT /cards/:id, DELETE /cards/:id.)

Database schema (Supabase)
sql
CREATE TABLE cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  deck_id TEXT DEFAULT 'default',
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own cards" ON cards
  FOR ALL
  USING (auth.uid() = user_id);
Each card belongs to a single Supabase auth user (user_id), and row‑level security ensures users can only access their own cards.

Running the project
Backend
bash
cd backend
npm install
# set SUPABASE_URL and SUPABASE_ANON_KEY in .env
node server.js
# server at http://localhost:4000
Frontend
bash
cd flashcards
npm install
npm start
# React at http://localhost:3000
With both servers running, you can:

Sign up or log in from the React UI.

Create new cards.

View your own cards loaded from Supabase.

Future plans
Edit and delete cards.

Deck management UI.

Study mode (flip through cards, track progress).

Spaced repetition scheduling (SRS).

AI‑assisted card generation from notes or text.