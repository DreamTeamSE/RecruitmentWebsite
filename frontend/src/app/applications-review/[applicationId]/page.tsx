// src/app/applications-review/[applicationId]/page.tsx
// SERVER COMPONENT. Do NOT add "use client"

import React from 'react';
import { notFound } from 'next/navigation';
import ApplicationReviewClientPage, { type Applicant } from '@/components/applications/ApplicationReviewPage';
import { allApplicationTypesForReview } from '@/lib/data/applicant/applicantIDData';

// Extracts the simplified Applicant[] list for the client component
function getApplicationReviewData(applicationId: string): {
  applicationName: string;
  applicationTerm: string;
  submittedApplicants: Applicant[];
} | undefined {
  const application = allApplicationTypesForReview.find(app => app.id === applicationId);

  if (!application) return undefined;

  const submittedApplicants: Applicant[] = application.submissions.map(sub => {
    let scoreValue: number | undefined = undefined;

    if (sub.currentScore) {
      const match = sub.currentScore.match(/(\d+(\.\d+)?)/);
      if (match) scoreValue = parseFloat(match[1]);
    }

    return {
      id: sub.id,
      name: `${sub.firstName} ${sub.lastName}`,
      appliedDate: sub.appliedDate ?? 'N/A',
      score: scoreValue,
      applicationLink: `/applications-review/${applicationId}/${sub.id}`,
    };
  });

  return {
    applicationName: application.name,
    applicationTerm: application.term,
    submittedApplicants,
  };
}

// Generate static paths for each application ID
export async function generateStaticParams() {
  return allApplicationTypesForReview.map(app => ({
    applicationId: app.id,
  }));
}

interface PageProps {
  params: {
    applicationId: string;
  };
}

// Server Component Page
export default function Page({ params }: PageProps) {
  const { applicationId } = params;
  const reviewData = getApplicationReviewData(applicationId);

  if (!reviewData) {
    notFound();
  }

  return (
    <ApplicationReviewClientPage
      applicationName={reviewData.applicationName}
      applicationTerm={reviewData.applicationTerm}
      submittedApplicants={reviewData.submittedApplicants}
    />
  );
}
