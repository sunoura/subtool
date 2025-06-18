<script lang="ts">
    import { Trash2, PenLine, Save, X, Play, Plus } from "lucide-svelte";
    import {
        subtitleState,
        updateSubtitle,
        deleteSubtitle,
        setCurrentTime,
        formatTime,
        parseTime,
        getSortedSubtitles,
        saveSubtitleToDatabase,
    } from "$lib/state/subtitleState.svelte.js";

    let editingSubtitle = $state<string | null>(null);
    let editText = $state("");
    let editStart = $state("");
    let editEnd = $state("");

    // Create derived state inside component using the function
    const sortedSubtitles = $derived(getSortedSubtitles());

    function scrollToEditingSubtitle(subtitleId: string) {
        // Find the subtitle container that's being edited
        const subtitleContainers = document.querySelectorAll(
            ".border.border-gray-200.rounded-xs.p-4"
        );
        for (const container of subtitleContainers) {
            const editTextArea = container.querySelector(
                'textarea[rows="2"]'
            ) as HTMLTextAreaElement;
            if (editTextArea) {
                container.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                    inline: "nearest",
                });
                break;
            }
        }
    }

    function startEditing(subtitle: any) {
        editingSubtitle = subtitle.id;
        editText = subtitle.text;
        editStart = formatTime(subtitle.startTime);
        editEnd = formatTime(subtitle.endTime);

        // Scroll to the edit form after a brief delay
        setTimeout(() => {
            scrollToEditingSubtitle(subtitle.id);
        }, 100);
    }

    function saveEdit() {
        if (!editingSubtitle) return;

        updateSubtitle(editingSubtitle, {
            text: editText,
            startTime: parseTime(editStart),
            endTime: parseTime(editEnd),
        });

        cancelEdit();
    }

    function cancelEdit() {
        editingSubtitle = null;
        editText = "";
        editStart = "";
        editEnd = "";
    }

    function handleDelete(id: string) {
        if (confirm("Are you sure you want to delete this subtitle?")) {
            deleteSubtitle(id);
        }
    }

    async function addSubtitleAfter(endTime: number) {
        // Add a small buffer (0.1s) to avoid overlaps and precision issues
        const startTime = Math.round((endTime + 0.1) * 1000) / 1000; // Round to 3 decimal places
        let newEndTime = Math.round((startTime + 3) * 1000) / 1000; // Default 3 seconds duration

        // Check if there's a next subtitle that would overlap
        const sortedSubs = getSortedSubtitles();
        const nextSubtitle = sortedSubs.find((sub) => sub.startTime > endTime);

        if (nextSubtitle && newEndTime > nextSubtitle.startTime) {
            // Adjust the end time to not overlap with the next subtitle
            // Leave a 0.1s buffer before the next subtitle
            newEndTime =
                Math.round((nextSubtitle.startTime - 0.1) * 1000) / 1000;

            // Ensure minimum duration of 0.5 seconds
            if (newEndTime - startTime < 0.5) {
                newEndTime = Math.round((startTime + 0.5) * 1000) / 1000;
            }
        }

        const newSubtitleId = crypto.randomUUID() as string;
        const newSubtitle = {
            id: newSubtitleId,
            startTime,
            endTime: newEndTime,
            text: "",
            order: subtitleState.subtitles.length + 1,
        };

        // Add to state
        subtitleState.subtitles.push(newSubtitle);

        // Auto-save to database if we have a current session
        let actualId = newSubtitleId;
        if (subtitleState.currentSession) {
            const dbId = await saveSubtitleToDatabase(newSubtitle);
            if (dbId) {
                actualId = dbId;
            }
        }

        // Immediately put the new subtitle into edit mode using the actual ID
        editingSubtitle = actualId;
        editText = "";
        editStart = formatTime(startTime);
        editEnd = formatTime(newEndTime);

        // Focus the edit text area and scroll to it after a brief delay
        setTimeout(() => {
            scrollToEditingSubtitle(actualId);
            // Also focus the textarea
            const editTextArea = document.querySelector(
                'textarea[rows="2"]'
            ) as HTMLTextAreaElement;
            if (editTextArea) {
                editTextArea.focus();
            }
        }, 100);
    }

    function seekToSubtitle(startTime: number) {
        // Seek the video to the subtitle's start time
        const videoElement = document.querySelector(
            "video"
        ) as HTMLVideoElement;
        if (videoElement) {
            videoElement.currentTime = startTime;
            // Also update the global state so UI reflects the change
            setCurrentTime(startTime);
        }
    }
</script>

<div class="bg-white p-6 min-h-[100vh]">
    <!-- Subtitles list -->
    <div class="space-y-3">
        {#if subtitleState.subtitles.length === 0}
            <p class="text-gray-500 text-center py-8">No subtitles added yet</p>
        {:else}
            {#each sortedSubtitles as subtitle (subtitle.id)}
                <div class="border border-gray-200 rounded-xs p-4">
                    {#if editingSubtitle === subtitle.id}
                        <!-- Edit mode -->
                        <div class="space-y-3">
                            <textarea
                                bind:value={editText}
                                class="w-full px-3 py-2 border border-gray-300 rounded-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows="2"
                            ></textarea>
                            <div class="grid grid-cols-2 gap-3">
                                <input
                                    bind:value={editStart}
                                    type="text"
                                    class="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <input
                                    bind:value={editEnd}
                                    type="text"
                                    class="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div class="flex space-x-2">
                                <button
                                    onclick={saveEdit}
                                    class="flex items-center space-x-1 px-3 py-1 bg-slate-600 hover:bg-slate-700 text-white rounded text-sm transition-colors"
                                >
                                    <Save size={14} />
                                    <span>Save</span>
                                </button>
                                <button
                                    onclick={cancelEdit}
                                    class="flex items-center space-x-1 px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors"
                                >
                                    <X size={14} />
                                    <span>Cancel</span>
                                </button>
                            </div>
                        </div>
                    {:else}
                        <!-- View mode -->
                        <div class="flex items-start justify-between">
                            <div class="flex-1">
                                <div class="flex items-center space-x-4 mb-2">
                                    <button
                                        onclick={() =>
                                            seekToSubtitle(subtitle.startTime)}
                                        class="text-sm text-blue-600 hover:text-blue-800 font-mono"
                                    >
                                        {formatTime(subtitle.startTime)} → {formatTime(
                                            subtitle.endTime
                                        )}
                                    </button>
                                    <span class="text-xs text-gray-500"
                                        >Duration: {formatTime(
                                            subtitle.endTime -
                                                subtitle.startTime
                                        )}</span
                                    >
                                </div>
                                <p class="text-gray-800">{subtitle.text}</p>
                            </div>
                            <div class="flex space-x-2 ml-4">
                                <button
                                    onclick={() =>
                                        addSubtitleAfter(subtitle.endTime)}
                                    class="p-1 text-gray-500 hover:text-purple-600 transition-colors"
                                    title="Add subtitle starting where this one ends"
                                >
                                    <Plus size={16} />
                                </button>
                                <button
                                    onclick={() => startEditing(subtitle)}
                                    class="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                                    title="Edit this subtitle"
                                >
                                    <PenLine size={16} />
                                </button>
                                <button
                                    onclick={() => handleDelete(subtitle.id)}
                                    class="p-1 text-gray-500 hover:text-red-600 transition-colors"
                                    title="Delete this subtitle"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    {/if}
                </div>
            {/each}
        {/if}
    </div>
</div>
