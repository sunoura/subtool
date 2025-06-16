<script lang="ts">
    import "../app.css";
    import ConnectionStatus from "$lib/components/ConnectionStatus.svelte";
    import { onMount } from "svelte";
    import { startConnectionMonitoring } from "$lib/stores/connectionStore.svelte.js";

    let { children } = $props();

    onMount(() => {
        // Start connection monitoring
        startConnectionMonitoring();
    });
</script>

{@render children()}

<ConnectionStatus />
