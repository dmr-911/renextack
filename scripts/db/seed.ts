import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { account, activity, project, task, user } from "../../src/server/db/schema";
import { connect, describeConnectionError } from "./client";

/**
 * Local demo data: one regular user and one admin, each with sample projects.
 *
 * Safety rules:
 *  - refuses to run when NODE_ENV=production
 *  - the password comes from SEED_DEMO_PASSWORD; there is no hard-coded
 *    production credential anywhere in the codebase
 *  - idempotent: re-running skips accounts that already exist
 */

const DEMO_USERS = [
  { email: "demo@launchstack.dev", name: "Demo User", role: "user" as const },
  { email: "admin@launchstack.dev", name: "Demo Admin", role: "admin" as const },
];

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("✗ Refusing to seed demo accounts while NODE_ENV=production.");
    process.exit(1);
  }
  const password = process.env.SEED_DEMO_PASSWORD;
  if (!password || password.length < 10) {
    console.error("✗ Set SEED_DEMO_PASSWORD (10+ characters) in .env to seed demo accounts.");
    process.exit(1);
  }

  const { db, close } = connect();
  try {
    const passwordHash = await hashPassword(password);
    for (const demo of DEMO_USERS) {
      const existing = await db.query.user.findFirst({ where: eq(user.email, demo.email) });
      if (existing) {
        console.log(`• ${demo.email} already exists, skipping`);
        continue;
      }
      const userId = crypto.randomUUID();
      await db.transaction(async (tx) => {
        await tx.insert(user).values({ id: userId, name: demo.name, email: demo.email, emailVerified: true, role: demo.role });
        await tx.insert(account).values({
          id: crypto.randomUUID(),
          accountId: userId,
          providerId: "credential",
          userId,
          password: passwordHash,
        });
        await seedProjects(tx, userId);
      });
      console.log(`✓ Created ${demo.role} ${demo.email}`);
    }
    console.log(`\nDemo sign-in: demo@launchstack.dev / (SEED_DEMO_PASSWORD from .env)`);
  } finally {
    await close();
  }
}

type Tx = Parameters<Parameters<ReturnType<typeof connect>["db"]["transaction"]>[0]>[0];

async function seedProjects(tx: Tx, userId: string) {
  const day = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const samples = [
    {
      name: "Website relaunch",
      description: "New marketing site with pricing page and blog.",
      tasks: [
        { title: "Write homepage copy", status: "done" as const, priority: "high" as const, completedAt: new Date(now - day) },
        { title: "Design pricing table", status: "in_progress" as const, priority: "high" as const, dueDate: new Date(now + 2 * day) },
        { title: "Set up blog CMS", status: "todo" as const, priority: "medium" as const, dueDate: new Date(now - 2 * day) },
        { title: "Configure analytics", status: "todo" as const, priority: "low" as const },
      ],
    },
    {
      name: "Customer onboarding",
      description: "Reduce time-to-value for new sign-ups.",
      tasks: [
        { title: "Interview five new customers", status: "done" as const, priority: "medium" as const, completedAt: new Date(now - 3 * day) },
        { title: "Draft welcome email sequence", status: "todo" as const, priority: "medium" as const, dueDate: new Date(now + 5 * day) },
      ],
    },
  ];

  for (const sample of samples) {
    const [created] = await tx.insert(project).values({ ownerId: userId, name: sample.name, description: sample.description }).returning();
    await tx.insert(task).values(sample.tasks.map((item) => ({ ...item, projectId: created!.id })));
    await tx.insert(activity).values({ userId, projectId: created!.id, type: "project.created", summary: `Created project “${sample.name}”`, createdAt: new Date(now - 4 * day) });
    const completed = sample.tasks.filter((item) => item.status === "done");
    if (completed.length) {
      await tx.insert(activity).values(
        completed.map((item) => ({
          userId,
          projectId: created!.id,
          type: "task.completed",
          summary: `Completed “${item.title}”`,
          createdAt: item.completedAt,
        })),
      );
    }
  }
  await tx.insert(project).values({ ownerId: userId, name: "Q1 planning", description: "Archived example.", status: "archived" });
}

main().catch((error) => {
  console.error(`✗ Seeding failed: ${describeConnectionError(error)}`);
  process.exit(1);
});
