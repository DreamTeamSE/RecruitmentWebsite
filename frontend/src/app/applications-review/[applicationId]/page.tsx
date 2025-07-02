// src/app/applications-review/[applicationId]/page.tsx
// SERVER COMPONENT. Do NOT add "use client"

import React from 'react';
import { notFound } from 'next/navigation';
import ApplicationReviewClientPage from '@/components/applications/ApplicationReviewPage';
import { Applicant } from '@/models/types/application';

// Mock function to get application review data from form ID
// In a real app, this would fetch from your API
async function getApplicationReviewData(applicationId: string): Promise<{
  applicationName: string;
  applicationTerm: string;
  submittedApplicants: Applicant[];
} | null> {
  try {
    // Fetch the specific form data
    const response = await fetch(`http://localhost:3000/api/forms/feed`);
    const data = await response.json();
    const form = data.feed.find((f: any) => f.id.toString() === applicationId);
    
    if (!form) return null;

    // Mock applicant data - in real app, you'd fetch actual submissions
    const mockApplicants: Applicant[] = [
      {
        id: "1",
        name: "John Doe",
        appliedDate: "2025-05-15",
        score: 8.5,
        applicationLink: `/applications-review/${applicationId}/1`
      },
      {
        id: "2", 
        name: "Jane Smith",
        appliedDate: "2025-05-16",
        score: 9.2,
        applicationLink: `/applications-review/${applicationId}/2`
      }
    ];

    return {
      applicationName: form.title,
      applicationTerm: "Fall 2025", // Could be derived from form data
      submittedApplicants: mockApplicants,
    };
  } catch (error) {
    console.error('Error fetching application data:', error);
    return null;
  }
}

// Generate static paths for each application ID
export async function generateStaticParams() {
  try {
    const response = await fetch('http://localhost:3000/api/forms/feed');
    const data = await response.json();
    return data.feed.map((form: any) => ({
      applicationId: form.id.toString(),
    }));
  } catch (error) {
    // Return empty array if API is not available
    return [];
  }
}

interface PageProps {
  params: {
    applicationId: string;
  };
}

// Server Component Page
export default async function Page({ params }: PageProps) {
  const { applicationId } = params;
  const reviewData = await getApplicationReviewData(applicationId);

  if (!reviewData) {
    notFound();
  }

  return (
    <ApplicationReviewClientPage
      applicationId={applicationId}
      applicationName={reviewData.applicationName}
      applicationTerm={reviewData.applicationTerm}
      submittedApplicants={reviewData.submittedApplicants}
    />
  );
}
