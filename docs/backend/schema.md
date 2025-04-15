# 📘 Database Schema Documentation

This document describes the structure of the core tables in the database.

---

## 🗂️ Table: `Recruiter`

### Description
Stores information about recruiters who can create forms.

| Column Name   | Data Type | Constraints     | Description                    |
|---------------|-----------|------------------|--------------------------------|
| recruiter_id  | SERIAL    | PRIMARY KEY     | Unique ID for the recruiter   |
| first_name    | TEXT      | NOT NULL        | Recruiter's first name        |
| last_name     | TEXT      | NOT NULL        | Recruiter's last name         |

---

## 🗂️ Table: `Form`

### Description
Stores the forms created by recruiters. Each form can have multiple questions.

| Column Name   | Data Type   | Constraints               | Description                            |
|---------------|-------------|----------------------------|----------------------------------------|
| form_id       | SERIAL      | PRIMARY KEY               | Unique identifier for each form        |
| recruiter_id  | INTEGER     | NOT NULL, FOREIGN KEY     | Refers to the recruiter who created it |
| title         | TEXT        | NOT NULL                  | Title of the form                      |
| description   | TEXT        | *Optional*                | Brief description of the form          |
| created_at    | TIMESTAMP   | DEFAULT now()             | Creation timestamp                     |

### Relationships

- `recruiter_id` → `Recruiter.recruiter_id` (Many-to-One)
- `form_id` → `Question.form_id` (One-to-Many)

---

## 🗂️ Table: `Question`

### Description
Stores the individual questions for each form.

| Column Name     | Data Type | Constraints              | Description                         |
|------------------|-----------|---------------------------|-------------------------------------|
| question_id      | SERIAL    | PRIMARY KEY              | Unique question identifier          |
| form_id          | INTEGER   | NOT NULL, FOREIGN KEY    | The form this question belongs to   |
| question_text    | TEXT      | NOT NULL                 | The actual question                 |
| question_type    | TEXT      | NOT NULL                 | Type (e.g., text, video, multiple)  |
| order            | INTEGER   | NOT NULL                 | Order of the question in the form   |

---

## 🗂️ Table: `User`

### Description
Stores user information.

| Column Name   | Data Type | Constraints     | Description                  |
|---------------|-----------|------------------|------------------------------|
| user_id  | SERIAL    | PRIMARY KEY     | Unique user ID          |
| first_name    | TEXT      | NOT NULL        | User's first name       |
| last_name     | TEXT      | NOT NULL        | User's last name        |

---

## 🗂️ Table: `FormEntry`

### Description
Represents a submission of a form by a user.

| Column Name     | Data Type | Constraints              | Description                         |
|------------------|-----------|---------------------------|-------------------------------------|
| form_entry_id    | SERIAL    | PRIMARY KEY              | Unique ID for the entry             |
| user_id     | INTEGER   | NOT NULL, FOREIGN KEY    | User who submitted the form    |
| form_id          | INTEGER   | NOT NULL, FOREIGN KEY    | Form that was submitted             |
| submitted_at     | TIMESTAMP | DEFAULT now()            | Time of submission                  |

---

## 🗂️ Table: `Answer`

### Description
Stores answers submitted by users for each question.

| Column Name   | Data Type | Constraints              | Description                     |
|---------------|-----------|---------------------------|---------------------------------|
| answer_id     | SERIAL    | PRIMARY KEY              | Unique answer ID                |
| user_id  | INTEGER   | NOT NULL, FOREIGN KEY    | Who answered                    |
| question_id   | INTEGER   | NOT NULL, FOREIGN KEY    | The question being answered     |

---

## 🗂️ Table: `AnswerText`

### Description
Textual responses for text-type questions.

| Column Name    | Data Type | Constraints              | Description                    |
|----------------|-----------|---------------------------|--------------------------------|
| response_id    | INTEGER   | PRIMARY KEY, FOREIGN KEY | Matches `Answer.answer_id`     |
| response_text  | TEXT      | NOT NULL                 | The actual text response       |

---

## 🗂️ Table: `AnswerVideo`

### Description
Video responses for video-type questions.

| Column Name    | Data Type | Constraints              | Description                    |
|----------------|-----------|---------------------------|--------------------------------|
| response_id    | INTEGER   | PRIMARY KEY, FOREIGN KEY | Matches `Answer.answer_id`     |
| video_id       | TEXT      | NOT NULL                 | Video reference identifier     |

---
