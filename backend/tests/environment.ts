import "dotenv/config";

if (
  !process.env.TEST_DATABASE_URL ||
  new URL(process.env.TEST_DATABASE_URL).pathname !== "/quantia_test"
)
  throw new Error("Test veritabanı koruması: yalnızca quantia_test kullanılabilir.");
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.ENCRYPTION_KEY = "a".repeat(64);
process.env.ENABLE_DEMO_PAYMENT = "true";
process.env.WEB_ORIGIN = "http://localhost:3000";
process.env.PUBLIC_API_URL = "http://localhost:4000";
