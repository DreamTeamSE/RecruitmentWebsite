import React from 'react';
import EditApplicationForm from '@/components/applications/EditApplicationForm';

interface PageProps {
  params: Promise<{
    applicationId: string;
  }>;
}

export default async function EditApplicationPage({ params }: PageProps) {
  const { applicationId } = await params;

  return <EditApplicationForm applicationId={applicationId} />;
}
