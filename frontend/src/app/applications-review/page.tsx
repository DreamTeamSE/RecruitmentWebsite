import ApplicationsSection from "@/components/applications/ReviewableApplications";
import AuthGuard from "@/components/auth/AuthGuard";
import React from "react";

export default function Page() {
  return (
    <AuthGuard>
      <ApplicationsSection />
    </AuthGuard>
  );
}
