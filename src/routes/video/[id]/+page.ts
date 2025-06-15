import type { PageLoad } from "./$types.js";

export const load: PageLoad = async ({ params, fetch }) => {
    const sessionId = params.id;

    try {
        const response = await fetch(`/api/sessions?id=${sessionId}`);
        const data = await response.json();

        if (data.session) {
            return {
                session: data.session,
                subtitles: data.subtitles || [],
            };
        } else {
            throw new Error("Session not found");
        }
    } catch (error) {
        throw new Error(`Failed to load session: ${error}`);
    }
};
