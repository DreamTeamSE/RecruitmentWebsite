export interface IndividualApplicantReviewDisplayProps {
  reviewData: IndividualReviewPageDisplayData;
  // The applicationId is the ID of the application type (e.g., "software-fall-2025")
  // It's needed to construct correct URLs for prev/next navigation.
  applicationTypeId: string;
}

export interface Applicant {
  id: string;
  name: string;
  appliedDate: string;
  score?: number;
  applicationLink?: string; // Link to the full application details of this applicant
}




// Defines the structure for a single applicant's submission
export interface ApplicantSubmission {
  id: string; // Applicant's unique submission ID (e.g., "max-martin-sw")
  firstName: string;
  lastName: string;
  email?: string;
  appliedDate?: string;
  answers: ApplicantAnswer[]; // Array of answers provided by the applicant
  // Fields for reviewer - these would typically be saved/fetched from a database for persistence
  currentNotes?: string;
  currentScore?: string; // e.g., "10/10" or a numerical score
}

// Represents a specific type of application (e.g., Software Fall 2025)
// This structure will hold the questions for that application type and all submissions to it.
export interface ApplicationTypeForReview {
  id: string; // Unique ID for this application type (e.g., "software-fall-2025") - This MUST match the [applicationId] from the URL
  name: string; // e.g., "Software"
  term: string; // e.g., "Fall 2025"
  questions: ApplicationQuestion[]; // The set of questions for this application type
  submissions: ApplicantSubmission[]; // All submissions for this application type
}

// This is the combined data structure that the individual review page component will expect as a prop
export interface IndividualReviewPageDisplayData {
  applicationName: string;
  applicationTerm: string;
  applicantSubmission: ApplicantSubmission;
  applicationQuestions: ApplicationQuestion[]; // The original questions to display alongside answers
}



// Defines the structure of a question for a specific application type
export interface ApplicationQuestion {
  id: string; // Unique ID for the question within its application type (e.g., "sw-q1", "ds-q1")
  questionText: string;
  type: 'text' | 'textarea'; // Type might be relevant for how answers are displayed or were collected
}

// Defines an applicant's answer to a specific question
export interface ApplicantAnswer {
  questionId: string; // Corresponds to ApplicationQuestion.id
  answer: string;
}


export interface Application {
  id: string;
  name: string;
  term: string;
  deadline?: string; // For open applications
  closedDate?: string; // For closed applications
  status: 'open' | 'closed';
  href?: string; // Link to the application page or form (optional, will be constructed from id)
}


export interface ApplicationQuestion {
  id: string;
  questionText: string;
  type: 'text' | 'textarea';
  placeholder?: string;
  required?: boolean;
  order?: number; // Add this field to store the question order for API operations
  dbId?: number; // Add this field to store the database ID for deletions
}

export interface ApplicationData {
  id: string;
  name: string;
  term: string;
  description: string;
  status?: 'open' | 'closed';
  deadline?: string;
  closedDate?: string;
  questions?: ApplicationQuestion[];
}

export interface FormDataState {
  firstName: string;
  lastName: string;
  email: string;
  [key: string]: string;
}

export interface ApplicationDetailProps {
  application: ApplicationData;
}