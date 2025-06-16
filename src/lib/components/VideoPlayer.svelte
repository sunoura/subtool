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
        getSubtitleMarkers,
    } from "$lib/state/subtitleState.svelte.js";

    let videoElement = $state<HTMLVideoElement>();
    let progressBar = $state<HTMLInputElement>();

    // Performance optimization: throttle time updates
    let lastTimeUpdate = 0;
    const TIME_UPDATE_THROTTLE = 100; // 100ms throttle

    // Create derived state inside component using the functions
    const currentSubtitle = $derived(getCurrentSubtitle());
    const sortedSubtitles = $derived(getSortedSubtitles());
    const subtitleMarkers = $derived(getSubtitleMarkers());

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
        // Performance optimization: throttle time updates
        const now = Date.now();
        if (now - lastTimeUpdate < TIME_UPDATE_THROTTLE) return;

        lastTimeUpdate = now;
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
        // Go to previous subtitle
        const currentTime = subtitleState.currentTime;

        // Find the previous subtitle before the current time
        let previousSubtitle = null;
        for (let i = sortedSubtitles.length - 1; i >= 0; i--) {
            if (sortedSubtitles[i].startTime < currentTime - 0.1) {
                // Small buffer to avoid same subtitle
                previousSubtitle = sortedSubtitles[i];
                break;
            }
        }

        if (previousSubtitle) {
            seekToTime(previousSubtitle.startTime);
        }
    }

    function skipForward() {
        // Go to next subtitle
        const currentTime = subtitleState.currentTime;

        // Find the next subtitle after the current time
        const nextSubtitle = sortedSubtitles.find(
            (sub) => sub.startTime > currentTime + 0.1
        ); // Small buffer

        if (nextSubtitle) {
            seekToTime(nextSubtitle.startTime);
        }
    }

    function copyCurrentTimeToClipboard() {
        const formattedTime = formatTime(subtitleState.currentTime);
        navigator.clipboard
            .writeText(formattedTime)
            .then(() => {
                // Optional: You could add a toast notification here
                console.log("Current time copied to clipboard:", formattedTime);
            })
            .catch((err) => {
                console.error("Failed to copy time to clipboard:", err);
            });
    }
</script>

<div class="bg-black rounded-xs overflow-hidden">
    {#if subtitleState.currentVideoUrl}
        <div class="relative">
            <video
                bind:this={videoElement}
                class="w-full h-104 object-contain cursor-pointer"
                onloadedmetadata={handleLoadedMetadata}
                ontimeupdate={handleTimeUpdate}
                onplay={handlePlay}
                onpause={handlePause}
                onclick={togglePlay}
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
        <div class="bg-gray-900 pt-4 px-4">
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

                    <!-- Optimized subtitle markers using memoized data -->
                    {#each subtitleMarkers as marker (marker.id)}
                        <div
                            class="absolute top-0 w-0.5 h-2 bg-blue-400 pointer-events-none z-10"
                            style="left: calc({marker.position}% + 0.2px)"
                            title={marker.title}
                        ></div>
                    {/each}
                </div>
                <div class="flex justify-between text-sm text-gray-400">
                    <button
                        onclick={copyCurrentTimeToClipboard}
                        onkeydown={(e) =>
                            e.key === "Enter" && copyCurrentTimeToClipboard()}
                        class="cursor-pointer hover:text-white transition-colors bg-transparent border-none text-inherit font-inherit p-0"
                        title="Click to copy current time to clipboard"
                    >
                        {formatTime(subtitleState.currentTime)}
                    </button>
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
