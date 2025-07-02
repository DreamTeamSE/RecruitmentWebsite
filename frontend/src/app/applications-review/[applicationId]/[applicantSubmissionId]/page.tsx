// src/app/applications-review/[applicationId]/[applicantSubmissionId]/page.tsx
// THIS IS A SERVER COMPONENT. Ensure "use client" is NOT at the top of this file.

import React from 'react';
import { notFound } from 'next/navigation';

import IndividualApplicantReviewDisplay from '@/components/applications/ApplicantReviewPage';
import { getIndividualApplicantReviewDisplayData } from '@/lib/util/applicant.util';

export default async function ApplicantReviewDetailPage({
  params,
}: {
  params: { applicationId: string; applicantSubmissionId: string };
}) {
  const { applicationId, applicantSubmissionId } = params;

  const reviewData = await getIndividualApplicantReviewDisplayData(applicationId, applicantSubmissionId);

  if (!reviewData) {
    notFound();
  }

  return (
    <IndividualApplicantReviewDisplay
      reviewData={reviewData}
      applicationTypeId={applicationId}
    />
  );
}
