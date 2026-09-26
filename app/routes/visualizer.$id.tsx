import { useNavigate, useOutletContext, useParams} from "react-router";
import {
    type CSSProperties,
    type KeyboardEvent,
    type PointerEvent,
    useEffect,
    useRef,
    useState,
} from "react";
import {generate3DView} from "../../lib/ai.action";
import {Box, Check, Download, RefreshCcw, Share2, X} from "lucide-react";
import Button from "../../components/ui/Button";
import {createProject, getProjectById} from "../../lib/puter.action";

interface BeforeAfterSliderProps {
    before: string;
    after: string;
}

function BeforeAfterSlider({ before, after }: BeforeAfterSliderProps) {
    const stageRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState(50);

    const updatePosition = (clientX: number) => {
        const stage = stageRef.current;
        if (!stage) return;
        const bounds = stage.getBoundingClientRect();
        const next = ((clientX - bounds.left) / bounds.width) * 100;
        setPosition(Math.min(100, Math.max(0, next)));
    };

    const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        updatePosition(event.clientX);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        const step = event.shiftKey ? 10 : 2;
        if (event.key === "ArrowLeft") {
            event.preventDefault();
            setPosition((value) => Math.max(0, value - step));
        }
        if (event.key === "ArrowRight") {
            event.preventDefault();
            setPosition((value) => Math.min(100, value + step));
        }
    };

    const overlayStyle = {
        clipPath: `inset(0 ${100 - position}% 0 0)`,
    } satisfies CSSProperties;

    return (
        <div
            ref={stageRef}
            className="before-after"
            onPointerDown={handlePointerDown}
            onPointerMove={(event) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                    updatePosition(event.clientX);
                }
            }}
            onPointerUp={(event) => event.currentTarget.releasePointerCapture(event.pointerId)}
            onKeyDown={handleKeyDown}
            role="slider"
            tabIndex={0}
            aria-label="Before and after comparison"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(position)}
        >
            <img src={after} alt="After: AI-generated design" className="compare-img" />
            <div className="before-layer" style={overlayStyle}>
                <img src={before} alt="Before: original room" className="compare-img" />
            </div>
            <span className="compare-label compare-label--before">Before</span>
            <span className="compare-label compare-label--after">After</span>
            <div className="compare-handle" style={{ left: `${position}%` }} aria-hidden="true">
                <span className="compare-handle__grip">↔</span>
            </div>
        </div>
    );
}

const VisualizerId = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { userId } = useOutletContext<AuthContext>()

    const hasInitialGenerated = useRef(false);

    const [project, setProject] = useState<DesignItem | null>(null);
    const [isProjectLoading, setIsProjectLoading] = useState(true);

    const [isProcessing, setIsProcessing] = useState(false);
    const [currentImage, setCurrentImage] = useState<string | null>(null);
    const [generationError, setGenerationError] = useState<string | null>(null);
    const [isCopied, setIsCopied] = useState(false);

    const handleBack = () => navigate('/');
    const handleExport = () => {
        if (!currentImage) return;

        const link = document.createElement('a');
        link.href = currentImage;
        link.download = `vizora-${id || 'design'}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    const handleShare = async () => {
        try {
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(window.location.href);
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2500);
            }
        } catch (err) {
            console.error("Failed to copy link:", err);
        }
    };

    const runGeneration = async (item: DesignItem) => {
        if(!id || !item.sourceImage) return;

        try {
            setIsProcessing(true);
            setGenerationError(null);
            const result = await generate3DView({ sourceImage: item.sourceImage });

            if(result.renderedImage) {
                setCurrentImage(result.renderedImage);

                const updatedItem = {
                    ...item,
                    renderedImage: result.renderedImage,
                    renderedPath: result.renderedPath,
                    timestamp: Date.now(),
                    ownerId: item.ownerId ?? userId ?? null,
                    isPublic: item.isPublic ?? false,
                }

                const saved = await createProject({ item: updatedItem, visibility: "private" })

                if(saved) {
                    setProject(saved);
                    setCurrentImage(saved.renderedImage || result.renderedImage);
                }
            }
        } catch (error) {
            console.error('Generation failed: ', error)
            setGenerationError("The render service is unavailable. Your original floor plan is still available below.");
        } finally {
            setIsProcessing(false);
        }
    }

    const handleRegenerate = () => {
        if (project && !isProcessing) void runGeneration(project);
    };

    useEffect(() => {
        let isMounted = true;

        const loadProject = async () => {
            if (!id) {
                setIsProjectLoading(false);
                return;
            }

            setIsProjectLoading(true);

            const fetchedProject = await getProjectById({ id });

            if (!isMounted) return;

            setProject(fetchedProject);
            setCurrentImage(fetchedProject?.renderedImage || null);
            setIsProjectLoading(false);
            hasInitialGenerated.current = false;
        };

        loadProject();

        return () => {
            isMounted = false;
        };
    }, [id]);

    useEffect(() => {
        if (
            isProjectLoading ||
            hasInitialGenerated.current ||
            !project?.sourceImage
        )
            return;

        if (project.renderedImage) {
            setCurrentImage(project.renderedImage);
            hasInitialGenerated.current = true;
            return;
        }

        hasInitialGenerated.current = true;
        void runGeneration(project);
    }, [project, isProjectLoading]);

    return (
        <div className="visualizer">
            <nav className="topbar">
                <div className="brand">
                    <Box className="logo" />

                    <span className="name">Vizora</span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleBack} className="exit">
                    <X className="icon" /> Exit Editor
                </Button>
            </nav>

            <section className="content">
                <div className="panel">
                    <div className="panel-header">
                        <div className="panel-meta">
                            <p>Project</p>
                            <h2>{project?.name || `Residence ${id}`}</h2>
                            <p className="note">Created by You</p>
                        </div>

                        <div className="panel-actions">
                            <Button
                                size="sm"
                                onClick={handleExport}
                                className="export"
                                disabled={!currentImage}
                            >
                                <Download className="w-4 h-4 mr-2" /> Export
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleRegenerate}
                                className="regenerate"
                                disabled={!project?.sourceImage || isProcessing}
                            >
                                <RefreshCcw className={`w-4 h-4 mr-2 ${isProcessing ? "animate-spin" : ""}`} />
                                {isProcessing ? "Rendering" : "Regenerate"}
                            </Button>
                            <Button size="sm" onClick={handleShare} className="share">
                                {isCopied ? (
                                    <>
                                        <Check className="w-4 h-4 mr-2" /> Copied!
                                    </>
                                ) : (
                                    <>
                                        <Share2 className="w-4 h-4 mr-2" /> Share
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    <div className={`render-area ${isProcessing ? 'is-processing': ''}`}>
                        {currentImage ? (
                            <img src={currentImage} alt="AI Render" className="render-img" />
                        ) : (
                            <div className="render-placeholder">
                                {project?.sourceImage && (
                                    <img src={project?.sourceImage} alt="Original" className="render-fallback" />
                                )}
                            </div>
                        )}

                        {isProcessing && (
                            <div className="render-overlay">
                                <div className="rendering-card">
                                    <RefreshCcw className="spinner" />
                                    <span className="title">Rendering...</span>
                                    <span className="subtitle">Generating your 3D visualization</span>
                                </div>
                            </div>
                        )}

                        {generationError && !isProcessing && (
                            <p className="render-error" role="alert">{generationError}</p>
                        )}
                    </div>

                </div>

                <div className="panel compare">
                    <div className="panel-header">
                        <div className="panel-meta">
                            <p>Comparison</p>
                            <h3>Before and After</h3>
                        </div>
                        <div className="hint">Drag to compare</div>
                    </div>

                    <div className="compare-stage">
                        {project?.sourceImage && currentImage ? (
                            <BeforeAfterSlider before={project.sourceImage} after={currentImage} />
                        ) : (
                            <div className="compare-fallback">
                                {project?.sourceImage && (
                                    <img src={project.sourceImage} alt="Before" className="compare-img" />
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    )
}
export default VisualizerId
