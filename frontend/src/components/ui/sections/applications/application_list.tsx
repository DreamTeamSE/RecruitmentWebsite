import React from "react";

type Application = {
  title: string;
  deadline: string;
};

function ApplicationCard({ title, deadline }: Application) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 18,
        boxShadow: "0 2px 10px rgba(100, 120, 180, 0.06)",
        width: 480,
        padding: "22px 28px",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        margin: "0 auto 24px auto",
      }}
    >
      <a
        href="/"
        style={{
          color: "#2563eb",
          fontSize: "1.35rem",
          fontFamily: "Georgia, serif",
          textDecoration: "underline",
          marginBottom: 8,
          fontWeight: 500,
        }}
      >
        {title}
      </a>
      <div
        style={{
          color: "#444",
          fontSize: "1.07rem",
          fontFamily: "Georgia, serif",
        }}
      >
        Deadline: {deadline}
      </div>
    </div>
  );
}

export default function ApplicationsList({ applications }: { applications: Application[] }) {
  return (
    <div>
      {applications.map((app, idx) => (
        <ApplicationCard key={idx} {...app} />
      ))}
    </div>
  );
}
