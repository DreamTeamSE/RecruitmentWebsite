import React from "react";
import ApplicationsList from "./application_list";

type Application = {
  title: string;
  deadline: string;
};

interface ApplicationsSectionProps {
  title: string;
  applications: Application[];
}

export default function ApplicationsSection({ title, applications }: ApplicationsSectionProps) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h1
        style={{
          textAlign: "center",
          fontSize: "2.5rem",
          fontWeight: 500,
          fontFamily: "Georgia, serif",
          fontStyle: "italic",
          marginTop: 40,
          marginBottom: 32,
        }}
      >
        {title}
      </h1>
      <ApplicationsList applications={applications} />
    </section>
  );
}
