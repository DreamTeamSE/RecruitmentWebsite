-- Interview table
CREATE TABLE Interview (
  id SERIAL PRIMARY KEY,
  form_id INTEGER NOT NULL UNIQUE, -- Ensuring one interview per form entry
  created_by TEXT NOT NULL, -- referencing Recruiter(uuid), which is TEXT
  created_at TIMESTAMP DEFAULT now(),
  FOREIGN KEY (form_id) REFERENCES Form(id),
  FOREIGN KEY (created_by) REFERENCES Recruiter(uuid)
);

-- InterviewEntry table
CREATE TABLE InterviewEntry (
  id SERIAL PRIMARY KEY,
  interview_id INTEGER NOT NULL,
  form_entry_id INTEGER NOT NULL,
  selected_by TEXT NOT NULL, -- referencing Recruiter(uuid)
  UNIQUE (interview_id, form_entry_id), -- Ensuring unique combination of interview_id and form_entry_id
  FOREIGN KEY (form_entry_id) REFERENCES FormEntry(id),
  FOREIGN KEY (selected_by) REFERENCES Recruiter(uuid)
);

-- InterviewNotes table
CREATE TABLE InterviewNotes (
  id SERIAL PRIMARY KEY,
  interview_entry_id INTEGER NOT NULL UNIQUE, -- Ensuring one note per interview entry
  notes TEXT,
  score NUMERIC,
  FOREIGN KEY (interview_entry_id) REFERENCES InterviewEntry(id)
);
