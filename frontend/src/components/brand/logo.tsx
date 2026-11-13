import Link from "next/link";

export function Logo({
  light = false,
  href = "/",
  name = "Quantia",
}: {
  light?: boolean;
  href?: string;
  name?: string;
}) {
  return (
    <Link
      href={href}
      className={`brand ${light ? "brand-light" : ""}`}
      aria-label={`${name} ana sayfa`}
    >
      <span className="brand-name">
        {name.toUpperCase()}
        <span className="brand-dot">®</span>
      </span>
      <span className="brand-caption">THE ART OF TIMELESS LIVING</span>
    </Link>
  );
}
