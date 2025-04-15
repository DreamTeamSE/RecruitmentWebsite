# Applicants

## Table: `Recruiter`

**Description**: Stores information about recruiters who can create forms and conduct interviews.

| Column Name | Data Type | Constraints       | Description                    |
|-------------|-----------|-------------------|--------------------------------|
| id          | SERIAL    | PRIMARY KEY       | Unique ID for the recruiter    |
| uuid        | TEXT      | UNIQUE, NOT NULL  | External unique identifier     |
| first_name  | TEXT      | NOT NULL          | Recruiter's first name         |
| last_name   | TEXT      | NOT NULL          | Recruiter's last name          |

## Table: `Applicant`

**Description**: Stores information about applicants who submit form entries.

| Column Name | Data Type | Constraints | Description                 |
|-------------|-----------|-------------|-----------------------------|
| id          | SERIAL    | PRIMARY KEY | Unique ID for the applicant |
| first_name  | TEXT      | NOT NULL    | Applicant's first name      |
| last_name   | TEXT      | NOT NULL    | Applicant's last name       |
