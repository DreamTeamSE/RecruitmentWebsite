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
  question_order INTEGER NOT NULL,
  UNIQUE (form_id, question_order)
);

CREATE TABLE FormEntry (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES User(id),
  form_id INTEGER NOT NULL REFERENCES Form(id),
  submitted_at TIMESTAMP DEFAULT date_trunc('second', now())
);

CREATE TABLE Answer (
  id SERIAL PRIMARY KEY,
  answer_type TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES User(id),
  question_id INTEGER NOT NULL UNIQUE REFERENCES Question(id)
);

CREATE TABLE AnswerText (
  answer_id INTEGER PRIMARY KEY UNIQUE REFERENCES Answer(id),
  response_text TEXT NOT NULL
);

CREATE TABLE AnswerVideo (
  id INTEGER PRIMARY KEY UNIQUE REFERENCES Answer(id),
  video_id TEXT NOT NULL
);

CREATE TABLE RecruiterApplicationNotes (
  id SERIAL PRIMARY KEY,
  form_entry_id INTEGER UNIQUE REFERENCES FormEntry(id),
  notes TEXT,
  score NUMERIC
);