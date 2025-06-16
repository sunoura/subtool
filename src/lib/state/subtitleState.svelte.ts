import type { Session, Subtitle } from "$lib/server/db/schema.js";
import { safeFetch } from "$lib/stores/connectionStore.svelte.js";

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

// Local storage backup functions
const STORAGE_KEY = "subtitler-backup";

export interface BackupData {
    sessionId: string | null;
    subtitles: SubtitleItem[];
    timestamp: number;
}

function saveToLocalStorage() {
    if (typeof window === "undefined") return;

    const backup: BackupData = {
        sessionId: subtitleState.currentSession?.id || null,
        subtitles: subtitleState.subtitles,
        timestamp: Date.now(),
    };

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(backup));
        console.log("Backup saved to localStorage", backup);
    } catch (error) {
        console.error("Failed to save backup to localStorage:", error);
    }
}

export function loadFromLocalStorage(): BackupData | null {
    if (typeof window === "undefined") return null;

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const backup: BackupData = JSON.parse(stored);
            console.log("Loaded backup from localStorage", backup);
            return backup;
        }
    } catch (error) {
        console.error("Failed to load backup from localStorage:", error);
    }

    return null;
}

export function clearLocalStorage() {
    if (typeof window === "undefined") return;

    try {
        localStorage.removeItem(STORAGE_KEY);
        console.log("Cleared localStorage backup");
    } catch (error) {
        console.error("Failed to clear localStorage backup:", error);
    }
}

export function hasUnsavedChanges(): boolean {
    const backup = loadFromLocalStorage();
    if (!backup) return false;

    // Check if local backup is newer than 5 minutes ago
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    return backup.timestamp > fiveMinutesAgo && backup.subtitles.length > 0;
}

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
    const newSubtitle: SubtitleItem = {
        id: crypto.randomUUID(),
        startTime,
        endTime,
        text,
        order: subtitleState.subtitles.length + 1,
    };
    subtitleState.subtitles.push(newSubtitle);

    // Always save to localStorage first
    saveToLocalStorage();

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

        // Always save to localStorage first
        saveToLocalStorage();

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

    // Always save to localStorage first
    saveToLocalStorage();

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
    // Always save current state to localStorage
    saveToLocalStorage();
}

export function setCurrentSession(session: Session | null) {
    subtitleState.currentSession = session;
    // When setting a session, save current state to localStorage
    saveToLocalStorage();
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
