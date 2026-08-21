type PuterClient = {
    ai?: {
        txt2img: (prompt: string, options?: Record<string, unknown>) => Promise<{ src?: string }>;
    };
};

const fetchAsDataUrl = async (url: string): Promise<string> => {
    if (url.startsWith("data:")) return url;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Unable to read floor plan (${response.status})`);

    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error ?? new Error("Unable to read floor plan"));
        reader.readAsDataURL(blob);
    });
};

const waitForPuter = async (timeoutMs = 5000): Promise<PuterClient | null> => {
    if (typeof window === "undefined") return null;

    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
        const puter = (window as Window & { puter?: PuterClient }).puter;
        if (puter?.ai) return puter;
        await new Promise((resolve) => setTimeout(resolve, 250));
    }

    return null;
};

export const generateRoomDesign = async ({
                                             imageUrl,
                                             prompt,
                                             style,
                                         }: {
    imageUrl: string;
    prompt?: string;
    style?: string;
}) => {
    const puter = await waitForPuter();
    if (!puter?.ai) {
        console.warn("Puter AI is unavailable; using the uploaded floor plan as a local preview.");
        return imageUrl;
    }

    const fullPrompt = `[TASK: Convert 2D Floor Plan Blueprint into a Photorealistic 3D Furnished Floor Plan Render]

Instructions:
1. Geometry & Layout:
   - Precisely preserve the existing 2D room layout, wall lines, entryways, and window openings.
   - Extrude all interior and exterior walls upward to create realistic wall height, structural thickness, and solid black top edges.

2. 3D Furniture & Fixtures:
   - Replace every 2D schematic symbol with realistic 3D volumetric furniture:
     * Master Bedroom: Place a 3D queen-size bed with white/gray layered duvets, pillows, and bedside nightstands with small modern lamps.
     * Secondary Bedrooms: Place 3D twin/full beds with neatly made bedding with blue and slate gray accents along the corresponding walls.
     * Bathroom: Add a 3D white porcelain bathtub, toilet, double-sink vanity unit, and chrome fixtures.
     * Hallway / Study Area: Place a modern white work desk with a minimal ergonomic swivel chair and subtle decor.
     * Staircase: Render realistic wooden/white steps leading up.

3. Materials, Textures & Flooring:
   - Lay down smooth, light natural oak hardwood planks continuously across all bedrooms, hallways, and living spaces.
   - Lay down light gray matte ceramic tiles on the bathroom floor.
   - Keep interior walls clean matte off-white.

4. Lighting & Rendering Quality:
   - Render from an orthographic top-down bird's-eye cutaway perspective.
   - Apply bright natural daylight entering from all exterior windows, casting soft directional contact shadows and ambient occlusion beneath furniture pieces.
   - Output style: Clean architectural digest 3D floor plan visualization, crisp lines, 8k resolution, photorealistic finish.
${style ? `
Interior aesthetic: ${style}.` : ""}${prompt ? `
Additional notes: ${prompt}` : ""}`;

    try {
        const dataUrl = await fetchAsDataUrl(imageUrl);
        const [header, base64Data] = dataUrl.split(",", 2);
        const mimeType = header.match(/^data:([^;]+);/)?.[1];

        if (!base64Data || !mimeType) {
            throw new Error("Invalid floor plan image data");
        }

        const imageElement = await puter.ai.txt2img(fullPrompt, {
            provider: "gemini",
            model: "gemini-2.5-flash-image-preview",
            input_image: base64Data,
            input_image_mime_type: mimeType,
            ratio: { w: 1024, h: 1024 },
        });

        if (!imageElement || !imageElement.src) {
            throw new Error("AI failed to generate an image response.");
        }

        return imageElement.src;
    } catch (error) {
        console.error("Design generation error:", error);
        console.warn("Using the uploaded floor plan as a local preview instead.");
        return imageUrl;
    }
};

export const generate3DView = async ({ sourceImage }: Generate3DViewParams) => {
    const renderedImage = await generateRoomDesign({ imageUrl: sourceImage });
    return { renderedImage, renderedPath: undefined };
};
