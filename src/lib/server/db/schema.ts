import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";

export const sessions = sqliteTable("sessions", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => createId()),
    videoFileName: text("video_file_name").notNull(),
    videoUrl: text("video_url").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
        () => new Date()
    ),
    updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(
        () => new Date()
    ),
});

export const subtitles = sqliteTable("subtitles", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => createId()),
    sessionId: text("session_id")
        .notNull()
        .references(() => sessions.id, { onDelete: "cascade" }),
    startTime: real("start_time").notNull(), // in seconds
    endTime: real("end_time").notNull(), // in seconds
    text: text("text").notNull(),
    order: integer("order").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
        () => new Date()
    ),
});

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Subtitle = typeof subtitles.$inferSelect;
export type NewSubtitle = typeof subtitles.$inferInsert;
