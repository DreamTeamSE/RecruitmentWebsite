// src/app/applications-review/[applicationId]/[applicantSubmissionId]/page.tsx
// THIS IS A SERVER COMPONENT. Ensure "use client" is NOT at the top of this file.

import React from 'react';
// Adjust the import path to where your Client Component is located
import IndividualApplicantReviewDisplay from '@/components/applications/ApplicantReviewPage';
import { notFound } from 'next/navigation';
// Import your data fetching logic and types
import { 
  getIndividualApplicantReviewDisplayData, 
  allApplicationTypesForReview // Used for generateStaticParams
} from '@/lib/data/applicant/applicantIDData'; // Adjust path as needed

// generateStaticParams for this nested dynamic route
export async function generateStaticParams() {
  const paths: { applicationId: string; applicantSubmissionId: string }[] = [];
  if (allApplicationTypesForReview) {
    allApplicationTypesForReview.forEach(appType => {
      appType.submissions.forEach(submission => {
        paths.push({
          applicationId: appType.id,
          applicantSubmissionId: submission.id,
        });
      });
    });
  }
  return paths;
}

interface PageProps {
  params: {
    applicationId: string;
    applicantSubmissionId: string;
  };
}

export default async function ApplicantReviewDetailPage({ params }: PageProps) {
  const { applicationId, applicantSubmissionId } = params;
  
  // Fetch the specific applicant's review data
  // In a real app, getIndividualApplicantReviewDisplayData might be an async DB call
  const reviewData = getIndividualApplicantReviewDisplayData(applicationId, applicantSubmissionId);

  if (!reviewData) {
    notFound(); // Renders the closest not-found.js or Next.js default 404 page
  }

  return (
    <IndividualApplicantReviewDisplay 
      reviewData={reviewData} 
      applicationTypeId={applicationId} // Pass applicationId for navigation links in client component
    />
  );
}
