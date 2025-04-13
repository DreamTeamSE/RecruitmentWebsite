CREATE TABLE Interview (
  interview_id SERIAL PRIMARY KEY,
  form_entry_id INTEGER NOT NULL,
  created_by INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  FOREIGN KEY (form_entry_id) REFERENCES FormEntry(form_entry_id),
  FOREIGN KEY (created_by) REFERENCES Recruiter(recruiter_id)
);

CREATE TABLE InterviewEntry (
  interview_entry_id SERIAL PRIMARY KEY,
  interview_id INTEGER NOT NULL,
  selected_by INTEGER NOT NULL,
  FOREIGN KEY (interview_id) REFERENCES Interview(interview_id),
  FOREIGN KEY (recruiter_id) REFERENCES Recruiter(recruiter_id)
)


CREATE TABLE RecruiterInterviewNotes (
  recruiter_notes_id SERIAL PRIMARY KEY,
  interview_id INTEGER REFERENCES Interview(interview_id),
  notes TEXT,
  score NUMERIC
);