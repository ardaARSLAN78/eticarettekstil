import { randomUUID } from "node:crypto";
import express, { type ErrorRequestHandler } from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { execute, parse, specifiedRules, validate } from "graphql";
import { z } from "zod";
import { config, production } from "./core/config/index.js";
import { prisma, type Database } from "./core/prisma/index.js";
import { enforceLimit } from "./core/redis/index.js";
import { createContext } from "./graphql/context.js";
import { schema } from "./graphql/schema.js";
import { disableIntrospection, resourceLimits } from "./graphql/security.js";
import { fail, publicError } from "./lib/errors.js";
import { paymentRoutes } from "./modules/payments/payments.routes.js";
import { mediaRoutes } from "./modules/media/media.routes.js";
import { uploadDirectory } from "./core/storage/index.js";

const requestDto = z
  .object({
    query: z.string().min(1).max(20000),
    variables: z.record(z.string(), z.unknown()).nullish(),
    operationName: z.string().max(100).nullish(),
  })
  .strict();

export function createApp(db: Database = prisma) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", config.TRUST_PROXY === "false" ? false : config.TRUST_PROXY.split(","));
  app.use(helmet({ crossOriginResourcePolicy: { policy: "same-origin" } }));
  app.use((req, res, next) => {
    res.setHeader("X-Request-Id", randomUUID());
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "quantia-api" });
  });
  app.get("/health/ready", async (_req, res) => {
    await db.$queryRaw`SELECT 1`;
    res.json({ status: "ready" });
  });
  app.use("/payments", paymentRoutes(db));
  app.use(cookieParser());
  app.use("/admin/media", mediaRoutes(db));
  app.use(
    "/uploads",
    express.static(uploadDirectory, {
      dotfiles: "deny",
      index: false,
      redirect: false,
      maxAge: "1y",
      immutable: true,
    }),
  );
  app.use(express.json({ limit: "64kb", strict: true }));
  app.post("/graphql", async (req, res) => {
    if (!req.is("application/json")) {
      res.status(415).json({ errors: [{ message: "JSON gövdesi gereklidir." }] });
      return;
    }
    if (req.get("x-quantia-request") !== "1") {
      res.status(403).json({
        errors: [{ message: "İstek doğrulanamadı.", extensions: { code: "CSRF_REJECTED" } }],
      });
      return;
    }
    const origin = req.get("origin");
    const allowed = new Set([
      new URL(config.WEB_ORIGIN).origin,
      ...(!production ? ["http://127.0.0.1:3000"] : []),
    ]);
    if (!origin || !allowed.has(origin)) {
      res.status(403).json({
        errors: [
          { message: "İstek kaynağı doğrulanamadı.", extensions: { code: "CSRF_REJECTED" } },
        ],
      });
      return;
    }
    await enforceLimit(`graphql:${req.ip}`, 180, 60);
    const input = requestDto.parse(req.body);
    const document = parse(input.query, { maxTokens: 3000 });
    resourceLimits(document);
    const errors = validate(
      schema,
      document,
      production ? [...specifiedRules, disableIntrospection] : specifiedRules,
    );
    if (errors.length) {
      res.status(400).json({ errors: errors.map((error) => ({ message: error.message })) });
      return;
    }
    const context = await createContext(db, req, res);
    const result = await execute({
      schema,
      document,
      contextValue: context,
      variableValues: input.variables,
      operationName: input.operationName,
    });
    res.json({
      data: result.data,
      ...(result.errors
        ? {
            errors: result.errors.map((error) => {
              const safe = publicError(error.originalError ?? error);
              return { message: safe.message, extensions: { code: safe.code }, path: error.path };
            }),
          }
        : {}),
    });
  });
  app.all("/graphql", (_req, res) => {
    res.status(405).json({ errors: [{ message: "Yalnızca POST desteklenir." }] });
  });
  app.use((_req, res) => {
    res.status(404).json({ error: "Uç nokta bulunamadı." });
  });
  const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    const safe = publicError(error);
    const http =
      safe.code === "RATE_LIMITED" ? 429 : safe.code === "INTERNAL_SERVER_ERROR" ? 500 : 400;
    res.status(http).json({ errors: [{ message: safe.message, extensions: { code: safe.code } }] });
  };
  app.use(errorHandler);
  return app;
}
