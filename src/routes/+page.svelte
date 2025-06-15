<script lang="ts">
    import SessionManager from "$lib/components/SessionManager.svelte";
</script>

<svelte:head>
    <title>Subtitler - Video Subtitle Editor</title>
    <meta
        name="description"
        content="Create and edit subtitles for your videos"
    />
</svelte:head>

<div class="min-h-screen bg-gray-100">
    <div class="container mx-auto px-4 py-8">
        <h1 class="text-4xl font-bold text-gray-800 mb-8 text-center">
            Video Subtitle Editor
        </h1>

        <div class="max-w-4xl mx-auto">
            <SessionManager />
        </div>

        <!-- Instructions -->
        <div class="mt-12 max-w-4xl mx-auto bg-white shadow-lg p-6">
            <h2 class="text-2xl font-bold text-gray-800 mb-4">How to Use</h2>
            <div class="space-y-4 text-gray-600">
                <div class="flex items-start space-x-3">
                    <span
                        class="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold"
                        >1</span
                    >
                    <p>
                        <strong>Create a new session</strong> or load a previous
                        one from the list above
                    </p>
                </div>
                <div class="flex items-start space-x-3">
                    <span
                        class="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold"
                        >2</span
                    >
                    <p>
                        <strong>Upload your video file</strong> - you can re-upload
                        the same file when resuming sessions
                    </p>
                </div>
                <div class="flex items-start space-x-3">
                    <span
                        class="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold"
                        >3</span
                    >
                    <p>
                        <strong>Add subtitles</strong> by playing the video and clicking
                        "Quick Add" at the right moments
                    </p>
                </div>
                <div class="flex items-start space-x-3">
                    <span
                        class="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold"
                        >4</span
                    >
                    <p>
                        <strong>Your progress is automatically saved</strong> - you
                        can refresh or close the browser and return later
                    </p>
                </div>
                <div class="flex items-start space-x-3">
                    <span
                        class="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold"
                        >5</span
                    >
                    <p>
                        <strong>Export to SRT</strong> format when done for YouTube,
                        Premiere Pro, or other video editors
                    </p>
                </div>
            </div>
        </div>
    </div>
</div>
