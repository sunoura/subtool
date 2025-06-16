interface QueuedRequest {
    id: string;
    url: string;
    method: string;
    body?: any;
    headers?: Record<string, string>;
    timestamp: number;
    retries: number;
}

interface ConnectionState {
    isOnline: boolean;
    lastChecked: Date | null;
    retryQueue: QueuedRequest[];
    isRetrying: boolean;
}

const initialState: ConnectionState = {
    isOnline: true,
    lastChecked: null,
    retryQueue: [],
    isRetrying: false,
};

export const connectionState = $state<ConnectionState>(initialState);

// Check connection by attempting to ping the API
export async function checkConnection(): Promise<boolean> {
    try {
        const response = await fetch("/api/health", {
            method: "HEAD",
            cache: "no-cache",
            signal: AbortSignal.timeout(5000), // 5 second timeout
        });

        const isOnline = response.ok;
        connectionState.isOnline = isOnline;
        connectionState.lastChecked = new Date();

        // If we're back online and have queued requests, start retrying
        if (
            isOnline &&
            connectionState.retryQueue.length > 0 &&
            !connectionState.isRetrying
        ) {
            retryQueuedRequests();
        }

        return isOnline;
    } catch (error) {
        connectionState.isOnline = false;
        connectionState.lastChecked = new Date();
        return false;
    }
}

// Add a failed request to the retry queue
export function queueFailedRequest(
    url: string,
    method: string,
    body?: any,
    headers?: Record<string, string>
): string {
    const requestId = crypto.randomUUID();

    const queuedRequest: QueuedRequest = {
        id: requestId,
        url,
        method,
        body,
        headers,
        timestamp: Date.now(),
        retries: 0,
    };

    connectionState.retryQueue.push(queuedRequest);
    console.log(`Queued failed request: ${method} ${url}`, queuedRequest);

    return requestId;
}

// Retry all queued requests
export async function retryQueuedRequests() {
    if (connectionState.retryQueue.length === 0 || connectionState.isRetrying) {
        return;
    }

    connectionState.isRetrying = true;
    console.log(
        `Retrying ${connectionState.retryQueue.length} queued requests...`
    );

    const requestsToRetry = [...connectionState.retryQueue];
    const successfulRequests: string[] = [];

    for (const request of requestsToRetry) {
        try {
            const response = await fetch(request.url, {
                method: request.method,
                headers: request.headers,
                body: request.body ? JSON.stringify(request.body) : undefined,
            });

            if (response.ok) {
                successfulRequests.push(request.id);
                console.log(
                    `Successfully retried: ${request.method} ${request.url}`
                );
            } else {
                request.retries++;
                if (request.retries >= 3) {
                    // Give up after 3 retries
                    successfulRequests.push(request.id);
                    console.error(
                        `Giving up on request after 3 retries: ${request.method} ${request.url}`
                    );
                }
            }
        } catch (error) {
            request.retries++;
            if (request.retries >= 3) {
                successfulRequests.push(request.id);
                console.error(
                    `Giving up on request after 3 retries: ${request.method} ${request.url}`,
                    error
                );
            }
        }
    }

    // Remove successful/failed requests from queue
    connectionState.retryQueue = connectionState.retryQueue.filter(
        (req) => !successfulRequests.includes(req.id)
    );

    connectionState.isRetrying = false;
    console.log(
        `Retry complete. ${successfulRequests.length} requests processed. ${connectionState.retryQueue.length} requests remaining.`
    );
}

// Enhanced fetch wrapper with automatic retry queueing
export async function safeFetch(
    url: string,
    options: RequestInit = {}
): Promise<Response> {
    try {
        const response = await fetch(url, options);

        if (response.ok) {
            // Update connection status on successful request
            if (!connectionState.isOnline) {
                connectionState.isOnline = true;
                connectionState.lastChecked = new Date();
            }
            return response;
        } else if (response.status >= 500) {
            // Server error - queue for retry
            throw new Error(`Server error: ${response.status}`);
        } else {
            // Client error - don't retry
            return response;
        }
    } catch (error) {
        // Network error - update connection status and queue for retry
        connectionState.isOnline = false;
        connectionState.lastChecked = new Date();

        if (options.method !== "GET" && options.method !== "HEAD") {
            // Only queue non-read operations
            queueFailedRequest(
                url,
                options.method || "GET",
                options.body ? JSON.parse(options.body as string) : undefined,
                options.headers as Record<string, string>
            );
        }

        throw error;
    }
}

// Start periodic connection checks
export function startConnectionMonitoring() {
    // Check immediately
    checkConnection();

    // Check every 30 seconds
    setInterval(checkConnection, 30000);

    // Also check when the page becomes visible (user comes back to tab)
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) {
            checkConnection();
        }
    });

    // Check when online/offline events fire
    window.addEventListener("online", checkConnection);
    window.addEventListener("offline", () => {
        connectionState.isOnline = false;
        connectionState.lastChecked = new Date();
    });
}

// Get connection status for UI
export function getConnectionStatus(): {
    status: "online" | "offline" | "checking";
    message: string;
    queuedCount: number;
} {
    const queuedCount = connectionState.retryQueue.length;

    if (connectionState.isOnline) {
        return {
            status: "online",
            message:
                queuedCount > 0
                    ? `Connected (${queuedCount} pending)`
                    : "Connected",
            queuedCount,
        };
    } else {
        return {
            status: "offline",
            message:
                queuedCount > 0 ? `Offline (${queuedCount} queued)` : "Offline",
            queuedCount,
        };
    }
}
