-- ENUM for question type
CREATE TYPE question_type_enum AS ENUM ('text', 'video');

-- Recruiter table
CREATE TABLE Recruiter (
    recruiter_id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL
);

-- Candidate table
CREATE TABLE Candidate (
    candidate_id SERIAL PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL
);

-- Form table
CREATE TABLE Form (
    form_id SERIAL PRIMARY KEY,
    recruiter_id TEXT NOT NULL REFERENCES Recruiter(recruiter_id),
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Question table
CREATE TABLE Question (
    question_id SERIAL PRIMARY KEY,
    form_id INTEGER NOT NULL REFERENCES Form(form_id),
    question_text TEXT NOT NULL,
    question_type question_type_enum NOT NULL,
    question_order INTEGER NOT NULL
);

-- FormEntry table
CREATE TABLE FormEntry (
    form_entry_id SERIAL PRIMARY KEY,
    candidate_id INTEGER NOT NULL REFERENCES Candidate(candidate_id),
    form_id INTEGER NOT NULL REFERENCES Form(form_id),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Unified Answer table
CREATE TABLE Answer (
    answer_id SERIAL PRIMARY KEY,
    candidate_id INTEGER NOT NULL REFERENCES Candidate(candidate_id),
    question_id INTEGER NOT NULL REFERENCES Question(question_id),
    answer_type question_type_enum NOT NULL,
    response_text TEXT,
    video_id TEXT,
    CHECK (
        (answer_type = 'text' AND response_text IS NOT NULL AND video_id IS NULL) OR
        (answer_type = 'video' AND video_id IS NOT NULL AND response_text IS NULL)
    )
);

-- Indexes for performance
CREATE INDEX idx_form_recruiter ON Form(recruiter_id);
CREATE INDEX idx_question_form ON Question(form_id);
CREATE INDEX idx_entry_candidate ON FormEntry(candidate_id);
CREATE INDEX idx_entry_form ON FormEntry(form_id);
CREATE INDEX idx_answer_question ON Answer(question_id);
CREATE INDEX idx_answer_candidate ON Answer(candidate_id);
