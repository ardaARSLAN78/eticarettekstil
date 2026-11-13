export function Notice({
  children,
  success = false,
}: {
  children: React.ReactNode;
  success?: boolean;
}) {
  return (
    <p className={`notice ${success ? "notice-success" : ""}`} role={success ? "status" : "alert"}>
      {children}
    </p>
  );
}
