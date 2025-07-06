// ============================================================================
// Core Application Types
// ============================================================================

/**
 * Represents a job application question
 */
export interface ApplicationQuestion {
  id: string;
  questionText: string;
  type: 'text' | 'textarea';
  placeholder?: string;
  required?: boolean;
  order?: number;
}

/**
 * Represents an applicant's answer to a specific question
 */
export interface ApplicantAnswer {
  questionId: string;
  answer: string;
}

/**
 * Form data state for application submissions
 */
export interface FormDataState {
  firstName: string;
  lastName: string;
  email: string;
  [key: string]: string;
}

// ============================================================================
// Application Management Types
// ============================================================================

/**
 * Represents a job application posting
 */
export interface Application {
  id: string;
  name: string;
  term: string;
  deadline?: string;
  closedDate?: string;
  status: 'open' | 'closed';
  href?: string;
}

/**
 * Extended application data with additional details
 */
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

/**
 * Props for application detail components
 */
export interface ApplicationDetailProps {
  application: ApplicationData;
}

// ============================================================================
// Applicant and Submission Types
// ============================================================================

/**
 * Represents an applicant in the review system
 */
export interface Applicant {
  id: string;
  name: string;
  appliedDate: string;
  score?: number;
  applicationLink?: string;
}

/**
 * Represents a single applicant's submission
 */
export interface ApplicantSubmission {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  appliedDate?: string;
  answers: ApplicantAnswer[];
  currentNotes?: string;
  currentScore?: string;
}

// ============================================================================
// Review System Types
// ============================================================================

/**
 * Represents an application type for the review system
 */
export interface ApplicationTypeForReview {
  id: string;
  name: string;
  term: string;
  questions: ApplicationQuestion[];
  submissions: ApplicantSubmission[];
}

/**
 * Data structure for individual review pages
 */
export interface IndividualReviewPageDisplayData {
  applicationName: string;
  applicationTerm: string;
  applicantSubmission: ApplicantSubmission;
  applicationQuestions: ApplicationQuestion[];
}

/**
 * Props for individual applicant review components
 */
export interface IndividualApplicantReviewDisplayProps {
  reviewData: IndividualReviewPageDisplayData;
  applicationTypeId: string;
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * API response for form entries
 */
export interface FormEntriesResponse {
  formTitle: string;
  entries: Array<{
    id: number;
    applicant_id: number;
    form_id: number;
    submitted_at: string;
    applicant: {
      first_name: string;
      last_name: string;
    } | null;
  }>;
}

/**
 * API response for question data
 */
export interface QuestionApiResponse {
  id?: number;
  question_order: number;
  question_text: string;
  question_type: string;
}

/**
 * API response for form data
 */
export interface FormApiResponse {
  id: number;
  title: string;
  description: string;
  created_at: string;
  recruiter_id?: string;
  staff_id?: string;
}

// ============================================================================
// Form Creation Types
// ============================================================================

/**
 * Data structure for creating new application forms
 */
export interface CreateFormData {
  title: string;
  description: string;
  questions: Omit<ApplicationQuestion, 'id'>[];
}

/**
 * State for form creation process
 */
export interface FormCreationState {
  isSubmitting: boolean;
  errors: Record<string, string>;
  step: number;
}