// src/lib/data/applicantReviewDetailData.ts

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
  previousApplicantSubmissionId?: string; // For "Previous Applicant" button
  nextApplicantSubmissionId?: string;   // For "Next Applicant" button
}

// --- SAMPLE DATA ---
// This would be fetched dynamically in a real application from your database/backend.

const softwareApplicationQuestions: ApplicationQuestion[] = [
  { id: "sw-q1", questionText: "Tell Me About Yourself?", type: "textarea" },
  { id: "sw-q2", questionText: "Why Do You Want To Join Dream Team Engineering for the Software branch?", type: "textarea" },
  { id: "sw-q3", questionText: "Describe a challenging software project you've worked on, including your role and the outcome.", type: "textarea" },
  { id: "sw-q4", questionText: "What are your preferred programming languages and frameworks, and why?", type: "text" },
];

const designApplicationQuestions: ApplicationQuestion[] = [
  { id: "ds-q1", questionText: "Tell Me About Yourself (Design Focus)?", type: "textarea" },
  { id: "ds-q2", questionText: "Why are you passionate about Design in DTE?", type: "textarea" },
  { id: "ds-q3", questionText: "Please provide a link to your design portfolio (e.g., Behance, Dribbble, personal website).", type: "text" },
];

// This array holds all application types available for review, each with their submissions.
export const allApplicationTypesForReview: ApplicationTypeForReview[] = [
  {
    id: "software-fall-2025", // This ID will be the [applicationId] in the URL
    name: "Software",
    term: "Fall 2025",
    questions: softwareApplicationQuestions,
    submissions: [
      {
        id: "max-martin-sw", // This ID will be the [applicantSubmissionId] in the URL
        firstName: "Max",
        lastName: "Martin",
        email: "max.martin@example.com",
        appliedDate: "08/15/2024",
        answers: [
          { questionId: "sw-q1", answer: "I am a dedicated and curious software engineering student with a strong foundation in web development and a growing interest in machine learning applications in healthcare. I thrive in collaborative environments and am always eager to learn new technologies." },
          { questionId: "sw-q2", answer: "DTE's mission to create tangible healthcare solutions resonates deeply with my aspiration to use technology for good. The Software branch, in particular, offers the chance to apply my coding skills to real-world medical challenges alongside a passionate team." },
          { questionId: "sw-q3", answer: "I led a team of three to develop a full-stack web application for a local non-profit, managing their volunteer schedules and event registrations. My role involved backend development with Node.js/Express, database design with PostgreSQL, and frontend work with React. The project successfully streamlined their operations." },
          { questionId: "sw-q4", answer: "Python for its versatility in data science and backend, JavaScript (React/Node.js) for web development, and I'm currently learning Go for its performance." },
        ],
        currentNotes: "Very strong technical answers and clear motivation. Seems like a great fit for the team culture. Follow up on Go experience.",
        currentScore: "9.5/10",
      },
      {
        id: "jane-doe-sw",
        firstName: "Jane",
        lastName: "Doe",
        email: "jane.doe@example.com",
        appliedDate: "08/16/2024",
        answers: [
          { questionId: "sw-q1", answer: "Second-year computer science student, eager to apply classroom knowledge to practical projects." },
          { questionId: "sw-q2", answer: "I want to gain hands-on software development experience and contribute to projects that make a difference." },
          { questionId: "sw-q3", answer: "My most challenging project was building a complex algorithm for my Data Structures and Algorithms final, which required careful planning and debugging." },
          { questionId: "sw-q4", answer: "Proficient in Java and C++, learning Python." },
        ],
        currentNotes: "Good enthusiasm, but answers could be more detailed regarding specific interests in healthcare tech.",
        currentScore: "7/10",
      },
      // Add more applicant submissions for "software-fall-2025"
    ],
  },
  {
    id: "design-fall-2025",
    name: "Design",
    term: "Fall 2025",
    questions: designApplicationQuestions,
    submissions: [
      {
        id: "alice-wonder-ds",
        firstName: "Alice",
        lastName: "Wonderland",
        email: "alice.w@example.com",
        appliedDate: "08/14/2024",
        answers: [
          { questionId: "ds-q1", answer: "I'm a visual thinker with a passion for creating intuitive and accessible user experiences. I love translating complex problems into elegant design solutions." },
          { questionId: "ds-q2", answer: "I believe that thoughtful design is critical in healthcare to make technology usable and effective for both patients and providers. DTE's projects offer a unique opportunity to apply design thinking to this important field." },
          { questionId: "ds-q3", answer: "www.myportfolio.example.com/alice" },
        ],
        currentNotes: "Excellent portfolio, clear passion for UX in healthcare. Seems very promising.",
        currentScore: "9/10",
      },
      // Add more applicant submissions for "design-fall-2025"
    ],
  },
  // Add other application types (e.g., research-fall-2025, gs-fall-2025) with their questions and submissions
  // Ensure their 'id' matches the 'applicationId' used in links from your ApplicationsSection.
  {
    id: "gs-fall-2025",
    name: "General Shadowing",
    term: "Fall 2025",
    questions: [ /* Define questions for General Shadowing */ ],
    submissions: [ /* Add submissions for General Shadowing */ ],
  },
  {
    id: "research-fall-2025",
    name: "Research",
    term: "Fall 2025",
    questions: [ /* Define questions for Research */ ],
    submissions: [ /* Add submissions for Research */ ],
  },
  {
    id: "stem-events-fall-2025",
    name: "Stem Special Events",
    term: "Fall 2025",
    questions: [ /* Define questions for Stem Special Events */ ],
    submissions: [ /* Add submissions for Stem Special Events */ ],
  },
];

// Helper function to simulate fetching the data needed for the individual review display page
// In a real app, this would query your database/API using both applicationId and applicantSubmissionId
export function getIndividualApplicantReviewDisplayData(
  applicationId: string, // e.g., "software-fall-2025"
  applicantSubmissionId: string // e.g., "max-martin-sw"
): IndividualReviewPageDisplayData | undefined {
  const applicationType = allApplicationTypesForReview.find(app => app.id === applicationId);

  if (!applicationType) {
    console.error(`Application type with ID "${applicationId}" not found.`);
    return undefined; // Application type not found
  }

  const applicantSubmission = applicationType.submissions.find(sub => sub.id === applicantSubmissionId);

  if (!applicantSubmission) {
    console.error(`Applicant submission with ID "${applicantSubmissionId}" not found for application type "${applicationId}".`);
    return undefined; // Specific applicant submission not found for this application type
  }

  // Determine previous and next applicant IDs for navigation within this application type
  const currentIndex = applicationType.submissions.findIndex(sub => sub.id === applicantSubmissionId);
  const previousApplicantSubmissionId = currentIndex > 0 ? applicationType.submissions[currentIndex - 1].id : undefined;
  const nextApplicantSubmissionId = currentIndex < applicationType.submissions.length - 1 ? applicationType.submissions[currentIndex + 1].id : undefined;

  return {
    applicationName: applicationType.name,
    applicationTerm: applicationType.term,
    applicationQuestions: applicationType.questions, // The original questions for this application
    applicantSubmission: applicantSubmission,       // The specific applicant's submission data
    previousApplicantSubmissionId,
    nextApplicantSubmissionId,
  };
}
