import sharp from "sharp";
import { opaqueToken } from "../../lib/crypto.js";
import { fail } from "../../lib/errors.js";
import { storeImage } from "../../core/storage/index.js";
import { requireAdmin, type Context } from "../../graphql/context.js";
import { mediaAltDto } from "./media.dto.js";

export async function uploadImage(context: Context, buffer: Buffer, originalName: string) {
  const admin = requireAdmin(context);

  try {
    const source = sharp(buffer, { limitInputPixels: 25_000_000, animated: false });
    const metadata = await source.metadata();

    if (
      !metadata.format ||
      !["jpeg", "png", "webp"].includes(metadata.format) ||
      (metadata.pages ?? 1) > 1
    ) {
      fail("Yalnızca JPEG, PNG ve WebP görseller yüklenebilir.");
    }

    // Yeniden kodlama EXIF verisini ve dosyaya eklenmiş aktif/istenmeyen içeriği kaldırır.
    const output = await source
      .rotate()
      .resize({ width: 3840, height: 3840, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 94 })
      .toBuffer({ resolveWithObject: true });

    const key = `${opaqueToken()}.webp`;
    const url = await storeImage(key, output.data);
    const alt =
      originalName
        .replace(/\.[^.]+$/, "")
        .replace(/[\\/<>\u0000-\u001F]/g, " ")
        .slice(0, 200) || "Ürün görseli";

    return context.db.$transaction(async (tx) => {
      const asset = await tx.mediaAsset.create({
        data: {
          key,
          url,
          alt,
          bytes: output.data.length,
          width: output.info.width,
          height: output.info.height,
          actorId: admin.id,
        },
      });
      await tx.auditLog.create({
        data: { actorId: admin.id, action: "MEDIA_UPLOADED", entityId: asset.id },
      });
      return asset;
    });
  } catch (error) {
    if (error instanceof Error && error.name === "GraphQLError") throw error;
    fail("Görsel işlenemedi. Geçerli bir JPEG, PNG veya WebP dosyası seçin.");
  }
}

export async function updateMediaAlt(context: Context, raw: unknown) {
  const admin = requireAdmin(context);
  const input = mediaAltDto.parse(raw);

  return context.db.$transaction(async (tx) => {
    const asset = await tx.mediaAsset.update({ where: { id: input.id }, data: { alt: input.alt } });
    await tx.auditLog.create({
      data: { actorId: admin.id, action: "MEDIA_ALT_UPDATED", entityId: asset.id },
    });
    return asset;
  });
}
