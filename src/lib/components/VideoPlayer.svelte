<script lang="ts">
    import { Play, Pause, SkipBack, SkipForward } from "lucide-svelte";
    import {
        subtitleState,
        setCurrentTime,
        setIsPlaying,
        setVideoDuration,
        formatTime,
        getCurrentSubtitle,
        getSortedSubtitles,
    } from "$lib/state/subtitleState.svelte.js";

    let videoElement: HTMLVideoElement;
    let progressBar: HTMLInputElement;

    // Create derived state inside component
    const currentSubtitle = $derived(getCurrentSubtitle());
    const sortedSubtitles = $derived(getSortedSubtitles());

    $effect(() => {
        if (videoElement && subtitleState.currentVideoUrl) {
            videoElement.src = subtitleState.currentVideoUrl;
        }
    });

    // Add keyboard support for spacebar play/pause and arrow scrubbing
    $effect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            const target = event.target as HTMLElement;
            const isTyping =
                target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.isContentEditable;

            // Only handle keyboard shortcuts when video is loaded and not typing
            if (subtitleState.currentVideoUrl && !isTyping) {
                if (event.code === "Space") {
                    event.preventDefault(); // Prevent page scroll
                    togglePlay();
                } else if (event.code === "ArrowLeft") {
                    event.preventDefault();
                    // Scrub backward 1 second
                    const newTime = Math.max(0, subtitleState.currentTime - 1);
                    seekToTime(newTime);
                } else if (event.code === "ArrowRight") {
                    event.preventDefault();
                    // Scrub forward 1 second
                    const newTime = Math.min(
                        subtitleState.videoDuration,
                        subtitleState.currentTime + 1
                    );
                    seekToTime(newTime);
                }
            }
        }

        // Add event listener to document
        document.addEventListener("keydown", handleKeyDown);

        // Cleanup function
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    });

    function handleLoadedMetadata() {
        if (videoElement) {
            setVideoDuration(videoElement.duration);
        }
    }

    function handleTimeUpdate() {
        if (videoElement) {
            setCurrentTime(videoElement.currentTime);
        }
    }

    function handlePlay() {
        setIsPlaying(true);
    }

    function handlePause() {
        setIsPlaying(false);
    }

    function togglePlay() {
        if (videoElement) {
            if (subtitleState.isPlaying) {
                videoElement.pause();
            } else {
                videoElement.play();
            }
        }
    }

    function seekToTime(time: number) {
        if (videoElement) {
            videoElement.currentTime = time;
            setCurrentTime(time);
        }
    }

    function handleProgressChange(event: Event) {
        const target = event.target as HTMLInputElement;
        const time = parseFloat(target.value);
        seekToTime(time);
    }

    function skipBackward() {
        seekToTime(Math.max(0, subtitleState.currentTime - 5));
    }

    function skipForward() {
        seekToTime(
            Math.min(subtitleState.videoDuration, subtitleState.currentTime + 5)
        );
    }
</script>

<div class="bg-black rounded-xs overflow-hidden">
    {#if subtitleState.currentVideoUrl}
        <div class="relative">
            <video
                bind:this={videoElement}
                class="w-full h-96 object-contain"
                onloadedmetadata={handleLoadedMetadata}
                ontimeupdate={handleTimeUpdate}
                onplay={handlePlay}
                onpause={handlePause}
                controls={false}
            >
                <track kind="captions" />
            </video>

            <!-- Subtitle overlay -->
            {#if currentSubtitle}
                <div
                    class="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white px-4 py-2 rounded text-center max-w-4/5"
                >
                    {currentSubtitle.text}
                </div>
            {/if}
        </div>

        <!-- Controls -->
        <div class="bg-gray-900 p-4 space-y-4">
            <!-- Progress bar -->
            <div class="">
                <div class="relative">
                    <input
                        bind:this={progressBar}
                        type="range"
                        min="0"
                        max={subtitleState.videoDuration || 100}
                        value={subtitleState.currentTime}
                        oninput={handleProgressChange}
                        class="w-full h-2 bg-gray-700 rounded-xs appearance-none cursor-pointer range-slider"
                    />

                    <!-- Subtitle markers -->
                    {#if subtitleState.videoDuration > 0}
                        {#each sortedSubtitles as subtitle (subtitle.id)}
                            {@const percentage =
                                subtitle.startTime /
                                subtitleState.videoDuration}
                            {@const position = percentage * 100}
                            <div
                                class="absolute top-0 w-0.5 h-2 bg-blue-400 pointer-events-none z-10"
                                style="left: calc({position}% + 0.2px)"
                                title="Subtitle at {formatTime(
                                    subtitle.startTime
                                )}: {subtitle.text.slice(0, 30)}{subtitle.text
                                    .length > 30
                                    ? '...'
                                    : ''}"
                            ></div>
                        {/each}
                    {/if}
                </div>
                <div class="flex justify-between text-sm text-gray-400">
                    <span>{formatTime(subtitleState.currentTime)}</span>
                    <span>{formatTime(subtitleState.videoDuration)}</span>
                </div>
            </div>

            <!-- Play controls -->
            <div class="flex items-center justify-center space-x-4">
                <button
                    onclick={skipBackward}
                    class="p-2 text-white hover:text-blue-400 transition-colors"
                >
                    <SkipBack size={24} />
                </button>

                <button
                    onclick={togglePlay}
                    class="p-3 bg-blue-600 hover:bg-blue-700 rounded-full text-white transition-colors"
                >
                    {#if subtitleState.isPlaying}
                        <Pause size={24} />
                    {:else}
                        <Play size={24} />
                    {/if}
                </button>

                <button
                    onclick={skipForward}
                    class="p-2 text-white hover:text-blue-400 transition-colors"
                >
                    <SkipForward size={24} />
                </button>
            </div>
        </div>
    {:else}
        <div class="h-96 flex items-center justify-center text-gray-400">
            <p>No video loaded</p>
        </div>
    {/if}
</div>

<style>
    /* Custom range slider styling */
    .range-slider::-webkit-slider-thumb {
        appearance: none;
        width: 3px;
        height: 16px;
        background: #ffffff;
        cursor: pointer;
        border-radius: 1px;
        border: 1px solid #e5e7eb;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    }

    .range-slider::-moz-range-thumb {
        width: 3px;
        height: 16px;
        background: #ffffff;
        cursor: pointer;
        border-radius: 1px;
        border: 1px solid #e5e7eb;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    }

    .range-slider::-webkit-slider-track {
        background: transparent;
    }

    .range-slider::-moz-range-track {
        background: transparent;
    }
</style>
