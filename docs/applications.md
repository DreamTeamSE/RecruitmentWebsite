# Applications

## Table: `Form`

**Description**: Represents forms created by recruiters, each containing multiple questions.

| Column Name  | Data Type | Constraints                          | Description                         |
|--------------|-----------|--------------------------------------|-------------------------------------|
| id           | SERIAL    | PRIMARY KEY                          | Unique identifier for each form     |
| recruiter_id | TEXT      | NOT NULL, FOREIGN KEY                | References the recruiter who created the form |
| title        | TEXT      | NOT NULL                             | Title of the form                   |
| description  | TEXT      | *Optional*                           | Brief description of the form       |
| created_at   | TIMESTAMP | DEFAULT now()                        | Timestamp when the form was created |

**Relationships**:
- `recruiter_id` → `Recruiter.uuid` (Many-to-One)
- `id` → `Question.form_id` (One-to-Many)

## Table: `Question`

**Description**: Contains individual questions associated with a form.

| Column Name   | Data Type | Constraints                          | Description                          |
|---------------|-----------|--------------------------------------|--------------------------------------|
| id            | SERIAL    | PRIMARY KEY                          | Unique identifier for each question  |
| form_id       | INTEGER   | NOT NULL, FOREIGN KEY                | References the form this question belongs to |
| question_text | TEXT      | NOT NULL                             | The text of the question             |
| question_type | TEXT      | NOT NULL                             | Type of question (e.g., text, video) |
| question_order| INTEGER   | NOT NULL, UNIQUE (form_id, question_order) | Order of the question in the form    |

**Relationships**:
- `form_id` → `Form.id` (Many-to-One)

## Table: `FormEntry`

**Description**: Represents an applicant's submission of a form.

| Column Name   | Data Type | Constraints                          | Description                          |
|---------------|-----------|--------------------------------------|--------------------------------------|
| id            | SERIAL    | PRIMARY KEY                          | Unique identifier for each form entry |
| applicant_id  | INTEGER   | NOT NULL, FOREIGN KEY                | References the applicant who submitted the form |
| form_id       | INTEGER   | NOT NULL, FOREIGN KEY                | References the form that was submitted |
| submitted_at  | TIMESTAMP | DEFAULT date_trunc('second', now())  | Timestamp when the form was submitted |
| UNIQUE        | (form_id, applicant_id)                          | Ensures each applicant can submit a form only once |

**Relationships**:
- `applicant_id` → `Applicant.id` (Many-to-One)
- `form_id` → `Form.id` (Many-to-One)

## Table: `Answer`

**Description**: Represents answers submitted by applicants for specific questions.

| Column Name   | Data Type | Constraints                          | Description                          |
|---------------|-----------|--------------------------------------|--------------------------------------|
| id            | SERIAL    | PRIMARY KEY                          | Unique identifier for each answer    |
| answer_type   | TEXT      | NOT NULL                             | Type of answer (e.g., text, video)   |
| applicant_id  | INTEGER   | NOT NULL, FOREIGN KEY                | References the applicant who submitted the answer |
| question_id   | INTEGER   | NOT NULL, UNIQUE, FOREIGN KEY        | References the question being answered |

**Relationships**:
- `applicant_id` → `Applicant.id` (Many-to-One)
- `question_id` → `Question.id` (Many-to-One)

## Table: `AnswerText`

**Description**: Stores text-based answers.

| Column Name   | Data Type | Constraints                          | Description                          |
|---------------|-----------|--------------------------------------|--------------------------------------|
| answer_id     | INTEGER   | PRIMARY KEY, UNIQUE, FOREIGN KEY     | References the associated answer     |
| response_text | TEXT      | NOT NULL                             | The text response                    |

**Relationships**:
- `answer_id` → `Answer.id` (One-to-One)

## Table: `AnswerVideo`

**Description**: Stores video-based answers.

| Column Name   | Data Type | Constraints                          | Description                          |
|---------------|-----------|--------------------------------------|--------------------------------------|
| id            | INTEGER   | PRIMARY KEY, UNIQUE, FOREIGN KEY     | References the associated answer     |
| video_id      | TEXT      | NOT NULL                             | Identifier for the video response    |

**Relationships**:
- `id` → `Answer.id` (One-to-One)

## Table: `RecruiterApplicationNotes`

**Description**: Stores notes and scores provided by recruiters for form entries.

| Column Name      | Data Type | Constraints                          | Description                          |
|------------------|-----------|--------------------------------------|--------------------------------------|
| id               | SERIAL    | PRIMARY KEY                          | Unique identifier for each note      |
| form_entry_id    | INTEGER   | UNIQUE, FOREIGN KEY                  | References the associated form entry |
| notes            | TEXT      | *Optional*                           | Notes provided by the recruiter      |
| score            | NUMERIC   | *Optional*                           | Score assigned by the recruiter      |

**Relationships**:
- `form_entry_id` → `FormEntry.id` (One-to-One)
