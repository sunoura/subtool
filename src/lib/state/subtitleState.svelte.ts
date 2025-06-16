import type { Session, Subtitle } from "$lib/server/db/schema.js";
import {
    safeFetch,
    connectionState,
} from "$lib/stores/connectionStore.svelte.js";

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

// Removed auto-backup functionality - keeping server connectivity warnings only

// Optimized derived state - converted to functions for module export compatibility
export function getSortedSubtitles() {
    return [...subtitleState.subtitles].sort(
        (a, b) => a.startTime - b.startTime
    );
}

export function getCurrentSubtitle() {
    const sorted = getSortedSubtitles();
    return sorted.find(
        (sub) =>
            sub.startTime <= subtitleState.currentTime &&
            sub.endTime >= subtitleState.currentTime
    );
}

// Memoized subtitle markers for video player performance
export function getSubtitleMarkers() {
    if (subtitleState.videoDuration <= 0) return [];

    const sorted = getSortedSubtitles();
    return sorted.map((subtitle) => ({
        id: subtitle.id,
        percentage: subtitle.startTime / subtitleState.videoDuration,
        position: (subtitle.startTime / subtitleState.videoDuration) * 100,
        title: `Subtitle at ${formatTime(
            subtitle.startTime
        )}: ${subtitle.text.slice(0, 30)}${
            subtitle.text.length > 30 ? "..." : ""
        }`,
        startTime: subtitle.startTime,
    }));
}

// Actions
export function setVideoFile(file: File) {
    subtitleState.currentVideoFile = file;
    subtitleState.currentVideoUrl = URL.createObjectURL(file);

    // Store file metadata in current session if available
    if (subtitleState.currentSession) {
        updateSessionFileMetadata(file);
    }
}

async function updateSessionFileMetadata(file: File) {
    if (!subtitleState.currentSession) return;

    try {
        const response = await safeFetch("/api/sessions", {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                id: subtitleState.currentSession.id,
                videoFileName: file.name,
                videoFileSize: file.size,
                videoFileLastModified: file.lastModified,
                videoFileType: file.type,
            }),
        });

        if (response.ok) {
            // Update local session data
            subtitleState.currentSession.videoFileName = file.name;
            subtitleState.currentSession.videoFileSize = file.size;
            subtitleState.currentSession.videoFileLastModified =
                file.lastModified;
            subtitleState.currentSession.videoFileType = file.type;
            console.log("Updated session with file metadata:", file.name);
        }
    } catch (error) {
        console.error("Failed to update session file metadata:", error);
    }
}

// Check if a file matches the session's stored file metadata
export function isMatchingFile(file: File, session: any): boolean {
    if (!session.videoFileSize || !session.videoFileLastModified) {
        return false; // No metadata stored
    }

    return (
        file.name === session.videoFileName &&
        file.size === session.videoFileSize &&
        file.lastModified === session.videoFileLastModified &&
        file.type === session.videoFileType
    );
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
    // Show warning if server is offline
    if (!connectionState.isOnline && subtitleState.currentSession) {
        alert(
            "Warning: Server is offline. This subtitle will be saved locally but not synced to the database until connection is restored."
        );
    }

    const newSubtitle: SubtitleItem = {
        id: crypto.randomUUID(),
        startTime,
        endTime,
        text,
        order: subtitleState.subtitles.length + 1,
    };

    // Insert in correct position to maintain sort order (performance optimization)
    const insertIndex = subtitleState.subtitles.findIndex(
        (sub) => sub.startTime > startTime
    );

    if (insertIndex === -1) {
        // Add to end if no subtitle starts later
        subtitleState.subtitles.push(newSubtitle);
    } else {
        // Insert at correct position
        subtitleState.subtitles.splice(insertIndex, 0, newSubtitle);
    }

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
        const response = await safeFetch("/api/subtitles", {
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
        console.error("Failed to save subtitle (queued for retry):", error);
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
        await safeFetch("/api/subtitles", {
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
        console.error("Failed to update subtitle (queued for retry):", error);
    }
}

async function deleteSubtitleFromDatabase(id: string) {
    try {
        await safeFetch("/api/subtitles", {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ id }),
        });
    } catch (error) {
        console.error("Failed to delete subtitle (queued for retry):", error);
    }
}

export function setSelectedSubtitle(id: string | null) {
    subtitleState.selectedSubtitleId = id;
}

export function setSubtitles(subs: SubtitleItem[]) {
    subtitleState.subtitles = subs;
}

export function setCurrentSession(session: Session | null) {
    subtitleState.currentSession = session;
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

// Format time specifically for SRT export (always HH:MM:SS,mmm format)
export function formatTimeForSRT(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${secs.toString().padStart(2, "0")},${ms
        .toString()
        .padStart(3, "0")}`;
}

export function exportToSRT(): string {
    const sortedSubs = [...subtitleState.subtitles].sort(
        (a, b) => a.startTime - b.startTime
    );

    return sortedSubs
        .map((sub, index) => {
            const startTime = formatTimeForSRT(sub.startTime);
            const endTime = formatTimeForSRT(sub.endTime);

            return `${index + 1}\n${startTime} --> ${endTime}\n${sub.text}\n`;
        })
        .join("\n");
}
