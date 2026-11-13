import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const allowedOrigins = [process.env.APP_ORIGIN ?? "http://localhost:3000"];
  if (process.env.NODE_ENV !== "production") allowedOrigins.push("http://127.0.0.1:3000");
  if (
    !origin ||
    !allowedOrigins.includes(origin) ||
    request.headers.get("x-quantia-request") !== "1"
  )
    return NextResponse.json({ errors: [{ message: "İstek doğrulanamadı." }] }, { status: 403 });
  const reader = request.body?.getReader();
  if (!reader)
    return NextResponse.json({ errors: [{ message: "Görsel gerekli." }] }, { status: 400 });
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    bytes += part.value.byteLength;
    if (bytes > 9 * 1024 * 1024) {
      await reader.cancel();
      return NextResponse.json(
        { errors: [{ message: "Görsel 8 MB sınırını aşmamalı." }] },
        { status: 413 },
      );
    }
    chunks.push(part.value);
  }
  try {
    const response = await fetch(
      `${process.env.API_INTERNAL_URL ?? "http://127.0.0.1:4100"}/admin/media`,
      {
        method: "POST",
        headers: {
          "Content-Type": request.headers.get("content-type") ?? "",
          Origin: origin,
          Cookie: request.headers.get("cookie") ?? "",
          "x-quantia-request": "1",
        },
        body: Buffer.concat(chunks),
        signal: AbortSignal.timeout(25000),
      },
    );
    return new NextResponse(await response.text(), {
      status: response.status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { errors: [{ message: "Görsel servisine ulaşılamıyor." }] },
      { status: 503 },
    );
  }
}
