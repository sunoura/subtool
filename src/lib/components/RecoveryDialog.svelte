<script lang="ts">
    import { AlertTriangle, Download, Trash2 } from "lucide-svelte";
    import {
        loadFromLocalStorage,
        clearLocalStorage,
        setSubtitles,
        type BackupData,
    } from "$lib/state/subtitleState.svelte.js";

    let { isOpen = $bindable(false) } = $props();

    let backup = $state<BackupData | null>(null);

    $effect(() => {
        if (isOpen) {
            backup = loadFromLocalStorage();
        }
    });

    function handleRestore() {
        if (backup) {
            setSubtitles(backup.subtitles);
            isOpen = false;
        }
    }

    function handleDiscard() {
        clearLocalStorage();
        isOpen = false;
    }

    function downloadBackup() {
        if (!backup) return;

        const content = JSON.stringify(backup, null, 2);
        const blob = new Blob([content], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `subtitler-backup-${new Date().toISOString().slice(0, 19)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
</script>

{#if isOpen && backup}
    <div
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    >
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div class="flex items-center space-x-3 mb-4">
                <AlertTriangle class="w-6 h-6 text-amber-500" />
                <h2 class="text-lg font-semibold">Unsaved Work Found</h2>
            </div>

            <div class="mb-6">
                <p class="text-gray-600 mb-3">
                    We found unsaved work from {new Date(
                        backup.timestamp
                    ).toLocaleString()}.
                </p>
                <div class="bg-amber-50 border border-amber-200 rounded-md p-3">
                    <p class="text-sm text-amber-800">
                        <strong>{backup.subtitles.length}</strong>
                        subtitle{backup.subtitles.length !== 1 ? "s" : ""}
                        {backup.sessionId
                            ? "for this session"
                            : "without a session"}
                    </p>
                </div>
            </div>

            <div class="flex space-x-3 justify-end">
                <button
                    onclick={downloadBackup}
                    class="flex items-center space-x-2 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                >
                    <Download class="w-4 h-4" />
                    <span>Download</span>
                </button>

                <button
                    onclick={handleDiscard}
                    class="flex items-center space-x-2 px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                    <Trash2 class="w-4 h-4" />
                    <span>Discard</span>
                </button>

                <button
                    onclick={handleRestore}
                    class="flex items-center space-x-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                    <span>Restore Work</span>
                </button>
            </div>
        </div>
    </div>
{/if}
