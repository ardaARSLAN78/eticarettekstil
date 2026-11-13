import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const allowed = new Set([
    process.env.APP_ORIGIN ?? "http://localhost:3000",
    ...(process.env.NODE_ENV === "development" ? ["http://127.0.0.1:3000"] : []),
  ]);
  const origin = request.headers.get("origin");
  if (!origin || !allowed.has(origin) || request.headers.get("x-quantia-request") !== "1")
    return NextResponse.json({ errors: [{ message: "İstek doğrulanamadı." }] }, { status: 403 });
  const body = await request.text();
  if (new TextEncoder().encode(body).length > 65536)
    return NextResponse.json({ errors: [{ message: "İstek çok büyük." }] }, { status: 413 });
  try {
    const upstream = await fetch(
      `${process.env.API_INTERNAL_URL ?? "http://127.0.0.1:4100"}/graphql`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-quantia-request": "1",
          Origin: origin,
          Cookie: request.headers.get("cookie") ?? "",
        },
        body,
        cache: "no-store",
        signal: AbortSignal.timeout(25000),
      },
    );
    const response = new NextResponse(await upstream.text(), {
      status: upstream.status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
    for (const cookie of upstream.headers.getSetCookie())
      response.headers.append("Set-Cookie", cookie);
    return response;
  } catch {
    return NextResponse.json(
      { errors: [{ message: "Mağazaya şu anda ulaşılamıyor. Lütfen yeniden deneyin." }] },
      { status: 503 },
    );
  }
}
