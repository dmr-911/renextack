import { afterAll, vi } from "vitest";
import { applyTestEnv } from "./test-env";

applyTestEnv();

// Cache invalidation needs a Next.js request context; outside Next it is recorded instead.
vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
  revalidatePath: vi.fn(),
  cacheTag: vi.fn(),
  cacheLife: vi.fn(),
}));

// `after()` needs a request scope; in tests, run the callback right away.
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (task: () => unknown) => void Promise.resolve().then(task),
}));

afterAll(async () => {
  const { getPool } = await import("@/server/db");
  await getPool().end();
  (globalThis as { __launchstackPool?: unknown }).__launchstackPool = undefined;
});
