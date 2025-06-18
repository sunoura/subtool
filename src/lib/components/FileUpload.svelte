<script lang="ts">
    import { Upload, Video } from "lucide-svelte";
    import {
        setVideoFile,
        subtitleState,
    } from "$lib/state/subtitleState.svelte.js";

    let dragOver = $state(false);
    let fileInput: HTMLInputElement | null = $state(null);

    const acceptedTypes = [
        "video/mp4",
        "video/webm",
        "video/ogg",
        "video/mov",
        "video/avi",
    ];

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

        // No file size limit for personal use - just reference the local file
        setVideoFile(file);
    }

    function triggerFileInput() {
        fileInput?.click();
    }
</script>

{#if subtitleState.currentVideoFile}
    <div class="hidden bg-green-50 border border-green-200 p-4">
        <div class="flex items-center space-x-3">
            <Video class="text-green-600" size={24} />
            <div>
                <p class="text-green-800 font-medium">
                    {subtitleState.currentVideoFile.name}
                </p>
                <p class="text-green-600 text-sm">
                    {(
                        subtitleState.currentVideoFile.size /
                        (1024 * 1024)
                    ).toFixed(2)} MB
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
        <p class="text-gray-500 mb-4">
            Drag and drop your video file here, or click to browse
        </p>
        <!-- <button
            onclick={triggerFileInput}
            class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
            Choose File
        </button> -->
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
