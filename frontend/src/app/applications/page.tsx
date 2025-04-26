import React from "react";
import ApplicationsSection from "../../components/ui/sections/applications/application_section";

const open_applications = [
  { title: "General Shadowing | Fall 2025", deadline: "9/10/25" },
  { title: "Design | Fall 2025", deadline: "9/10/25" },
  { title: "Research | Fall 2025", deadline: "9/10/25" },
  { title: "Software | Fall 2025", deadline: "9/10/25" },
  { title: "Stem Special Events | Fall 2025", deadline: "9/10/25" },
];

const closed_applications = [
  { title: "General Shadowing | Fall 2024", deadline: "9/10/24" },
  { title: "Design | Fall 2024", deadline: "9/10/24" },
  { title: "Research | Fall 2024", deadline: "9/10/24" },
  { title: "Software | Fall 2024", deadline: "9/10/24" },
  { title: "Stem Special Events | Fall 2024", deadline: "9/10/24" },
];

export default function ApplicationsPage() {
  return (
    <div className="w-full flex flex-col items-center" style={{ background: "#f6f8fe", minHeight: "100vh", paddingTop: 35 }}>
      <ApplicationsSection title="Open Applications" applications={open_applications} />
      <ApplicationsSection title="Closed Applications" applications={closed_applications} />
    </div>
  );
}
