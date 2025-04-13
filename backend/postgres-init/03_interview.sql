-- Interview table
CREATE TABLE Interview (
  id SERIAL PRIMARY KEY,
  form_entry_id INTEGER NOT NULL,
  created_by TEXT NOT NULL, -- referencing Recruiter(uuid), which is TEXT
  created_at TIMESTAMP DEFAULT now(),
  FOREIGN KEY (form_entry_id) REFERENCES FormEntry(id),
  FOREIGN KEY (created_by) REFERENCES Recruiter(uuid)
);

-- InterviewEntry table
CREATE TABLE InterviewEntry (
  id SERIAL PRIMARY KEY,
  interview_id INTEGER NOT NULL,
  form_entry_id INTEGER NOT NULL,
  selected_by TEXT NOT NULL, -- referencing Recruiter(uuid)
  FOREIGN KEY (interview_id) REFERENCES Interview(id),
  FOREIGN KEY (form_entry_id) REFERENCES FormEntry(id),
  FOREIGN KEY (selected_by) REFERENCES Recruiter(uuid)
);

-- InterviewNotes table
CREATE TABLE InterviewNotes (
  id SERIAL PRIMARY KEY,
  interview_id INTEGER NOT NULL,
  notes TEXT,
  score NUMERIC,
  FOREIGN KEY (interview_id) REFERENCES Interview(id)
);
