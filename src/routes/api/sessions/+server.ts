import { json, type RequestHandler } from "@sveltejs/kit";
import { db } from "$lib/server/db/index.js";
import { sessions, subtitles } from "$lib/server/db/schema.js";
import { eq, desc } from "drizzle-orm";

export const GET: RequestHandler = async ({ url }) => {
    try {
        const sessionId = url.searchParams.get("id");

        if (sessionId) {
            // Get specific session with subtitles
            const session = await db
                .select()
                .from(sessions)
                .where(eq(sessions.id, sessionId))
                .get();
            if (!session) {
                return json({ error: "Session not found" }, { status: 404 });
            }

            const sessionSubtitles = await db
                .select()
                .from(subtitles)
                .where(eq(subtitles.sessionId, sessionId));

            return json({ session, subtitles: sessionSubtitles });
        } else {
            // Get all sessions
            const allSessions = await db.select().from(sessions);
            return json({ sessions: allSessions });
        }
    } catch (error) {
        console.error("Error fetching sessions:", error);
        return json({ error: "Failed to fetch sessions" }, { status: 500 });
    }
};

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { videoFileName, videoUrl } = await request.json();

        if (!videoFileName) {
            return json(
                { error: "Video file name is required" },
                { status: 400 }
            );
        }

        const newSession = await db
            .insert(sessions)
            .values({
                videoFileName,
                videoUrl: videoUrl || "", // Allow empty video URL initially
            })
            .returning()
            .get();

        return json({ session: newSession });
    } catch (error) {
        console.error("Error creating session:", error);
        return json({ error: "Failed to create session" }, { status: 500 });
    }
};

export const PUT: RequestHandler = async ({ request }) => {
    try {
        const { id, ...updates } = await request.json();

        if (!id) {
            return json({ error: "Session ID is required" }, { status: 400 });
        }

        const updatedSession = await db
            .update(sessions)
            .set({ ...updates, updatedAt: new Date() })
            .where(eq(sessions.id, id))
            .returning()
            .get();

        return json({ session: updatedSession });
    } catch (error) {
        console.error("Error updating session:", error);
        return json({ error: "Failed to update session" }, { status: 500 });
    }
};

export const DELETE: RequestHandler = async ({ request }) => {
    try {
        const { id } = await request.json();

        if (!id) {
            return json({ error: "Session ID is required" }, { status: 400 });
        }

        await db.delete(sessions).where(eq(sessions.id, id));

        return json({ success: true });
    } catch (error) {
        console.error("Error deleting session:", error);
        return json({ error: "Failed to delete session" }, { status: 500 });
    }
};
