import type { Route } from "./+types/home";
import { useNavigate, useOutletContext } from "react-router";
import Navbar from "../../components/Navbar";
import Upload from "../../components/Upload";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "Vizora - AI-Powered 3D Interior Visualizer" },
        {
            name: "description",
            content: "Reimagine your spaces with AI-powered interior visualization.",
        },
    ];
}

export default function Home() {
    const navigate = useNavigate();
    const context = useOutletContext<any>() || {};
    const { isSignedIn = false, signIn = () => {} } = context;

    const handleUploadComplete = async (base64Data: string) => {
        const projectId = Date.now().toString();
        sessionStorage.setItem(`vizora_original_${projectId}`, base64Data);
        navigate(`/visualizer/${projectId}`);
    };

    return (
        <div className="home">
            <Navbar />

            <section className="hero">
                <div className="announce">
                    <div className="dot">
                        <span className="pulse" />
                    </div>
                    <p>AI-Powered Interior Visualizer</p>
                </div>

                <h1>Reimagine Your Room in Seconds</h1>
                <p className="subtitle">
                    Upload a photo of your living room, bedroom, or workspace and watch AI
                    transform it into professionally designed styles.
                </p>

                {!isSignedIn && (
                    <div className="actions">
                        <button className="cta btn btn--primary btn--lg" onClick={signIn}>
                            Get Started Free
                        </button>
                    </div>
                )}

                <div className="upload-shell">
                    <div className="grid-overlay" />
                    <div className="upload-card">
                        <div className="upload-head">
                            <h3>Upload Your Room Photo</h3>
                            <p>Supports JPG, PNG, and WebP up to 50MB</p>
                        </div>
                        <Upload onComplete={handleUploadComplete} />
                    </div>
                </div>
            </section>
        </div>
    );
}