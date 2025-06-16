<script lang="ts">
    import "../app.css";
    import ConnectionStatus from "$lib/components/ConnectionStatus.svelte";
    import RecoveryDialog from "$lib/components/RecoveryDialog.svelte";
    import { onMount } from "svelte";
    import { startConnectionMonitoring } from "$lib/stores/connectionStore.svelte.js";
    import { hasUnsavedChanges } from "$lib/state/subtitleState.svelte.js";

    let { children } = $props();
    let showRecoveryDialog = $state(false);

    onMount(() => {
        // Start connection monitoring
        startConnectionMonitoring();

        // Check for unsaved changes
        if (hasUnsavedChanges()) {
            showRecoveryDialog = true;
        }

        // Prevent accidental navigation when there are unsaved changes
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges()) {
                e.preventDefault();
                e.returnValue =
                    "You have unsaved changes. Are you sure you want to leave?";
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    });
</script>

{@render children()}

<ConnectionStatus />
<RecoveryDialog bind:isOpen={showRecoveryDialog} />
