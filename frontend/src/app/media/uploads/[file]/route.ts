import type { NextRequest } from "next/server";

/** Ortam adresi derlemeye gömülmez; aynı imaj testte ve üretimde kullanılabilir. */
export async function GET(_: NextRequest, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!/^[a-f0-9]{64}\.webp$/.test(file)) return new Response(null, { status: 404 });
  try {
    const response = await fetch(
      `${process.env.API_INTERNAL_URL ?? "http://127.0.0.1:4100"}/uploads/${file}`,
      {
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!response.ok) return new Response(null, { status: response.status === 404 ? 404 : 502 });
    return new Response(response.body, {
      headers: {
        "Content-Type": "image/webp",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response(null, { status: 503 });
  }
}
