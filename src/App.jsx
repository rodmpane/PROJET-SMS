import { useState } from "react";
import "./App.css";

function App() {
    const [email, setEmail] = useState("");

    return (
        <div className="app">
            <div className="login-container">
                <div className="login-box">
                    <h1>SMS Clients</h1>

                    <h2>Connexion administrateur</h2>

                    <form>
                        <div className="form-group">
                            <label>Email</label>

                            <input
                                type="email"
                                value={email}
                                onChange={(e) =>
                                    setEmail(e.target.value)
                                }
                                placeholder="Votre adresse email"
                            />
                        </div>

                        <div className="form-group">
                            <label>Mot de passe</label>

                            <input
                                type="password"
                                placeholder="Votre mot de passe"
                            />
                        </div>

                        <button type="button">
                            Se connecter
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default App;
