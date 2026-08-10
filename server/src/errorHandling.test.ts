// Minimal self-check for the global error handler (RACCOMANDAZIONI.md #7):
// an async route that rejects must produce a clean 500 JSON response, not a hung request.
// Run with: npx tsx --test src/errorHandling.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import "express-async-errors";

function buildApp() {
  const app = express();
  app.get("/boom", async () => {
    throw new Error("simulated Prisma failure");
  });
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(500).json({ error: "Internal server error" });
  });
  return app;
}

test("async route rejection is caught and returns 500 JSON instead of hanging", async () => {
  const app = buildApp();
  const server = app.listen(0);
  try {
    const { port } = server.address() as { port: number };
    const res = await fetch(`http://localhost:${port}/boom`);
    assert.equal(res.status, 500);
    assert.deepEqual(await res.json(), { error: "Internal server error" });
  } finally {
    server.close();
  }
});
