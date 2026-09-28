import { useState } from "react";
import "./App.css";

const API_URL =
    import.meta.env.VITE_API_URL || "http://localhost:5000";

function App() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const seConnecter = async (e) => {
        e.preventDefault();

        setMessage("");
        setLoading(true);

        try {
            const response = await fetch(API_URL + "/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: email.trim(),
                    password: password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Erreur de connexion."
                );
            }

            localStorage.setItem(
                "sms_token",
                data.token
            );

            localStorage.setItem(
                "sms_utilisateur",
                JSON.stringify(data.utilisateur)
            );

            setMessage("Connexion réussie.");

            window.location.reload();
        } catch (error) {
            setMessage(
                error.message || "Impossible de se connecter."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="app">
            <div className="login-container">
                <div className="login-box">
                    <h1>SMS Clients</h1>

                    <h2>Connexion administrateur</h2>

                    {message && (
                        <div className="error-message">
                            {message}
                        </div>
                    )}

                    <form onSubmit={seConnecter}>
                        <div className="form-group">
                            <label>Email</label>

                            <input
                                type="email"
                                value={email}
                                onChange={(e) =>
                                    setEmail(e.target.value)
                                }
                                placeholder="Votre adresse email"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Mot de passe</label>

                            <input
                                type="password"
                                value={password}
                                onChange={(e) =>
                                    setPassword(e.target.value)
                                }
                                placeholder="Votre mot de passe"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                        >
                            {loading
                                ? "Connexion..."
                                : "Se connecter"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default App;