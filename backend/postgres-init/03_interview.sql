-- Interview table
CREATE TABLE Interviews (
  id SERIAL PRIMARY KEY,
  form_id INTEGER NOT NULL UNIQUE, -- Ensuring one interview per form entry
  created_by UUID NOT NULL, -- referencing staff(id), which is UUID
  created_at TIMESTAMP DEFAULT now(),
  FOREIGN KEY (form_id) REFERENCES Forms(id),
  FOREIGN KEY (created_by) REFERENCES staff(id)
);

-- InterviewEntry table
CREATE TABLE InterviewEntries (
  id SERIAL PRIMARY KEY,
  interview_id INTEGER NOT NULL,
  form_entry_id INTEGER NOT NULL,
  selected_by UUID NOT NULL, -- referencing staff(id)
  UNIQUE (interview_id, form_entry_id), -- Ensuring unique combination of interview_id and form_entry_id
  FOREIGN KEY (interview_id) REFERENCES Interviews(id),
  FOREIGN KEY (form_entry_id) REFERENCES FormEntries(id),
  FOREIGN KEY (selected_by) REFERENCES staff(id)
);

-- InterviewNotes table
CREATE TABLE InterviewNotes (
  id SERIAL PRIMARY KEY,
  interview_entry_id INTEGER NOT NULL UNIQUE, -- Ensuring one note per interview entry
  notes TEXT,
  score NUMERIC,
  FOREIGN KEY (interview_entry_id) REFERENCES InterviewEntries(id)
);
