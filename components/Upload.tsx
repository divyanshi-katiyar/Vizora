import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useOutletContext } from "react-router";
import { CheckCircle2, ImageIcon, UploadIcon } from "lucide-react";
import {
    PROGRESS_INCREMENT,
    REDIRECT_DELAY_MS,
    PROGRESS_INTERVAL_MS,
} from "../lib/constants";

interface UploadProps {
    onComplete?: (base64Data: string) => void;
}

const Upload = ({ onComplete }: UploadProps) => {
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [progress, setProgress] = useState(0);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const navigate = useNavigate();

    const context = useOutletContext<any>() || {};
    const isSignedIn = context.isSignedIn ?? false;

    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        };
    }, []);

    const processFile = useCallback(
        (selectedFile: File) => {
            if (!isSignedIn) return;

            setFile(selectedFile);
            setProgress(0);

            const reader = new FileReader();
            reader.onerror = () => {
                setFile(null);
                setProgress(0);
            };

            reader.onloadend = () => {
                const base64Data = reader.result as string;

                intervalRef.current = setInterval(() => {
                    setProgress((prev) => {
                        const next = prev + (PROGRESS_INCREMENT || 10);
                        if (next >= 100) {
                            if (intervalRef.current) {
                                clearInterval(intervalRef.current);
                                intervalRef.current = null;
                            }

                            timeoutRef.current = setTimeout(() => {
                                if (onComplete) {
                                    onComplete(base64Data);
                                } else {
                                    const projectId = Date.now().toString();
                                    sessionStorage.setItem(`vizora_original_${projectId}`, base64Data);
                                    navigate(`/visualizer/${projectId}`);
                                }
                                timeoutRef.current = null;
                            }, REDIRECT_DELAY_MS || 500);

                            return 100;
                        }
                        return next;
                    });
                }, PROGRESS_INTERVAL_MS || 100);
            };

            reader.readAsDataURL(selectedFile);
        },
        [isSignedIn, onComplete, navigate]
    );

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        if (!isSignedIn) return;
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (!isSignedIn) return;

        const droppedFile = e.dataTransfer.files[0];
        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
        if (droppedFile && allowedTypes.includes(droppedFile.type)) {
            processFile(droppedFile);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!isSignedIn) return;

        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            processFile(selectedFile);
        }
    };

    return (
        <div className="upload">
            {!file ? (
                <div
                    className={`dropzone ${isDragging ? "is-dragging" : ""}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <input
                        type="file"
                        className="drop-input"
                        accept=".jpg,.jpeg,.png,.webp"
                        disabled={!isSignedIn}
                        onChange={handleChange}
                    />

                    <div className="drop-content">
                        <div className="drop-icon">
                            <UploadIcon size={20} />
                        </div>
                        <p>
                            {isSignedIn
                                ? "Click to upload or just drag and drop"
                                : "Sign in or sign up with Puter to upload"}
                        </p>
                        <p className="help">Maximum file size 50 MB.</p>
                    </div>
                </div>
            ) : (
                <div className="upload-status">
                    <div className="status-content">
                        <div className="status-icon">
                            {progress === 100 ? (
                                <CheckCircle2 className="check" />
                            ) : (
                                <ImageIcon className="image" />
                            )}
                        </div>

                        <h3>{file.name}</h3>

                        <div className="progress">
                            <div className="bar" style={{ width: `${progress}%` }} />
                        </div>
                        <p className="status-text">
                            {progress < 100 ? "Analyzing Floor Plan..." : "Redirecting..."}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Upload;