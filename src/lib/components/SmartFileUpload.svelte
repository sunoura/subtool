<script lang="ts">
    import { Upload, Video, CheckCircle, AlertCircle } from "lucide-svelte";
    import {
        setVideoFile,
        subtitleState,
        isMatchingFile,
    } from "$lib/state/subtitleState.svelte.js";

    let dragOver = $state(false);
    let fileInput = $state<HTMLInputElement>();
    let showFileHint = $state(false);

    const acceptedTypes = [
        "video/mp4",
        "video/webm",
        "video/ogg",
        "video/mov",
        "video/avi",
    ];

    // Show hint about expected file when session has file metadata
    $effect(() => {
        const session = subtitleState.currentSession;
        showFileHint = !!(
            session?.videoFileSize && !subtitleState.currentVideoFile
        );
    });

    function handleDragOver(event: DragEvent) {
        event.preventDefault();
        dragOver = true;
    }

    function handleDragLeave(event: DragEvent) {
        event.preventDefault();
        dragOver = false;
    }

    function handleDrop(event: DragEvent) {
        event.preventDefault();
        dragOver = false;

        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
            handleFile(files[0]);
        }
    }

    function handleFileSelect(event: Event) {
        const target = event.target as HTMLInputElement;
        if (target.files && target.files.length > 0) {
            handleFile(target.files[0]);
        }
    }

    function handleFile(file: File) {
        if (!acceptedTypes.includes(file.type)) {
            alert(
                "Please select a valid video file (MP4, WebM, OGG, MOV, AVI)"
            );
            return;
        }

        const session = subtitleState.currentSession;

        // Check if this matches the previously used file
        if (session && isMatchingFile(file, session)) {
            console.log("✅ Same file detected! Auto-loading...");
            setVideoFile(file);
            return;
        }

        // Check if this is a different file from what was previously used
        if (session?.videoFileSize && !isMatchingFile(file, session)) {
            const proceed = confirm(
                `This appears to be a different file than previously used.\n\n` +
                    `Expected: ${session.videoFileName} (${formatFileSize(session.videoFileSize)})\n` +
                    `Selected: ${file.name} (${formatFileSize(file.size)})\n\n` +
                    `Continue with the new file?`
            );

            if (!proceed) {
                return;
            }
        }

        setVideoFile(file);
    }

    function formatFileSize(bytes: number): string {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    }

    function formatDate(timestamp: number): string {
        return new Date(timestamp).toLocaleDateString();
    }

    function triggerFileInput() {
        fileInput?.click();
    }
</script>

{#if subtitleState.currentVideoFile}
    <div class="bg-green-50 border border-green-200 p-4 rounded-lg">
        <div class="flex items-center space-x-3">
            <CheckCircle class="text-green-600 flex-shrink-0" size={24} />
            <div class="flex-1">
                <p class="text-green-800 font-medium">
                    {subtitleState.currentVideoFile.name}
                </p>
                <p class="text-green-600 text-sm">
                    {formatFileSize(subtitleState.currentVideoFile.size)} • Modified:
                    {formatDate(subtitleState.currentVideoFile.lastModified)}
                </p>
            </div>
        </div>
    </div>
{:else}
    <div
        role="button"
        tabindex="0"
        class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center transition-colors {dragOver
            ? 'border-blue-500 bg-blue-50'
            : 'hover:border-gray-400'}"
        ondragover={handleDragOver}
        ondragleave={handleDragLeave}
        ondrop={handleDrop}
        onclick={triggerFileInput}
        onkeydown={(e) =>
            (e.key === "Enter" || e.key === " ") && triggerFileInput()}
        aria-label="Upload video file by drag and drop or click to browse"
    >
        <Upload class="mx-auto text-gray-400 mb-4" size={48} />
        <h3 class="text-lg font-medium text-gray-700 mb-2">
            Upload Video File
        </h3>

        {#if showFileHint && subtitleState.currentSession}
            <div
                class="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4"
            >
                <div class="flex items-start space-x-2">
                    <AlertCircle
                        class="text-amber-600 flex-shrink-0 mt-0.5"
                        size={16}
                    />
                    <div class="text-left">
                        <p class="text-amber-800 text-sm font-medium">
                            Expected file:
                        </p>
                        <p class="text-amber-700 text-sm">
                            {subtitleState.currentSession.videoFileName}
                        </p>
                        <p class="text-amber-600 text-xs">
                            {formatFileSize(
                                subtitleState.currentSession.videoFileSize || 0
                            )} • Modified: {formatDate(
                                subtitleState.currentSession
                                    .videoFileLastModified || 0
                            )}
                        </p>
                    </div>
                </div>
            </div>
        {/if}

        <p class="text-gray-500 mb-4">
            {showFileHint
                ? "Select the same video file to continue editing, or choose a different one"
                : "Drag and drop your video file here, or click to browse"}
        </p>

        <button
            class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
            Choose File
        </button>
        <p class="text-xs text-gray-400 mt-2">
            Supports MP4, WebM, OGG, MOV, AVI (no size limit)
        </p>

        <input
            bind:this={fileInput}
            type="file"
            accept="video/*"
            onchange={handleFileSelect}
            class="hidden"
        />
    </div>
{/if}
