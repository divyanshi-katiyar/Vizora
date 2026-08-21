const getPuter = () => {
    if (typeof window !== "undefined" && (window as any).puter) {
        return (window as any).puter;
    }
    return null;
};

const workerUrl = (import.meta.env.VITE_PUTER_WORKER_URL || "").replace(/\/$/, "");

const getLocalProject = (id: string): DesignItem | null => {
    if (typeof sessionStorage === "undefined") return null;
    const sourceImage = sessionStorage.getItem(`roomify_original_${id}`);
    return sourceImage ? { id, sourceImage, timestamp: Date.now(), name: `Residence ${id}` } : null;
};

export const getCurrentUser = async () => {
    const puter = getPuter();
    if (!puter || !puter.auth) return null;

    try {
        if (puter.auth.isSignedIn()) {
            return await puter.auth.getUser();
        }
        return null;
    } catch (error) {
        console.error("Error fetching current user:", error);
        return null;
    }
};

export const signIn = async () => {
    const puter = getPuter();
    if (!puter || !puter.auth) {
        throw new Error("Puter.js is not loaded yet.");
    }
    return await puter.auth.signIn();
};

export const signOut = async () => {
    const puter = getPuter();
    if (!puter || !puter.auth) return;
    return await puter.auth.signOut();
};

export const uploadImageToPuter = async (file: File) => {
    const puter = getPuter();
    if (!puter || !puter.fs) {
        return {
            path: `local-${file.name}`,
            url: URL.createObjectURL(file),
        };
    }

    try {
        await puter.fs.mkdir("roomify-uploads", { dedupe: true }).catch(() => {});
        const path = `roomify-uploads/${Date.now()}-${file.name}`;
        await puter.fs.write(path, file);
        const url = await puter.fs.getReadURL(path);
        return { path, url };
    } catch (err) {
        console.error("Puter upload failed, using local fallback:", err);
        return {
            path: `local-${file.name}`,
            url: URL.createObjectURL(file),
        };
    }
};

export const createProject = async ({ item, visibility = "private" }: CreateProjectParams) => {
    if (!workerUrl) return item;
    try {
        const response = await fetch(`${workerUrl}/api/projects/save`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ project: item, visibility }),
        });
        if (!response.ok) throw new Error(`Project save failed (${response.status})`);
        const data = (await response.json()) as { project?: DesignItem | null };
        return data.project ?? item;
    } catch (error) {
        console.error("Project save failed; keeping the local project:", error);
        return item;
    }
};

export const getProjectById = async ({ id }: { id: string }) => {
    const localProject = getLocalProject(id);
    if (!workerUrl) return localProject;
    try {
        const response = await fetch(`${workerUrl}/api/projects/get?id=${encodeURIComponent(id)}`);
        if (!response.ok) return localProject;
        const data = (await response.json()) as { project?: DesignItem | null };
        return data.project ?? localProject;
    } catch (error) {
        console.error("Project fetch failed; using the local project:", error);
        return localProject;
    }
};
