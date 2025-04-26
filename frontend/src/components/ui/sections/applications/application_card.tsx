

export default function ApplicationCard({
  title,
  deadline,
}: {
  title: string;
  deadline: string;
}) {
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
