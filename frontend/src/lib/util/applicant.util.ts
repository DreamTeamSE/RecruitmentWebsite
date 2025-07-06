// src/lib/util/applicant.util.ts

import { IndividualReviewPageDisplayData } from '@/models/types/application';
import axios from 'axios';

// ✅ Mark function async
export async function getIndividualApplicantReviewDisplayData(
  applicationId: string,
  applicantSubmissionId: string
): Promise<IndividualReviewPageDisplayData | undefined> {
  try {
    const response = await axios.get(`http://${process.env.NEXT_PUBLIC_BACKEND_URL}/api/forms/${applicationId}/entries/${applicantSubmissionId}`);
    const data = response.data as {
      applicationName: string;
      applicationDescription: string;
      applicationQuestions: Record<string, unknown>[];
      applicantSubmission: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        appliedDate: string;
        answers: { questionId: string; answer: string }[];
        currentNotes: string;
        currentScore: string;
      };
    };

    if (!data) {
      console.error(`Applicant submission with ID "${applicantSubmissionId}" not found for application type "${applicationId}".`);
      return undefined;
    }

    return {
      applicationName: data.applicationName,
      applicationDescription: data.applicationDescription,
      applicationQuestions: data.applicationQuestions,
      applicantSubmission: data.applicantSubmission,
    };
  } catch (error) {
    console.error("Error fetching individual applicant review data:", error);
    return undefined;
  }
}
