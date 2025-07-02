# API Testing with HTTP Files

This folder contains HTTP request files to test all endpoints of your Recruitment Website API.

## 📁 Files Overview

- **`forms.http`** - Form management endpoints (CRUD operations)
- **`form-responses.http`** - Form responses, questions, and answers
- **`recruiters.http`** - Recruiter management endpoints
- **`applicants.http`** - Applicant management endpoints  
- **`interviews.http`** - Interview scheduling and management
- **`health-and-errors.http`** - Health checks and error testing
- **`complete-test-suite.http`** - End-to-end testing with variable chaining

## 🚀 How to Use

### Option 1: VS Code REST Client Extension (Recommended)

1. Install the "REST Client" extension in VS Code
2. Open any `.http` file
3. Click "Send Request" above each HTTP request
4. View responses in the right panel

### Option 2: Command Line with curl

Extract the requests and convert them to curl commands:

```bash
# Example: Get all forms
curl -X GET http://localhost:3000/api/forms/feed

# Example: Create a form
curl -X POST http://localhost:3000/api/forms/application \
  -H "Content-Type: application/json" \
  -d '{
    "recruiter_id": "test-recruiter-123",
    "title": "Software Engineering Assessment",
    "description": "This form is used to evaluate software engineering candidates."
  }'
```

### Option 3: Postman

Import the HTTP files into Postman by:
1. Copy the request content
2. Create new requests in Postman
3. Set the method, URL, headers, and body

## 🎯 Quick Start Testing

1. **Start your server:**
   ```bash
   npm start
   ```

2. **Run basic health check:**
   Open `health-and-errors.http` and send the health check request

3. **Test complete flow:**
   Open `complete-test-suite.http` and run requests sequentially

## 📋 API Endpoints Covered

### Forms API (`/api/forms`)
- ✅ GET `/feed` - Get all forms
- ✅ POST `/application` - Create form
- ✅ GET `/:id` - Get form by ID
- ✅ PUT `/:id` - Update form
- ✅ DELETE `/:id` - Delete form
- ✅ POST `/:formId/questions` - Add question to form
- ✅ DELETE `/:formId/questions/:questionId` - Delete question
- ✅ DELETE `/questions/:questionId` - Delete question by ID only

### Form Responses API (`/api/forms/entry`)
- ✅ POST `/application` - Create form entry
- ✅ POST `/question` - Create question with ordering
- ✅ GET `/question` - Get questions for form
- ✅ DELETE `/question/:questionId` - Delete question
- ✅ POST `/answer/text` - Create answer
- ✅ GET `/answer` - Get answers by form entry

### Users API
- ✅ Recruiters (`/api/recruiter/create`) - Create recruiter
- ✅ Applicants (`/api/applicant/create`) - Create applicant

### Interviews API (`/api/interview`)
- ✅ POST `/page` - Create interview
- ✅ POST `/entry` - Create interview entry

## 🔧 Configuration

Update the `@baseUrl` variable in each file to match your server:

```http
@baseUrl = http://localhost:3000
```

For production testing, change to your production URL:

```http
@baseUrl = https://your-production-api.com
```

## 📊 Variable Chaining

The `complete-test-suite.http` file demonstrates variable chaining where responses from previous requests are used in subsequent requests:

```http
# Create form
# @name createForm
POST {{baseUrl}}/api/forms/application
# ... request body ...

# Use form ID in next request
POST {{baseUrl}}/api/forms/{{createForm.response.body.insertedForm.id}}/questions
```

This allows for realistic end-to-end testing scenarios.

## 🐛 Error Testing

The `health-and-errors.http` file includes tests for:
- Invalid endpoints (404 errors)
- Invalid IDs (404 errors)  
- CORS testing
- Server error scenarios

Happy testing! 🎉
