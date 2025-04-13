CREATE TABLE Form (
  id SERIAL PRIMARY KEY,
  recruiter_id TEXT NOT NULL REFERENCES Recruiter(uuid),
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE Question (
  id SERIAL PRIMARY KEY,
  form_id INTEGER NOT NULL REFERENCES Form(id),
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL,
  question_order INTEGER NOT NULL
);

CREATE TABLE FormEntry (
  id SERIAL PRIMARY KEY,
  candidate_id INTEGER NOT NULL REFERENCES Candidate(id),
  form_id INTEGER NOT NULL REFERENCES Form(id),
  submitted_at TIMESTAMP DEFAULT date_trunc('second', now())
);

CREATE TABLE Answer (
  id SERIAL PRIMARY KEY,
  answer_type TEXT NOT NULL,
  candidate_id INTEGER NOT NULL REFERENCES Candidate(id),
  question_id INTEGER NOT NULL REFERENCES Question(id)
);

CREATE TABLE AnswerText (
  answer_id INTEGER PRIMARY KEY REFERENCES Answer(id),
  response_text TEXT NOT NULL
);

CREATE TABLE AnswerVideo (
  id INTEGER PRIMARY KEY REFERENCES Answer(id),
  video_id TEXT NOT NULL
);

CREATE TABLE RecruiterApplicationNotes (
  id SERIAL PRIMARY KEY,
  form_entry_id INTEGER REFERENCES FormEntry(id),
  notes TEXT,
  score NUMERIC
);