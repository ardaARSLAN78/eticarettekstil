import { Router } from "express";
import multer from "multer";
import { config, production } from "../../core/config/index.js";
import type { Database } from "../../core/prisma/index.js";
import { enforceLimit } from "../../core/redis/index.js";
import { createContext, requireAdmin } from "../../graphql/context.js";
import { fail } from "../../lib/errors.js";
import { uploadImage } from "./media.service.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1, fields: 0 },
});

export function mediaRoutes(db: Database) {
  const router = Router();

  router.post("/", async (request, response) => {
    const allowed = new Set([config.WEB_ORIGIN, ...(!production ? ["http://127.0.0.1:3000"] : [])]);

    if (request.get("x-quantia-request") !== "1" || !allowed.has(request.get("origin") ?? "")) {
      fail("İstek kaynağı doğrulanamadı.", "FORBIDDEN");
    }

    const context = await createContext(db, request, response);
    requireAdmin(context);
    await enforceLimit(`upload:${context.user!.id}`, 60, 3600);

    await new Promise<void>((resolve, reject) => {
      upload.single("file")(request, response, (error) => (error ? reject(error) : resolve()));
    });

    if (!request.file) fail("Bir görsel dosyası seçin.");

    const asset = await uploadImage(context, request.file.buffer, request.file.originalname);
    response.status(201).json(asset);
  });

  return router;
}
