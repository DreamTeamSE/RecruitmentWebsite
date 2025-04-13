CREATE TABLE Form (
  form_id SERIAL PRIMARY KEY,
  recruiter_id INTEGER NOT NULL REFERENCES Recruiter(recruiter_id),
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE Question (
  question_id SERIAL PRIMARY KEY,
  form_id INTEGER NOT NULL REFERENCES Form(form_id),
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL,
  "order" INTEGER NOT NULL
);

CREATE TABLE FormEntry (
  form_entry_id SERIAL PRIMARY KEY,
  candidate_id INTEGER NOT NULL REFERENCES Candidate(candidate_id),
  form_id INTEGER NOT NULL REFERENCES Form(form_id),
  submitted_at TIMESTAMP DEFAULT now()
);

CREATE TABLE Answer (
  answer_id SERIAL PRIMARY KEY,
  candidate_id INTEGER NOT NULL REFERENCES Candidate(candidate_id),
  question_id INTEGER NOT NULL REFERENCES Question(question_id)
);

CREATE TABLE AnswerText (
  response_id INTEGER PRIMARY KEY REFERENCES Answer(answer_id),
  response_text TEXT NOT NULL
);

CREATE TABLE AnswerVideo (
  response_id INTEGER PRIMARY KEY REFERENCES Answer(answer_id),
  video_id TEXT NOT NULL
);

CREATE TABLE RecruiterApplicationNotes (
  recruiter_notes_id SERIAL PRIMARY KEY,
  form_entry_id INTEGER REFERENCES FormEntry(form_entry_id),
  notes TEXT,
  score NUMERIC
);