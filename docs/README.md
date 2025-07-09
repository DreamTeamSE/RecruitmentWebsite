# Recruitment Website

This project is a full-stack recruitment platform with a backend API and a frontend web application.

## Prerequisites

- **Node.js**: Make sure you have Node.js installed on your system. Use the **LTS (Long-Term Support)** version for compatibility.

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-repo/recruitment-website.git
cd recruitment-website
```

---

## Backend Environment

### Steps to Start the Backend

1. Navigate to the backend directory:

   ```bash
   cd backend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the PostgreSQL database using Docker:

   ```bash
   docker-compose up -d
   ```

4. Build and start the backend server:

   ```bash
   npm run dev
   ```

The backend server will run on `http://localhost:3000`.

---

## Frontend Environment

### Steps to Start the Frontend

1. Navigate to the frontend directory:

   ```bash
   cd frontend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

The frontend application will run on `http://localhost:3000`.

---

## Notes

- Ensure the backend is running before starting the frontend.
- For any issues, check the logs of the backend and frontend environments.