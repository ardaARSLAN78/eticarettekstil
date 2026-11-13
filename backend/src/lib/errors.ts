import { GraphQLError } from "graphql";
import { ZodError } from "zod";

export function fail(message: string, code = "BAD_USER_INPUT"): never {
  throw new GraphQLError(message, { extensions: { code } });
}

export function publicError(error: unknown): { message: string; code: string } {
  if (error instanceof GraphQLError) {
    return { message: error.message, code: String(error.extensions.code ?? "BAD_USER_INPUT") };
  }
  if (error instanceof ZodError) {
    return {
      message: error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      code: "VALIDATION_ERROR",
    };
  }
  return { message: "İşlem tamamlanamadı. Lütfen tekrar deneyin.", code: "INTERNAL_SERVER_ERROR" };
}
