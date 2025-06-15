<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { ArrowLeft } from "lucide-svelte";
    import FileUpload from "$lib/components/FileUpload.svelte";
    import VideoPlayer from "$lib/components/VideoPlayer.svelte";
    import SubtitleEditor from "$lib/components/SubtitleEditor.svelte";
    import {
        subtitleState,
        setCurrentSession,
        setSubtitles,
    } from "$lib/state/subtitleState.svelte.js";
    import type { PageData } from "./$types.js";

    export let data: PageData;

    // Initialize session data when component mounts
    onMount(() => {
        setCurrentSession(data.session);
        setSubtitles(
            data.subtitles.map((sub: any) => ({
                id: sub.id,
                startTime: sub.startTime,
                endTime: sub.endTime,
                text: sub.text,
                order: sub.order,
            }))
        );
    });

    function goBack() {
        goto("/");
    }
</script>

<svelte:head>
    <title>Editing: {data.session.videoFileName} - Subtitler</title>
    <meta
        name="description"
        content="Edit subtitles for {data.session.videoFileName}"
    />
</svelte:head>

<div class="min-h-screen bg-gray-100">
    <div class="container mx-auto">
        <!-- Header with back button -->
        <div class=" hidden flex items-center mb-8">
            <button
                onclick={goBack}
                class="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors mr-4"
            >
                <ArrowLeft size={16} />
                <span>Back to Sessions</span>
            </button>

            <div>
                <h1 class="text-3xl font-bold text-gray-800">
                    {data.session.videoFileName}
                </h1>
                <p class="text-gray-600">
                    Session created: {new Date(
                        data.session.createdAt!
                    ).toLocaleDateString()}
                </p>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh)]">
            <!-- Left Column: Video Player and Upload - Fixed/Sticky -->
            <div class="lg:sticky lg:top-8 lg:h-fit space-y-6 p-4">
                <!-- Show upload only if no video is currently loaded -->
                {#if !subtitleState.currentVideoUrl}
                    <div
                        class="bg-blue-50 border border-blue-200 rounded-lg p-4"
                    >
                        <h3 class="text-lg font-semibold text-blue-800 mb-2">
                            Upload Video File
                        </h3>
                        <p class="text-blue-600 mb-4">
                            Upload the video file for this session to continue
                            editing subtitles.
                        </p>
                        <FileUpload />
                    </div>
                {:else}
                    <VideoPlayer />
                {/if}
            </div>

            <!-- Right Column: Subtitle Editor - Scrollable -->
            <div class="lg:overflow-y-auto lg:max-h-[calc(100vh)]">
                <SubtitleEditor />
            </div>
        </div>
    </div>
</div>
