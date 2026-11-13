import { z } from "zod";
import { id, text } from "../../core/sanitizer/index.js";

export const mediaAltDto = z.object({ id, alt: text(200) }).strict();
