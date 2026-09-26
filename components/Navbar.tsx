import { Link, useOutletContext } from "react-router";
import { Box, LogOut } from "lucide-react";
import Button from "./ui/Button";

export default function Navbar() {
    const { isSignedIn, userName, signIn, signOut } =
        useOutletContext<AuthContext>();

    const handleAuth = async () => {
        try {
            if (isSignedIn) await signOut();
            else await signIn();
        } catch (error) {
            console.error("Authentication action failed:", error);
        }
    };

    return (
        <header className="navbar">
            <nav className="inner" aria-label="Primary navigation">
                <div className="left">
                    <Link to="/" className="brand" aria-label="Vizora home">
                        <Box className="logo" aria-hidden="true" />
                        <span className="name">VIZORA</span>
                    </Link>


                </div>

                <div className="actions">
                    {isSignedIn ? (
                        <>
                            <span className="greeting" aria-live="polite">
                                Hi, {userName || "Creator"}
                            </span>
                            <Button variant="outline" size="sm" onClick={handleAuth}>
                                <LogOut aria-hidden="true" />
                                <span>Sign Out</span>
                            </Button>
                        </>
                    ) : (
                        <>
                            <button className="login" type="button" onClick={handleAuth}>
                                Log In
                            </button>
                            <button className="cta" type="button" onClick={handleAuth}>
                                Get Started
                            </button>
                        </>
                    )}
                </div>
            </nav>
        </header>
    );
}
