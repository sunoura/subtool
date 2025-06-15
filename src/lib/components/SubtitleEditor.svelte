<script lang="ts">
    import {
        Plus,
        Trash2,
        Edit3,
        Save,
        X,
        Download,
        Play,
        ChevronLeft,
        ChevronRight,
    } from "lucide-svelte";
    import {
        subtitleState,
        addSubtitle,
        updateSubtitle,
        deleteSubtitle,
        setSelectedSubtitle,
        setCurrentTime,
        formatTime,
        parseTime,
        exportToSRT,
        getSortedSubtitles,
        saveSubtitleToDatabase,
    } from "$lib/state/subtitleState.svelte.js";

    let newSubtitleText = $state("");
    let newSubtitleStart = $state("");
    let newSubtitleEnd = $state("");
    let editingSubtitle = $state<string | null>(null);
    let editText = $state("");
    let editStart = $state("");
    let editEnd = $state("");

    // Create derived state inside component
    const sortedSubtitles = $derived(getSortedSubtitles());

    function handleAddSubtitle() {
        if (!newSubtitleText.trim()) return;

        const startTime = newSubtitleStart
            ? parseTime(newSubtitleStart)
            : subtitleState.currentTime;
        const endTime = newSubtitleEnd
            ? parseTime(newSubtitleEnd)
            : startTime + 3; // Default 3 seconds duration

        addSubtitle(startTime, endTime, newSubtitleText.trim());

        // Reset form
        newSubtitleText = "";
        newSubtitleStart = "";
        newSubtitleEnd = "";
    }

    function handleQuickAdd() {
        if (!newSubtitleText.trim()) return;

        const startTime = subtitleState.currentTime;
        const endTime = startTime + 3; // Default 3 seconds duration

        addSubtitle(startTime, endTime, newSubtitleText.trim());
        newSubtitleText = "";
    }

    function startEditing(subtitle: any) {
        editingSubtitle = subtitle.id;
        editText = subtitle.text;
        editStart = formatTime(subtitle.startTime);
        editEnd = formatTime(subtitle.endTime);
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

    function addSubtitleAfter(endTime: number) {
        // Create a new subtitle starting exactly where the clicked subtitle ends
        const startTime = endTime;
        const newEndTime = startTime + 3; // Default 3 seconds duration

        const newSubtitleId = crypto.randomUUID();
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
        if (subtitleState.currentSession) {
            saveSubtitleToDatabase(newSubtitle);
        }

        // Immediately put the new subtitle into edit mode
        editingSubtitle = newSubtitleId;
        editText = "";
        editStart = formatTime(startTime);
        editEnd = formatTime(newEndTime);

        // Focus the edit text area after a brief delay
        setTimeout(() => {
            const editTextArea = document.querySelector(
                'textarea[rows="2"]'
            ) as HTMLTextAreaElement;
            if (editTextArea && editingSubtitle === newSubtitleId) {
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

    function goToPreviousSubtitle() {
        const currentTime = subtitleState.currentTime;
        const sorted = getSortedSubtitles();

        // Find the previous subtitle before the current time
        let previousSubtitle = null;
        for (let i = sorted.length - 1; i >= 0; i--) {
            if (sorted[i].startTime < currentTime - 0.1) {
                // Small buffer to avoid same subtitle
                previousSubtitle = sorted[i];
                break;
            }
        }

        if (previousSubtitle) {
            seekToSubtitle(previousSubtitle.startTime);
        }
    }

    function goToNextSubtitle() {
        const currentTime = subtitleState.currentTime;
        const sorted = getSortedSubtitles();

        // Find the next subtitle after the current time
        const nextSubtitle = sorted.find(
            (sub) => sub.startTime > currentTime + 0.1
        ); // Small buffer

        if (nextSubtitle) {
            seekToSubtitle(nextSubtitle.startTime);
        }
    }

    function downloadSRT() {
        const srtContent = exportToSRT();
        const blob = new Blob([srtContent], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `subtitles-${Date.now()}.srt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
</script>

<div class="bg-white p-6 min-h-[100vh]">
    <div class="flex items-center justify-between mb-6">
        <div class="flex items-center space-x-2">
            <button
                onclick={goToPreviousSubtitle}
                disabled={subtitleState.subtitles.length === 0}
                class="flex text-xs uppercase font-medium items-center space-x-1 px-3 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-xs transition-colors"
                title="Go to previous subtitle"
            >
                <ChevronLeft size={16} />
                <span>Previous</span>
            </button>
            <button
                onclick={goToNextSubtitle}
                disabled={subtitleState.subtitles.length === 0}
                class="flex text-xs uppercase font-medium items-center space-x-1 px-3 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-xs transition-colors"
                title="Go to next subtitle"
            >
                <span>Next</span>
                <ChevronRight size={16} />
            </button>
        </div>
        <button
            onclick={downloadSRT}
            disabled={subtitleState.subtitles.length === 0}
            class="flex text-xs uppercase font-medium items-center space-x-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 disabled:bg-gray-400 text-white rounded-xs transition-colors"
        >
            <Download size={16} />
            <span>Export SRT</span>
        </button>
    </div>

    <!-- Add subtitle form -->
    <div class="rounded-xs mb-6">
        <div class="space-y-4">
            <div>
                <textarea
                    bind:value={newSubtitleText}
                    placeholder="Enter subtitle text..."
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="2"
                ></textarea>
            </div>

            <!-- <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                        Start Time
                    </label>
                    <input
                        bind:value={newSubtitleStart}
                        type="text"
                        placeholder="00:00.000"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                        End Time
                    </label>
                    <input
                        bind:value={newSubtitleEnd}
                        type="text"
                        placeholder="00:03.000"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div> -->

            <div class="flex space-x-3">
                <button
                    onclick={handleQuickAdd}
                    disabled={!newSubtitleText.trim()}
                    class="flex text-xs uppercase font-medium items-center space-x-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 disabled:bg-gray-400 text-white rounded-xs transition-colors"
                >
                    <Plus size={16} />
                    <span>Add</span>
                </button>
            </div>
        </div>
    </div>

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
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                        seekToSubtitle(subtitle.startTime)}
                                    class="p-1 text-gray-500 hover:text-green-600 transition-colors"
                                    title="Go to this subtitle in video"
                                >
                                    <Play size={16} />
                                </button>
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
                                    <Edit3 size={16} />
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
