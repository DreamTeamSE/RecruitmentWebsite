# Users

## Table: `Recruiter`

**Description**: Stores information about recruiters who can create forms and conduct interviews.

| Column Name | Data Type | Constraints       | Description                    |
|-------------|-----------|-------------------|--------------------------------|
| id          | SERIAL    | PRIMARY KEY       | Unique ID for the recruiter    |
| uuid        | TEXT      | UNIQUE, NOT NULL  | External unique identifier     |
| first_name  | TEXT      | NOT NULL          | Recruiter's first name         |
| last_name   | TEXT      | NOT NULL          | Recruiter's last name          |

## Table: `User`

**Description**: Stores information about users who submit form entries.

| Column Name | Data Type | Constraints | Description                 |
|-------------|-----------|-------------|-----------------------------|
| id          | SERIAL    | PRIMARY KEY | Unique ID for the user |
| first_name  | TEXT      | NOT NULL    | User's first name      |
| last_name   | TEXT      | NOT NULL    | User's last name       |
