import { json, type RequestHandler } from "@sveltejs/kit";
import { db } from "$lib/server/db/index.js";
import { subtitles } from "$lib/server/db/schema.js";
import { eq } from "drizzle-orm";

export const GET: RequestHandler = async ({ url }) => {
    try {
        const sessionId = url.searchParams.get("sessionId");

        if (!sessionId) {
            return json({ error: "Session ID is required" }, { status: 400 });
        }

        const sessionSubtitles = await db
            .select()
            .from(subtitles)
            .where(eq(subtitles.sessionId, sessionId));

        return json({ subtitles: sessionSubtitles });
    } catch (error) {
        console.error("Error fetching subtitles:", error);
        return json({ error: "Failed to fetch subtitles" }, { status: 500 });
    }
};

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { sessionId, startTime, endTime, text, order } =
            await request.json();

        if (
            !sessionId ||
            startTime === undefined ||
            endTime === undefined ||
            !text
        ) {
            return json({ error: "Missing required fields" }, { status: 400 });
        }

        const newSubtitle = await db
            .insert(subtitles)
            .values({
                sessionId,
                startTime,
                endTime,
                text,
                order: order || 1,
            })
            .returning()
            .get();

        return json({ subtitle: newSubtitle });
    } catch (error) {
        console.error("Error creating subtitle:", error);
        return json({ error: "Failed to create subtitle" }, { status: 500 });
    }
};

export const PUT: RequestHandler = async ({ request }) => {
    try {
        const { id, ...updates } = await request.json();

        if (!id) {
            return json({ error: "Subtitle ID is required" }, { status: 400 });
        }

        const updatedSubtitle = await db
            .update(subtitles)
            .set(updates)
            .where(eq(subtitles.id, id))
            .returning()
            .get();

        return json({ subtitle: updatedSubtitle });
    } catch (error) {
        console.error("Error updating subtitle:", error);
        return json({ error: "Failed to update subtitle" }, { status: 500 });
    }
};

export const DELETE: RequestHandler = async ({ request }) => {
    try {
        const { id } = await request.json();

        if (!id) {
            return json({ error: "Subtitle ID is required" }, { status: 400 });
        }

        await db.delete(subtitles).where(eq(subtitles.id, id));

        return json({ success: true });
    } catch (error) {
        console.error("Error deleting subtitle:", error);
        return json({ error: "Failed to delete subtitle" }, { status: 500 });
    }
};
