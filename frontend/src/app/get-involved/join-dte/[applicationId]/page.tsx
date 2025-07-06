// join-dte/[applicationId]/page.tsx
import React from 'react';
import ApplicationTemplate from '@/components/involved/join-dte/ApplicationTemplate';

interface PageProps {
  params: Promise<{
    applicationId: string;
  }>;
}

export default async function Page({ params }: PageProps) {
  const { applicationId } = await params;

  return <ApplicationTemplate applicationId={applicationId} />;
}
