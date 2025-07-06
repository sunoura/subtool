<script lang="ts">
    import { Plus, Download } from "lucide-svelte";
    import {
        subtitleState,
        addSubtitle,
        setCurrentTime,
        formatTime,
        parseTime,
        exportToSRT,
        getSortedSubtitles,
    } from "$lib/state/subtitleState.svelte.js";

    let newSubtitleText = $state("");
    let newSubtitleStart = $state("");
    let newSubtitleEnd = $state("");

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

        // Scroll to the newly added subtitle after a brief delay
        setTimeout(() => {
            // Find the last subtitle container (the newly added one)
            const subtitleContainers = document.querySelectorAll(
                ".border.border-gray-200.rounded-xs.p-4"
            );
            const lastContainer =
                subtitleContainers[subtitleContainers.length - 1];
            if (lastContainer) {
                lastContainer.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                    inline: "nearest",
                });
            }
        }, 200);
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

<div class="bg-gray-900 pb-4 px-4 space-y-4">
    <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2">
            <button
                onclick={handleQuickAdd}
                disabled={!newSubtitleText.trim()}
                class="flex text-xs uppercase font-medium items-center space-x-1 px-3 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-xs transition-colors"
            >
                <Plus size={16} />
                <span>Add</span>
            </button>
        </div>

        <div class="flex justify-end items-center space-x-2">
            <button
                onclick={downloadSRT}
                disabled={subtitleState.subtitles.length === 0}
                class="flex text-xs uppercase font-medium items-center space-x-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 disabled:bg-gray-400 text-white rounded-xs transition-colors"
            >
                <Download size={16} />
                <span>Export SRT</span>
            </button>
        </div>
    </div>

    <!-- Add subtitle form -->
    <div class="rounded-xs">
        <div class="space-y-4">
            <div>
                <textarea
                    bind:value={newSubtitleText}
                    placeholder="Enter subtitle text..."
                    class="w-full px-3 py-2 border bg-gray-300 border-gray-300 rounded-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="2"
                ></textarea>
            </div>

            <div class="flex space-x-3"></div>
        </div>
    </div>
</div>
