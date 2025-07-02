"use client";

import React from 'react';
import CreateApplicationForm from '@/components/applications/CreateApplicationForm';
import AuthGuard from "@/components/auth/AuthGuard";

export default function CreateApplicationPage() {
  return (
    <AuthGuard>
      <CreateApplicationForm />
    </AuthGuard>
  );
}
