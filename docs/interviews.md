# Interviews

## Table: `Interview`

**Description**: Represents an interview associated with a specific form entry and conducted by a recruiter.

| Column Name   | Data Type | Constraints                          | Description                          |
|---------------|-----------|--------------------------------------|--------------------------------------|
| interview_id  | SERIAL    | PRIMARY KEY                          | Unique identifier for each interview |
| form_entry_id | INTEGER   | NOT NULL, FOREIGN KEY                | References the form entry being interviewed |
| recruiter_id  | INTEGER   | NOT NULL, FOREIGN KEY                | References the recruiter conducting the interview |

## Table: `InterviewNotes`

**Description**: Contains notes and scores provided by recruiters on interviews.

| Column Name        | Data Type | Constraints                          | Description                          |
|--------------------|-----------|--------------------------------------|--------------------------------------|
| recruiter_notes_id | SERIAL    | PRIMARY KEY                          | Unique identifier for each note      |
| interview_id       | INTEGER   | FOREIGN KEY                          | References the interview being noted |
| notes              | TEXT      | *Optional*                           | Notes provided by the recruiter      |
| score              | NUMERIC   | *Optional*                           | Score assigned by the recruiter      |
