<script lang="ts">
    import {
        Folder,
        Plus,
        Play,
        Trash2,
        Calendar,
        FileVideo,
        Copy,
        PenLine,
        Save,
        X,
        Upload,
    } from "lucide-svelte";
    import { goto } from "$app/navigation";
    import {
        subtitleState,
        setCurrentSession,
        setSubtitles,
    } from "$lib/state/subtitleState.svelte.js";
    import type { Session } from "$lib/server/db/schema.js";

    let sessions = $state<Session[]>([]);
    let loading = $state(false);
    let creating = $state(false);
    let duplicating = $state<string | null>(null);
    let importing = $state(false);
    let newSessionName = $state("");
    let editingSessionId = $state<string | null>(null);
    let editingSessionName = $state("");
    let srtFile = $state<File | null>(null);
    let importSessionName = $state("");

    // Load sessions on component mount
    $effect(() => {
        loadSessions();
    });

    async function loadSessions() {
        loading = true;
        try {
            const response = await fetch("/api/sessions");
            const data = await response.json();
            if (response.ok && data.sessions) {
                sessions = data.sessions;
            } else {
                console.error(
                    "Failed to load sessions:",
                    data.error || "Unknown error"
                );
                sessions = []; // Set empty array on error
            }
        } catch (error) {
            console.error("Failed to load sessions:", error);
            sessions = [];
        } finally {
            loading = false;
        }
    }

    async function createNewSession() {
        if (!newSessionName.trim()) return;

        creating = true;
        try {
            const response = await fetch("/api/sessions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    videoFileName: newSessionName.trim(),
                    videoUrl: "", // Will be set when video is uploaded
                }),
            });

            const data = await response.json();
            if (response.ok && data.session) {
                goto(`/video/${data.session.id}`);
                newSessionName = "";
            } else {
                alert(
                    `Failed to create session: ${data.error || "Unknown error"}`
                );
            }
        } catch (error) {
            console.error("Failed to create session:", error);
            alert(
                "Failed to create session. Please check the console for details."
            );
        } finally {
            creating = false;
        }
    }

    async function duplicateSession(sessionId: string, sessionName: string) {
        duplicating = sessionId;
        try {
            // First get the session and its subtitles
            const response = await fetch(`/api/sessions?id=${sessionId}`);
            const data = await response.json();

            if (!response.ok || !data.session) {
                alert("Failed to load session data for duplication");
                return;
            }

            // Create new session with duplicated name
            const newSessionResponse = await fetch("/api/sessions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    videoFileName: `${sessionName} (Copy)`,
                    videoUrl: data.session.videoUrl || "",
                }),
            });

            const newSessionData = await newSessionResponse.json();
            if (!newSessionResponse.ok || !newSessionData.session) {
                alert("Failed to create duplicate session");
                return;
            }

            // Copy all subtitles to the new session
            const newSessionId = newSessionData.session.id;
            const subtitles = data.subtitles || [];

            for (const subtitle of subtitles) {
                await fetch("/api/subtitles", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        sessionId: newSessionId,
                        startTime: subtitle.startTime,
                        endTime: subtitle.endTime,
                        text: subtitle.text,
                        order: subtitle.order,
                    }),
                });
            }

            await loadSessions(); // Refresh the list
            alert(`Session duplicated successfully as "${sessionName} (Copy)"`);
        } catch (error) {
            console.error("Failed to duplicate session:", error);
            alert("Failed to duplicate session");
        } finally {
            duplicating = null;
        }
    }

    async function startEditingSession(sessionId: string, currentName: string) {
        editingSessionId = sessionId;
        editingSessionName = currentName;
    }

    async function saveSessionName() {
        if (!editingSessionId || !editingSessionName.trim()) return;

        try {
            const response = await fetch("/api/sessions", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    id: editingSessionId,
                    videoFileName: editingSessionName.trim(),
                }),
            });

            if (response.ok) {
                await loadSessions(); // Refresh the list
                editingSessionId = null;
                editingSessionName = "";
            } else {
                alert("Failed to update session name");
            }
        } catch (error) {
            console.error("Failed to update session:", error);
            alert("Failed to update session name");
        }
    }

    function cancelEditSession() {
        editingSessionId = null;
        editingSessionName = "";
    }

    // SRT Parsing function
    function parseSRT(content: string) {
        const subtitles = [];
        const blocks = content.trim().split(/\n\s*\n/);

        for (const block of blocks) {
            const lines = block.trim().split("\n");
            if (lines.length < 3) continue;

            // Handle both HH:MM:SS,mmm and MM:SS,mmm formats
            const timeMatch = lines[1].match(
                /((?:\d{2}:)?\d{2}:\d{2},\d{3})\s*-->\s*((?:\d{2}:)?\d{2}:\d{2},\d{3})/
            );
            if (!timeMatch) continue;

            const startTime = parseTimeFromSRT(timeMatch[1]);
            const endTime = parseTimeFromSRT(timeMatch[2]);
            const text = lines.slice(2).join("\n");

            subtitles.push({
                startTime,
                endTime,
                text,
                order: subtitles.length + 1,
            });
        }

        return subtitles;
    }

    function parseTimeFromSRT(timeString: string): number {
        const [time, ms] = timeString.split(",");
        const timeParts = time.split(":").map(Number);

        let hours = 0,
            minutes = 0,
            seconds = 0;

        if (timeParts.length === 3) {
            // HH:MM:SS format
            [hours, minutes, seconds] = timeParts;
        } else if (timeParts.length === 2) {
            // MM:SS format (no hours)
            [minutes, seconds] = timeParts;
        }

        return hours * 3600 + minutes * 60 + seconds + Number(ms) / 1000;
    }

    function handleSRTFileSelect(event: Event) {
        const target = event.target as HTMLInputElement;
        if (target.files?.[0]) {
            srtFile = target.files[0];
        }
    }

    async function importSRTSession() {
        if (!srtFile || !importSessionName.trim()) return;

        importing = true;
        try {
            // Read the SRT file
            const fileContent = await srtFile.text();
            const subtitles = parseSRT(fileContent);

            if (subtitles.length === 0) {
                alert("No valid subtitles found in the SRT file");
                return;
            }

            // Create new session
            const sessionResponse = await fetch("/api/sessions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    videoFileName: importSessionName.trim(),
                    videoUrl: "",
                }),
            });

            const sessionData = await sessionResponse.json();
            if (!sessionResponse.ok || !sessionData.session) {
                alert("Failed to create session from SRT import");
                return;
            }

            // Import all subtitles
            const newSessionId = sessionData.session.id;
            for (const subtitle of subtitles) {
                await fetch("/api/subtitles", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        sessionId: newSessionId,
                        startTime: subtitle.startTime,
                        endTime: subtitle.endTime,
                        text: subtitle.text,
                        order: subtitle.order,
                    }),
                });
            }

            await loadSessions();

            // Reset form
            srtFile = null;
            importSessionName = "";
            const fileInput = document.getElementById(
                "srt-file-input"
            ) as HTMLInputElement;
            if (fileInput) fileInput.value = "";

            alert(
                `Successfully imported ${subtitles.length} subtitles into "${importSessionName.trim()}"`
            );
        } catch (error) {
            console.error("Failed to import SRT:", error);
            alert("Failed to import SRT file");
        } finally {
            importing = false;
        }
    }

    async function loadSession(sessionId: string) {
        goto(`/video/${sessionId}`);
    }

    async function deleteSession(sessionId: string, sessionName: string) {
        if (
            !confirm(
                `Are you sure you want to delete "${sessionName}"? This will delete all subtitles in this session.`
            )
        ) {
            return;
        }

        try {
            const response = await fetch("/api/sessions", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ id: sessionId }),
            });

            if (response.ok) {
                await loadSessions(); // Refresh the list
            }
        } catch (error) {
            console.error("Failed to delete session:", error);
        }
    }

    function formatDate(dateString: string | Date) {
        const date = new Date(dateString);
        return (
            date.toLocaleDateString() +
            " " +
            date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        );
    }
</script>

<div class="bg-white shadow-lg p-6">
    <h2 class="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        <Folder class="mr-2" size={24} />
        Subtitle Sessions
    </h2>

    <!-- Create New Session -->
    <div class="bg-blue-50 p-4 mb-6">
        <h3 class="text-lg font-semibold mb-3 text-blue-800">
            Create New Session
        </h3>
        <div class="flex space-x-3">
            <input
                bind:value={newSessionName}
                type="text"
                placeholder="Enter session name (e.g., 'My Tutorial Video')"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onkeydown={(e) => e.key === "Enter" && createNewSession()}
            />
            <button
                onclick={createNewSession}
                disabled={!newSessionName.trim() || creating}
                class="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
            >
                <Plus size={16} />
                <span>{creating ? "Creating..." : "Create"}</span>
            </button>
        </div>
    </div>

    <!-- Import SRT Session -->
    <div class="bg-green-50 p-4 mb-6">
        <h3 class="text-lg font-semibold mb-3 text-green-800">
            Import SRT File
        </h3>
        <p class="text-green-600 text-sm mb-3">
            Create a new session by importing subtitles from an SRT file
        </p>
        <div class="space-y-3">
            <input
                bind:value={importSessionName}
                type="text"
                placeholder="Enter name for the imported session"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <div class="flex space-x-3">
                <input
                    id="srt-file-input"
                    type="file"
                    accept=".srt"
                    onchange={handleSRTFileSelect}
                    class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                    onclick={importSRTSession}
                    disabled={!srtFile ||
                        !importSessionName.trim() ||
                        importing}
                    class="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                >
                    <Upload size={16} />
                    <span>{importing ? "Importing..." : "Import"}</span>
                </button>
            </div>
        </div>
    </div>

    <!-- Sessions List -->
    <div>
        <h3 class="text-lg font-semibold mb-4 text-gray-700">
            Previous Sessions
        </h3>

        {#if loading}
            <div class="text-center py-8">
                <div
                    class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"
                ></div>
                <p class="mt-2 text-gray-500">Loading sessions...</p>
            </div>
        {:else if sessions.length === 0}
            <div class="text-center py-8">
                <FileVideo class="mx-auto text-gray-400 mb-4" size={48} />
                <p class="text-gray-500">No previous sessions found</p>
                <p class="text-sm text-gray-400">
                    Create a new session to get started
                </p>
            </div>
        {:else}
            <div class="space-y-3">
                {#each sessions as session (session.id)}
                    <div
                        class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                        <div class="flex items-center justify-between">
                            <div class="flex-1">
                                {#if editingSessionId === session.id}
                                    <!-- Edit mode -->
                                    <div
                                        class="flex items-center space-x-2 mb-2"
                                    >
                                        <input
                                            bind:value={editingSessionName}
                                            type="text"
                                            class="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            onkeydown={(e) => {
                                                if (e.key === "Enter")
                                                    saveSessionName();
                                                if (e.key === "Escape")
                                                    cancelEditSession();
                                            }}
                                        />
                                        <button
                                            onclick={saveSessionName}
                                            class="p-1 text-green-600 hover:text-green-800"
                                        >
                                            <Save size={16} />
                                        </button>
                                        <button
                                            onclick={cancelEditSession}
                                            class="p-1 text-gray-600 hover:text-gray-800"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                {:else}
                                    <!-- View mode -->
                                    <div
                                        class="flex items-center space-x-2 mb-2"
                                    >
                                        <h4 class="font-medium text-gray-800">
                                            {session.videoFileName}
                                        </h4>
                                        <button
                                            onclick={() =>
                                                startEditingSession(
                                                    session.id,
                                                    session.videoFileName
                                                )}
                                            class="p-1 text-gray-400 hover:text-gray-600"
                                            title="Edit session name"
                                        >
                                            <PenLine size={14} />
                                        </button>
                                    </div>
                                {/if}
                                <div
                                    class="flex items-center space-x-4 text-sm text-gray-500"
                                >
                                    <div class="flex items-center space-x-1">
                                        <Calendar size={14} />
                                        <span
                                            >Created: {formatDate(
                                                session.createdAt!
                                            )}</span
                                        >
                                    </div>
                                    {#if session.updatedAt && session.updatedAt !== session.createdAt}
                                        <div
                                            class="flex items-center space-x-1"
                                        >
                                            <Calendar size={14} />
                                            <span
                                                >Updated: {formatDate(
                                                    session.updatedAt
                                                )}</span
                                            >
                                        </div>
                                    {/if}
                                </div>
                            </div>

                            <div class="flex space-x-2">
                                <button
                                    onclick={() => loadSession(session.id)}
                                    class="flex items-center space-x-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
                                >
                                    <Play size={14} />
                                    <span>Load</span>
                                </button>
                                <button
                                    onclick={() =>
                                        duplicateSession(
                                            session.id,
                                            session.videoFileName
                                        )}
                                    disabled={duplicating === session.id}
                                    class="flex items-center space-x-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded text-sm transition-colors"
                                    title="Duplicate session"
                                >
                                    <Copy size={14} />
                                    <span
                                        >{duplicating === session.id
                                            ? "..."
                                            : "Duplicate"}</span
                                    >
                                </button>
                                <button
                                    onclick={() =>
                                        deleteSession(
                                            session.id,
                                            session.videoFileName
                                        )}
                                    class="flex items-center space-x-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                                >
                                    <Trash2 size={14} />
                                    <span>Delete</span>
                                </button>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>
