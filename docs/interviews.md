# Interviews

## Table: `Interview`

**Description**: Represents an interview session that uses a specific form template and is created by a recruiter.

| Column Name   | Data Type | Constraints                          | Description                                       |
|---------------|-----------|--------------------------------------|---------------------------------------------------|
| id            | SERIAL    | PRIMARY KEY                          | Unique identifier for each interview              |
| form_id       | INTEGER   | NOT NULL, UNIQUE, FOREIGN KEY        | References the form template used for interview   |
| created_by    | TEXT      | NOT NULL, FOREIGN KEY                | References the recruiter (uuid) who created it    |
| created_at    | TIMESTAMP | DEFAULT now()                        | Timestamp of when the interview was created       |

## Table: `InterviewEntry`

**Description**: Links a candidate’s form submission to a specific interview session and tracks who selected them.

| Column Name     | Data Type | Constraints                               | Description                                                    |
|------------------|-----------|-------------------------------------------|----------------------------------------------------------------|
| id               | SERIAL    | PRIMARY KEY                               | Unique identifier for each interview entry                     |
| interview_id     | INTEGER   | NOT NULL, FOREIGN KEY                     | References the interview this entry belongs to                 |
| form_entry_id    | INTEGER   | NOT NULL, FOREIGN KEY                     | References the candidate's form submission                     |
| selected_by      | TEXT      | NOT NULL, FOREIGN KEY                     | References the recruiter (uuid) who selected the candidate     |
| UNIQUE Constraint| —         | UNIQUE(interview_id, form_entry_id)       | Ensures each form entry appears only once per interview        |

## Table: `InterviewNotes`

**Description**: Contains evaluator notes and scores for individual interview entries.

| Column Name        | Data Type | Constraints                          | Description                                          |
|--------------------|-----------|--------------------------------------|------------------------------------------------------|
| id                 | SERIAL    | PRIMARY KEY                          | Unique identifier for each note                     |
| interview_entry_id | INTEGER   | NOT NULL, UNIQUE, FOREIGN KEY        | References the interview entry being evaluated      |
| notes              | TEXT      | *Optional*                           | Notes provided by the evaluator                     |
| score              | NUMERIC   | *Optional*                           | Numeric score assigned to the candidate             |
