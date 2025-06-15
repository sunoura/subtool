<script lang="ts">
    import {
        Folder,
        Plus,
        Play,
        Trash2,
        Calendar,
        FileVideo,
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
    let newSessionName = $state("");

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
                                <h4 class="font-medium text-gray-800">
                                    {session.videoFileName}
                                </h4>
                                <div
                                    class="flex items-center space-x-4 mt-1 text-sm text-gray-500"
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
