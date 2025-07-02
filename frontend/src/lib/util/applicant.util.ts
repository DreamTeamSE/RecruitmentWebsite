// src/lib/util/applicant.util.ts

import { IndividualReviewPageDisplayData } from '@/models/types/application';
import { allApplicationTypesForReview } from '../data/applicant/applicantIDData';

// ✅ Mark function async
export async function getIndividualApplicantReviewDisplayData(
  applicationId: string,
  applicantSubmissionId: string
): Promise<IndividualReviewPageDisplayData | undefined> {
  const applicationType = allApplicationTypesForReview.find(app => app.id === applicationId);

  if (!applicationType) {
    console.error(`Application type with ID "${applicationId}" not found.`);
    return undefined;
  }

  const applicantSubmission = applicationType.submissions.find(sub => sub.id === applicantSubmissionId);

  if (!applicantSubmission) {
    console.error(`Applicant submission with ID "${applicantSubmissionId}" not found for application type "${applicationId}".`);
    return undefined;
  }

  return {
    applicationName: applicationType.name,
    applicationTerm: applicationType.term,
    applicationQuestions: applicationType.questions,
    applicantSubmission,
  };
}
