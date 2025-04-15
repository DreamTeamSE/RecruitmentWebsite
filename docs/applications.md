# Applications

## Table: `Form`

**Description**: Represents forms created by recruiters, each containing multiple questions.

| Column Name  | Data Type | Constraints                          | Description                         |
|--------------|-----------|--------------------------------------|-------------------------------------|
| form_id      | SERIAL    | PRIMARY KEY                          | Unique identifier for each form     |
| recruiter_id | INTEGER   | NOT NULL, FOREIGN KEY                | References the recruiter who created the form |
| title        | TEXT      | NOT NULL                             | Title of the form                   |
| description  | TEXT      | *Optional*                           | Brief description of the form       |
| created_at   | TIMESTAMP | DEFAULT now()                        | Timestamp when the form was created |

**Relationships**:
- `recruiter_id` → `Recruiter.recruiter_id` (Many-to-One)
- `form_id` → `Question.form_id` (One-to-Many)

## Table: `Question`

**Description**: Contains individual questions associated with a form.

| Column Name   | Data Type | Constraints                          | Description                          |
|---------------|-----------|--------------------------------------|--------------------------------------|
| question_id   | SERIAL    | PRIMARY KEY                          | Unique identifier for each question  |
| form_id       | INTEGER   | NOT NULL, FOREIGN KEY                | References the form this question belongs to |
| question_text | TEXT      | NOT NULL                             | The text of the question             |
| question_type | TEXT      | NOT NULL                             | Type of question (e.g., text, video) |
| order         | INTEGER   | NOT NULL                             | Order of the question in the form    |

## Table: `FormEntry`

**Description**: Represents a applicant's submission of a form.

| Column Name   | Data Type | Constraints                          | Description                          |
|---------------|-----------|--------------------------------------|--------------------------------------|
| form_entry_id | SERIAL    | PRIMARY KEY                          | Unique identifier for each form entry |
| applicant_id  | INTEGER   | NOT NULL, FOREIGN KEY                | References the applicant who submitted the form |
| form_id       | INTEGER   | NOT NULL, FOREIGN KEY                | References the form that was submitted |
| submitted_at  | TIMESTAMP | DEFAULT now()                        | Timestamp when the form was submitted |
