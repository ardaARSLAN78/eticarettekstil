"use client";
import Image from "next/image";

export function Photo({
  src,
  alt,
  className = "",
  priority = false,
  sizes = "(max-width: 700px) 50vw, 25vw",
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      quality={priority ? 100 : 90}
      sizes={sizes}
      className={className}
      unoptimized={src.startsWith("https://")}
      preload={priority}
    />
  );
}
