export function createConferenceObject({ name, url, host, year }) {
    const now = Date.now();
    return {
        meta: {
            name,
            url,
            host,
            year,
            createdAt: now,
            lastVisited: now
        },
        fields: {},
        status: {
            completed: false,
            needsReselection: false
        }
    };
}
