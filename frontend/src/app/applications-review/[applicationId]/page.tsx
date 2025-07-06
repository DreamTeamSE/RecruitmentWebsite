// src/app/applications-review/[applicationId]/page.tsx
// SERVER COMPONENT. Do NOT add "use client"

import React from 'react';
import { notFound } from 'next/navigation';
import ApplicationReviewClientPage from '@/components/applications/ApplicationReviewPage';

// Fetch application review data from API
async function getApplicationReviewData(applicationId: string): Promise<{
  applicationName: string;
} | null> {
  try {
    const response = await fetch(`http://localhost:3000/api/forms/${applicationId}/entries`);
    const data = await response.json();

    return {
      applicationName: data.formTitle || "Unknown Form",
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
    return data.feed.map((form: { id: number }) => ({
      applicationId: form.id.toString(),
    }));
  } catch {
    // Return empty array if API is not available
    return [];
  }
}

interface PageProps {
  params: Promise<{
    applicationId: string;
  }>;
}

// Server Component Page
export default async function Page({ params }: PageProps) {
  const awaitedParams = await params;
  const { applicationId } = awaitedParams;

  const reviewData = await getApplicationReviewData(applicationId);

  if (!reviewData) {
    notFound();
  }

  return (
    <ApplicationReviewClientPage
      applicationId={applicationId}
      applicationName={reviewData.applicationName}
    />
  );
}
