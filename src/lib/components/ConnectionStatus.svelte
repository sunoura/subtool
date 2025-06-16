<script lang="ts">
    import {
        Wifi,
        WifiOff,
        RefreshCw,
        AlertCircle,
        TestTube,
    } from "lucide-svelte";
    import {
        connectionState,
        getConnectionStatus,
        retryQueuedRequests,
    } from "$lib/stores/connectionStore.svelte.js";

    const status = $derived(getConnectionStatus());

    function handleRetryClick() {
        retryQueuedRequests();
    }

    // Test function to simulate connection issues
    function toggleConnection() {
        connectionState.isOnline = !connectionState.isOnline;
    }
</script>

{#if !connectionState.isOnline && status.queuedCount > 0}
    <div class="fixed top-4 right-4 z-50">
        <div
            class="flex items-center space-x-2 bg-white shadow-lg rounded-lg px-3 py-2 border"
        >
            <WifiOff class="w-4 h-4 text-red-600" />
            <span class="text-sm font-medium text-red-600"
                >{status.message}</span
            >

            <button
                onclick={handleRetryClick}
                disabled={connectionState.isRetrying}
                class="ml-2 p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                title="Retry queued requests"
            >
                <RefreshCw
                    class="w-3 h-3 {connectionState.isRetrying
                        ? 'animate-spin'
                        : ''}"
                />
            </button>

            <div title="Work is being saved locally">
                <AlertCircle class="w-4 h-4 text-amber-500" />
            </div>

            <!-- Test button - remove in production -->
            <button
                onclick={toggleConnection}
                class="ml-2 p-1 rounded hover:bg-gray-100"
                title="Test: Toggle connection"
            >
                <TestTube class="w-3 h-3 text-gray-500" />
            </button>
        </div>
    </div>
{/if}
