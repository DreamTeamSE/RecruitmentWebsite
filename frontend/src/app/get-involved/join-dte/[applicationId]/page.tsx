"use client";

import React from 'react';
import ApplicationDetailPageContent, { ApplicationData } from '@/components/involved/join-dte/ApplicationTemplate'; // Adjust path if needed
import { applicationsData } from '@/lib/data/application/application';
import { notFound } from 'next/navigation';

interface PageProps {
  params: {
    applicationId: string;
  };
}

export default function Page({ params }: PageProps) {
  const { applicationId } = params;

  const application: ApplicationData | undefined = applicationsData.find(app => app.id === applicationId);

  if (!application) {
    notFound();
  }

  return <ApplicationDetailPageContent application={application} />;
}
