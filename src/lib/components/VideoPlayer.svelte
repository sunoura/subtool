<script lang="ts">
    import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-svelte";
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
    let volumeSlider: HTMLInputElement;
    
    // Audio state
    let isMuted = $state(false);
    let volume = $state(1.0); // 0.0 to 1.0
    let previousVolume = $state(1.0); // Store volume before muting
    
    // Video state tracking
    let isVideoReady = $state(false);
    let playPromise: Promise<void> | null = null;

    // Create derived state inside component
    const currentSubtitle = $derived(getCurrentSubtitle());
    const sortedSubtitles = $derived(getSortedSubtitles());

    // Video element effects
    $effect(() => {
        if (videoElement && subtitleState.currentVideoUrl) {
            videoElement.src = subtitleState.currentVideoUrl;
            isVideoReady = false;
        }
    });

    // Keyboard event handling with proper cleanup
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
                    event.preventDefault();
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
                } else if (event.code === "KeyM") {
                    event.preventDefault();
                    toggleMute();
                }
            }
        }

        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    });

    // Video event handlers
    function handleLoadedMetadata() {
        if (videoElement) {
            setVideoDuration(videoElement.duration);
            isVideoReady = true;
        }
    }

    function handleTimeUpdate() {
        if (videoElement) {
            setCurrentTime(videoElement.currentTime);
        }
    }

    function handlePlay() {
        setIsPlaying(true);
        playPromise = null;
    }

    function handlePause() {
        setIsPlaying(false);
        playPromise = null;
    }

    function handleEnded() {
        setIsPlaying(false);
        playPromise = null;
    }

    function handleError() {
        console.error("Video playback error:", videoElement?.error);
        setIsPlaying(false);
        playPromise = null;
    }

    // Improved play/pause with proper async handling
    async function togglePlay() {
        if (!videoElement || !isVideoReady) return;

        try {
            if (subtitleState.isPlaying) {
                videoElement.pause();
                setIsPlaying(false);
            } else {
                // Cancel any existing play promise
                if (playPromise) {
                    await playPromise;
                }
                
                playPromise = videoElement.play();
                await playPromise;
                // handlePlay() will be called by the 'play' event
            }
        } catch (error) {
            console.error("Play/pause error:", error);
            setIsPlaying(false);
            playPromise = null;
        }
    }

    function seekToTime(time: number) {
        if (videoElement && isVideoReady) {
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
            seekToTime(previousSubtitle.startTime);
        }
    }

    function skipForward() {
        // Go to next subtitle
        const currentTime = subtitleState.currentTime;
        const sorted = getSortedSubtitles();

        // Find the next subtitle after the current time
        const nextSubtitle = sorted.find(
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
                console.log("Current time copied to clipboard:", formattedTime);
            })
            .catch((err) => {
                console.error("Failed to copy time to clipboard:", err);
            });
    }

    // Audio control functions
    function handleVolumeChange(event: Event) {
        const target = event.target as HTMLInputElement;
        const newVolume = parseFloat(target.value);
        setVolume(newVolume);
    }

    function setVolume(newVolume: number) {
        volume = Math.max(0, Math.min(1, newVolume));
        if (videoElement) {
            videoElement.volume = volume;
        }
        
        // If volume is set to 0, mute the video
        if (volume === 0) {
            isMuted = true;
        } else if (isMuted) {
            // If we're increasing volume from 0, unmute
            isMuted = false;
        }
    }

    function toggleMute() {
        if (isMuted) {
            // Unmute and restore previous volume
            isMuted = false;
            if (videoElement) {
                videoElement.volume = previousVolume;
            }
            volume = previousVolume;
        } else {
            // Mute and store current volume
            previousVolume = volume;
            isMuted = true;
            if (videoElement) {
                videoElement.volume = 0;
            }
            volume = 0;
        }
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
                onended={handleEnded}
                onerror={handleError}
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
                    <span
                        onclick={copyCurrentTimeToClipboard}
                        class="cursor-pointer hover:text-white transition-colors"
                        title="Click to copy current time to clipboard"
                    >
                        {formatTime(subtitleState.currentTime)}
                    </span>
                    <span>{formatTime(subtitleState.videoDuration)}</span>
                </div>
            </div>

            <!-- Play controls -->
            <div class="flex items-center justify-between space-x-4 pb-4">
                <div class="min-w-[130px]"></div>
                <div class="play-controls">
                    <button
                        onclick={skipBackward}
                        class="p-2 text-white hover:text-blue-400 transition-colors"
                    >
                        <SkipBack size={24} />
                    </button>

                    <button
                        onclick={togglePlay}
                        disabled={!isVideoReady}
                        class="p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-full text-white transition-colors"
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

                <!-- Audio controls -->
                <div class="flex items-center space-x-3">
                    <button
                        onclick={toggleMute}
                        class="p-2 text-white hover:text-blue-400 transition-colors"
                        title="Toggle mute (M)"
                    >
                        {#if isMuted}
                            <VolumeX size={20} />
                        {:else}
                            <Volume2 size={20} />
                        {/if}
                    </button>
                    
                    <div class="flex items-center space-x-2">
                        <input
                            bind:this={volumeSlider}
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={volume}
                            oninput={handleVolumeChange}
                            class="w-20 h-1 bg-gray-700 rounded-xs appearance-none cursor-pointer volume-slider"
                            title="Volume control"
                        />
                    </div>
                </div>
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

    /* Volume slider styling */
    .volume-slider::-webkit-slider-thumb {
        appearance: none;
        width: 12px;
        height: 12px;
        background: #ffffff;
        cursor: pointer;
        border-radius: 50%;
        border: 1px solid #e5e7eb;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    }

    .volume-slider::-moz-range-thumb {
        width: 12px;
        height: 12px;
        background: #ffffff;
        cursor: pointer;
        border-radius: 50%;
        border: 1px solid #e5e7eb;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    }

    .volume-slider::-webkit-slider-track {
        background: transparent;
    }

    .volume-slider::-moz-range-track {
        background: transparent;
    }
</style>
