CREATE TABLE Forms (
  id SERIAL PRIMARY KEY,
  recruiter_id UUID NOT NULL REFERENCES staff(id),
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE Questions (
  id SERIAL PRIMARY KEY,
  form_id INTEGER NOT NULL REFERENCES Forms(id),
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL,
  question_order INTEGER NOT NULL CHECK(question_order > 0),
  UNIQUE (form_id, question_order)
  
);

CREATE TABLE FormEntries (
  id SERIAL PRIMARY KEY,
  applicant_id INTEGER NOT NULL REFERENCES Applicants(id),
  form_id INTEGER NOT NULL REFERENCES Forms(id),
  submitted_at TIMESTAMP DEFAULT date_trunc('second', now()),
  UNIQUE (form_id, applicant_id)
);

CREATE TABLE Answers (
  id SERIAL PRIMARY KEY,
  answer_type TEXT NOT NULL,
  form_entry_id INTEGER NOT NULL REFERENCES FormEntries(id),
  applicant_id INTEGER NOT NULL REFERENCES Applicants(id),
  question_id INTEGER NOT NULL REFERENCES Questions(id),
  answer_text TEXT,
  UNIQUE (form_entry_id, question_id)
);


CREATE TABLE RecruiterApplicationNotes (
  id SERIAL PRIMARY KEY,
  form_entry_id INTEGER UNIQUE REFERENCES FormEntries(id),
  notes TEXT,
  score NUMERIC
);