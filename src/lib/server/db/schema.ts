import {
    sqliteTable,
    text,
    integer,
    real,
    index,
} from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";

export const sessions = sqliteTable(
    "sessions",
    {
        id: text("id")
            .primaryKey()
            .$defaultFn(() => createId()),
        videoFileName: text("video_file_name").notNull(),
        videoUrl: text("video_url").notNull(),
        // File metadata for persistence
        videoFileSize: integer("video_file_size"), // in bytes
        videoFileLastModified: integer("video_file_last_modified"), // timestamp
        videoFileType: text("video_file_type"), // MIME type
        createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
            () => new Date()
        ),
        updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(
            () => new Date()
        ),
    },
    (table) => ({
        // Index for ordering sessions by creation/update time
        createdAtIdx: index("idx_sessions_created_at").on(table.createdAt),
        updatedAtIdx: index("idx_sessions_updated_at").on(table.updatedAt),
    })
);

export const subtitles = sqliteTable(
    "subtitles",
    {
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
    },
    (table) => ({
        // Index for finding subtitles by session
        sessionIdIdx: index("idx_subtitles_session_id").on(table.sessionId),
        // Index for ordering subtitles by start time
        startTimeIdx: index("idx_subtitles_start_time").on(table.startTime),
        // Composite index for session + start time queries (most common)
        sessionStartIdx: index("idx_subtitles_session_start").on(
            table.sessionId,
            table.startTime
        ),
    })
);

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Subtitle = typeof subtitles.$inferSelect;
export type NewSubtitle = typeof subtitles.$inferInsert;
