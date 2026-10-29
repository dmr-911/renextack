import { relations } from "drizzle-orm";
import { bigint, index, integer, pgEnum, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { user } from "./auth";

/**
 * Example SaaS domain: projects that contain tasks, plus an activity feed.
 * Replace or extend these tables with your own product's data model.
 */

export const projectStatus = pgEnum("project_status", ["active", "archived"]);
export const taskStatus = pgEnum("task_status", ["todo", "in_progress", "done"]);
export const taskPriority = pgEnum("task_priority", ["low", "medium", "high"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const project = pgTable(
  "project",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    description: varchar("description", { length: 2000 }).notNull().default(""),
    status: projectStatus("status").notNull().default("active"),
    ...timestamps,
  },
  (table) => [
    index("project_owner_id_idx").on(table.ownerId),
    index("project_owner_updated_idx").on(table.ownerId, table.updatedAt),
  ],
);

export const task = pgTable(
  "task",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    status: taskStatus("status").notNull().default("todo"),
    priority: taskPriority("priority").notNull().default("medium"),
    dueDate: timestamp("due_date", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [index("task_project_id_idx").on(table.projectId, table.status)],
);

export const activity = pgTable(
  "activity",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // e.g. "project.created", "task.completed". Free-form so new features don't need a migration.
    type: varchar("type", { length: 64 }).notNull(),
    // Human-readable summary rendered in the feed. Always escaped by React on output.
    summary: varchar("summary", { length: 300 }).notNull(),
    projectId: uuid("project_id").references(() => project.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("activity_user_created_idx").on(table.userId, table.createdAt)],
);

export const projectRelations = relations(project, ({ many, one }) => ({
  owner: one(user, { fields: [project.ownerId], references: [user.id] }),
  tasks: many(task),
}));

export const taskRelations = relations(task, ({ one }) => ({
  project: one(project, { fields: [task.projectId], references: [project.id] }),
}));

/**
 * Fixed-window counters for the app's own API rate limiter (see
 * src/server/rate-limit). Stored in Postgres so limits hold across instances
 * without requiring Redis. Rows are tiny and expire logically; prune with
 * `DELETE FROM api_rate_limit WHERE window_start < now() - interval '1 day'`.
 */
export const apiRateLimit = pgTable("api_rate_limit", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  windowStart: bigint("window_start", { mode: "number" }).notNull(),
});
