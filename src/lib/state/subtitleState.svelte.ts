import type { Session, Subtitle } from "$lib/server/db/schema.js";

export interface SubtitleItem {
    id: string;
    startTime: number;
    endTime: number;
    text: string;
    order: number;
}

export interface AppState {
    currentSession: Session | null;
    subtitles: SubtitleItem[];
    currentVideoFile: File | null;
    currentVideoUrl: string | null;
    currentTime: number;
    isPlaying: boolean;
    videoDuration: number;
    selectedSubtitleId: string | null;
}

const initialState: AppState = {
    currentSession: null,
    subtitles: [],
    currentVideoFile: null,
    currentVideoUrl: null,
    currentTime: 0,
    isPlaying: false,
    videoDuration: 0,
    selectedSubtitleId: null,
};

export const subtitleState = $state<AppState>(initialState);

// Helper functions for creating derived state in components
export function getCurrentSubtitle() {
    return subtitleState.subtitles.find(
        (sub) =>
            sub.startTime <= subtitleState.currentTime &&
            sub.endTime >= subtitleState.currentTime
    );
}

export function getSortedSubtitles() {
    return [...subtitleState.subtitles].sort(
        (a, b) => a.startTime - b.startTime
    );
}

// Actions
export function setVideoFile(file: File) {
    subtitleState.currentVideoFile = file;
    subtitleState.currentVideoUrl = URL.createObjectURL(file);
}

export function setCurrentTime(time: number) {
    subtitleState.currentTime = time;
}

export function setIsPlaying(playing: boolean) {
    subtitleState.isPlaying = playing;
}

export function setVideoDuration(duration: number) {
    subtitleState.videoDuration = duration;
}

export function addSubtitle(startTime: number, endTime: number, text: string) {
    const newSubtitle: SubtitleItem = {
        id: crypto.randomUUID(),
        startTime,
        endTime,
        text,
        order: subtitleState.subtitles.length + 1,
    };
    subtitleState.subtitles.push(newSubtitle);

    // Auto-save to database if we have a current session
    if (subtitleState.currentSession) {
        saveSubtitleToDatabase(newSubtitle);
    }
}

// Database functions
export async function saveSubtitleToDatabase(
    subtitle: SubtitleItem
): Promise<string | null> {
    if (!subtitleState.currentSession) return null;

    try {
        const response = await fetch("/api/subtitles", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                sessionId: subtitleState.currentSession.id,
                startTime: subtitle.startTime,
                endTime: subtitle.endTime,
                text: subtitle.text,
                order: subtitle.order,
            }),
        });

        if (response.ok) {
            const data = await response.json();
            // Update the local state with the database-generated ID
            const index = subtitleState.subtitles.findIndex(
                (sub) => sub.id === subtitle.id
            );
            if (index !== -1 && data.subtitle) {
                const oldId = subtitle.id;
                const newId = data.subtitle.id;
                subtitleState.subtitles[index].id = newId;
                return newId; // Return the new ID so caller can update references
            }
        }
    } catch (error) {
        console.error("Failed to save subtitle:", error);
    }
    return null;
}

export function updateSubtitle(id: string, updates: Partial<SubtitleItem>) {
    const index = subtitleState.subtitles.findIndex((sub) => sub.id === id);
    if (index !== -1) {
        subtitleState.subtitles[index] = {
            ...subtitleState.subtitles[index],
            ...updates,
        };

        // Auto-save to database if we have a current session
        if (subtitleState.currentSession) {
            updateSubtitleInDatabase(id, updates);
        }
    }
}

export function deleteSubtitle(id: string) {
    subtitleState.subtitles = subtitleState.subtitles.filter(
        (sub) => sub.id !== id
    );

    // Auto-delete from database if we have a current session
    if (subtitleState.currentSession) {
        deleteSubtitleFromDatabase(id);
    }
}

async function updateSubtitleInDatabase(
    id: string,
    updates: Partial<SubtitleItem>
) {
    try {
        await fetch("/api/subtitles", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                id,
                ...updates,
            }),
        });
    } catch (error) {
        console.error("Failed to update subtitle:", error);
    }
}

async function deleteSubtitleFromDatabase(id: string) {
    try {
        await fetch("/api/subtitles", {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ id }),
        });
    } catch (error) {
        console.error("Failed to delete subtitle:", error);
    }
}

export function setSelectedSubtitle(id: string | null) {
    subtitleState.selectedSubtitleId = id;
}

export function setCurrentSession(session: Session | null) {
    subtitleState.currentSession = session;
}

export function setSubtitles(subs: SubtitleItem[]) {
    subtitleState.subtitles = subs;
}

// Utility functions
export function formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    if (hours > 0) {
        return `${hours.toString().padStart(2, "0")}:${minutes
            .toString()
            .padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms
            .toString()
            .padStart(3, "0")}`;
    }
    return `${minutes.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
}

export function parseTime(timeString: string): number {
    const parts = timeString.split(":");
    let hours = 0,
        minutes = 0,
        seconds = 0;

    if (parts.length === 3) {
        hours = parseInt(parts[0]);
        minutes = parseInt(parts[1]);
        const secParts = parts[2].split(".");
        seconds = parseInt(secParts[0]);
        if (secParts[1]) {
            seconds += parseInt(secParts[1].padEnd(3, "0")) / 1000;
        }
    } else if (parts.length === 2) {
        minutes = parseInt(parts[0]);
        const secParts = parts[1].split(".");
        seconds = parseInt(secParts[0]);
        if (secParts[1]) {
            seconds += parseInt(secParts[1].padEnd(3, "0")) / 1000;
        }
    }

    return hours * 3600 + minutes * 60 + seconds;
}

export function exportToSRT(): string {
    const sortedSubs = [...subtitleState.subtitles].sort(
        (a, b) => a.startTime - b.startTime
    );

    return sortedSubs
        .map((sub, index) => {
            const startTime = formatTime(sub.startTime).replace(".", ",");
            const endTime = formatTime(sub.endTime).replace(".", ",");

            return `${index + 1}\n${startTime} --> ${endTime}\n${sub.text}\n`;
        })
        .join("\n");
}
