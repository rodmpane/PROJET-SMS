import { useEffect, useState } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function App() {
    const [token, setToken] = useState(
        localStorage.getItem("sms_token") || ""
    );

    const [utilisateur, setUtilisateur] = useState(() => {
        const saved = localStorage.getItem("sms_utilisateur");
        return saved ? JSON.parse(saved) : null;
    });

    const [emailConnexion, setEmailConnexion] = useState("");
    const [motDePasseConnexion, setMotDePasseConnexion] = useState("");
    const [erreurConnexion, setErreurConnexion] = useState("");
    const [chargementConnexion, setChargementConnexion] = useState(false);

    const [clients, setClients] = useState([]);
    const [groupes, setGroupes] = useState([]);
    const [historique, setHistorique] = useState([]);
    const [modeles, setModeles] = useState([]);

    const [nomClient, setNomClient] = useState("");
    const [prenomClient, setPrenomClient] = useState("");
    const [telephoneClient, setTelephoneClient] = useState("");
    const [emailClient, setEmailClient] = useState("");
    const [groupeClient, setGroupeClient] = useState("");

    const [clientSms, setClientSms] = useState("");
    const [messageSms, setMessageSms] = useState("");

    const [groupeSms, setGroupeSms] = useState("");
    const [messageGroupe, setMessageGroupe] = useState("");

    const [nomModele, setNomModele] = useState("");
    const [messageModele, setMessageModele] = useState("");

    const [message, setMessage] = useState("");
    const [chargement, setChargement] = useState(false);

    const getHeaders = (avecJson = false) => {
        const headers = {
            Authorization: `Bearer ${token}`
        };

        if (avecJson) {
            headers["Content-Type"] = "application/json";
        }

        return headers;
    };

    const gererErreurAuthentification = (response) => {
        if (response.status === 401) {
            localStorage.removeItem("sms_token");
            localStorage.removeItem("sms_utilisateur");

            setToken("");
            setUtilisateur(null);

            throw new Error("Votre session a expiré.");
        }
    };

    const seConnecter = async (e) => {
        e.preventDefault();

        setErreurConnexion("");
        setChargementConnexion(true);

        try {
            const response = await fetch(`${API_URL}/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: emailConnexion,
                    password: motDePasseConnexion
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Erreur de connexion."
                );
            }

            localStorage.setItem("sms_token", data.token);

            localStorage.setItem(
                "sms_utilisateur",
                JSON.stringify(data.utilisateur)
            );

            setToken(data.token);
            setUtilisateur(data.utilisateur);

            setEmailConnexion("");
            setMotDePasseConnexion("");
        } catch (error) {
            setErreurConnexion(error.message);
        } finally {
            setChargementConnexion(false);
        }
    };

    const seDeconnecter = () => {
        localStorage.removeItem("sms_token");
        localStorage.removeItem("sms_utilisateur");

        setToken("");
        setUtilisateur(null);
    };

    const chargerClients = async () => {
        try {
            const response = await fetch(`${API_URL}/clients`, {
                headers: getHeaders()
            });

            gererErreurAuthentification(response);

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Erreur clients.");
            }

            setClients(data);
        } catch (error) {
            setMessage(error.message);
        }
    };

    const chargerGroupes = async () => {
        try {
            const response = await fetch(`${API_URL}/groupes`, {
                headers: getHeaders()
            });

            gererErreurAuthentification(response);

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Erreur groupes.");
            }

            setGroupes(data);
        } catch (error) {
            setMessage(error.message);
        }
    };

    const chargerHistorique = async () => {
        try {
            const response = await fetch(`${API_URL}/historique`, {
                headers: getHeaders()
            });

            gererErreurAuthentification(response);

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Erreur historique.");
            }

            setHistorique(data);
        } catch (error) {
            setMessage(error.message);
        }
    };

    const chargerModeles = async () => {
        try {
            const response = await fetch(`${API_URL}/modeles-sms`, {
                headers: getHeaders()
            });

            gererErreurAuthentification(response);

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Erreur modèles.");
            }

            setModeles(data);
        } catch (error) {
            setMessage(error.message);
        }
    };

    useEffect(() => {
        if (token) {
            chargerClients();
            chargerGroupes();
            chargerHistorique();
            chargerModeles();
        }
    }, [token]);

    const ajouterClient = async (e) => {
        e.preventDefault();

        setMessage("");
        setChargement(true);

        try {
            const response = await fetch(`${API_URL}/clients`, {
                method: "POST",
                headers: getHeaders(true),
                body: JSON.stringify({
                    nom: nomClient,
                    prenom: prenomClient,
                    telephone: telephoneClient,
                    email: emailClient,
                    groupeId: groupeClient || null
                })
            });

            gererErreurAuthentification(response);

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Impossible d'ajouter le client."
                );
            }

            setNomClient("");
            setPrenomClient("");
            setTelephoneClient("");
            setEmailClient("");
            setGroupeClient("");

            setMessage("Client ajouté avec succès.");

            chargerClients();
        } catch (error) {
            setMessage(error.message);
        } finally {
            setChargement(false);
        }
    };

    const supprimerClient = async (id) => {
        if (!window.confirm("Voulez-vous vraiment supprimer ce client ?")) {
            return;
        }

        try {
            const response = await fetch(`${API_URL}/clients/${id}`, {
                method: "DELETE",
                headers: getHeaders()
            });

            gererErreurAuthentification(response);

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Impossible de supprimer le client."
                );
            }

            setMessage("Client supprimé avec succès.");

            chargerClients();
        } catch (error) {
            setMessage(error.message);
        }
    };

    const envoyerSms = async (e) => {
        e.preventDefault();

        setMessage("");
        setChargement(true);

        try {
            const response = await fetch(`${API_URL}/sms/send`, {
                method: "POST",
                headers: getHeaders(true),
                body: JSON.stringify({
                    clientId: clientSms,
                    message: messageSms
                })
            });

            gererErreurAuthentification(response);

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Erreur lors de l'envoi du SMS."
                );
            }

            setMessageSms("");
            setClientSms("");

            setMessage("SMS envoyé avec succès.");

            chargerHistorique();
        } catch (error) {
            setMessage(error.message);
        } finally {
            setChargement(false);
        }
    };

    const envoyerSmsGroupe = async (e) => {
        e.preventDefault();

        setMessage("");
        setChargement(true);

        try {
            const response = await fetch(`${API_URL}/sms/send-group`, {
                method: "POST",
                headers: getHeaders(true),
                body: JSON.stringify({
                    groupeId: groupeSms,
                    message: messageGroupe
                })
            });

            gererErreurAuthentification(response);

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Erreur lors de l'envoi groupé."
                );
            }

            setMessageGroupe("");
            setGroupeSms("");

            setMessage("SMS de groupe envoyé avec succès.");

            chargerHistorique();
        } catch (error) {
            setMessage(error.message);
        } finally {
            setChargement(false);
        }
    };

    const ajouterModele = async (e) => {
        e.preventDefault();

        setMessage("");
        setChargement(true);

        try {
            const response = await fetch(`${API_URL}/modeles-sms`, {
                method: "POST",
                headers: getHeaders(true),
                body: JSON.stringify({
                    nom: nomModele,
                    message: messageModele
                })
            });

            gererErreurAuthentification(response);

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Impossible d'ajouter le modèle."
                );
            }

            setNomModele("");
            setMessageModele("");

            setMessage("Modèle ajouté avec succès.");

            chargerModeles();
        } catch (error) {
            setMessage(error.message);
        } finally {
            setChargement(false);
        }
    };

    const utiliserModele = (texte) => {
        setMessageSms(texte);
        setMessageGroupe(texte);
    };

    if (!token) {
        return (
            <div className="app">
                <div className="login-container">
                    <div className="login-box">
                        <h1>SMS Clients</h1>

                        <h2>Connexion administrateur</h2>

                        {erreurConnexion && (
                            <div className="error-message">
                                {erreurConnexion}
                            </div>
                        )}

                        <form onSubmit={seConnecter}>
                            <div className="form-group">
                                <label>Email</label>

                                <input
                                    type="email"
                                    value={emailConnexion}
                                    onChange={(e) =>
                                        setEmailConnexion(e.target.value)
                                    }
                                    placeholder="Votre adresse email"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Mot de passe</label>

                                <input
                                    type="password"
                                    value={motDePasseConnexion}
                                    onChange={(e) =>
                                        setMotDePasseConnexion(e.target.value)
                                    }
                                    placeholder="Votre mot de passe"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={chargementConnexion}
                            >
                                {chargementConnexion
                                    ? "Connexion..."
                                    : "Se connecter"}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="app">
            <header className="header">
                <div>
                    <h1>SMS Clients</h1>
                    <p>Gestion et envoi de SMS</p>
                </div>

                <div className="user-area">
                    <span>
                        {utilisateur?.nom || "Administrateur"}
                    </span>

                    <button onClick={seDeconnecter}>
                        Déconnexion
                    </button>
                </div>
            </header>

            <main className="container">
                {message && (
                    <div className="success-message">
                        {message}
                    </div>
                )}

                <section className="card">
                    <h2>Ajouter un client</h2>

                    <form onSubmit={ajouterClient}>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Nom</label>

                                <input
                                    type="text"
                                    value={nomClient}
                                    onChange={(e) =>
                                        setNomClient(e.target.value)
                                    }
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Prénom</label>

                                <input
                                    type="text"
                                    value={prenomClient}
                                    onChange={(e) =>
                                        setPrenomClient(e.target.value)
                                    }
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Téléphone</label>

                                <input
                                    type="text"
                                    value={telephoneClient}
                                    onChange={(e) =>
                                        setTelephoneClient(e.target.value)
                                    }
                                    placeholder="+243..."
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Email</label>

                                <input
                                    type="email"
                                    value={emailClient}
                                    onChange={(e) =>
                                        setEmailClient(e.target.value)
                                    }
                                />
                            </div>

                            <div className="form-group">
                                <label>Groupe</label>

                                <select
                                    value={groupeClient}
                                    onChange={(e) =>
                                        setGroupeClient(e.target.value)
                                    }
                                >
                                    <option value="">
                                        Sans groupe
                                    </option>

                                    {groupes.map((groupe) => (
                                        <option
                                            key={groupe.id}
                                            value={groupe.id}
                                        >
                                            {groupe.nom}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={chargement}
                        >
                            Ajouter le client
                        </button>
                    </form>
                </section>

                <section className="card">
                    <h2>Liste des clients</h2>

                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Nom</th>
                                    <th>Prénom</th>
                                    <th>Téléphone</th>
                                    <th>Email</th>
                                    <th>Groupe</th>
                                    <th>Action</th>
                                </tr>
                            </thead>

                            <tbody>
                                {clients.length === 0 ? (
                                    <tr>
                                        <td colSpan="6">
                                            Aucun client enregistré.
                                        </td>
                                    </tr>
                                ) : (
                                    clients.map((client) => (
                                        <tr key={client.id}>
                                            <td>{client.nom}</td>
                                            <td>{client.prenom}</td>
                                            <td>{client.telephone}</td>
                                            <td>{client.email || "-"}</td>
                                            <td>
                                                {client.groupe_nom ||
                                                    "Sans groupe"}
                                            </td>
                                            <td>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        supprimerClient(
                                                            client.id
                                                        )
                                                    }
                                                >
                                                    Supprimer
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="card">
                    <h2>Envoyer un SMS</h2>

                    <form onSubmit={envoyerSms}>
                        <div className="form-group">
                            <label>Client</label>

                            <select
                                value={clientSms}
                                onChange={(e) =>
                                    setClientSms(e.target.value)
                                }
                                required
                            >
                                <option value="">
                                    Sélectionner un client
                                </option>

                                {clients.map((client) => (
                                    <option
                                        key={client.id}
                                        value={client.id}
                                    >
                                        {client.prenom} {client.nom} -{" "}
                                        {client.telephone}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Message</label>

                            <textarea
                                value={messageSms}
                                onChange={(e) =>
                                    setMessageSms(e.target.value)
                                }
                                rows="5"
                                placeholder="Écrivez votre message..."
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={chargement}
                        >
                            Envoyer le SMS
                        </button>
                    </form>
                </section>

                <section className="card">
                    <h2>Envoyer à un groupe</h2>

                    <form onSubmit={envoyerSmsGroupe}>
                        <div className="form-group">
                            <label>Groupe</label>

                            <select
                                value={groupeSms}
                                onChange={(e) =>
                                    setGroupeSms(e.target.value)
                                }
                                required
                            >
                                <option value="">
                                    Sélectionner un groupe
                                </option>

                                {groupes.map((groupe) => (
                                    <option
                                        key={groupe.id}
                                        value={groupe.id}
                                    >
                                        {groupe.nom}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Message</label>

                            <textarea
                                value={messageGroupe}
                                onChange={(e) =>
                                    setMessageGroupe(e.target.value)
                                }
                                rows="5"
                                placeholder="Message pour le groupe..."
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={chargement}
                        >
                            Envoyer au groupe
                        </button>
                    </form>
                </section>

                <section className="card">
                    <h2>Modèles SMS</h2>

                    <form onSubmit={ajouterModele}>
                        <div className="form-group">
                            <label>Nom du modèle</label>

                            <input
                                type="text"
                                value={nomModele}
                                onChange={(e) =>
                                    setNomModele(e.target.value)
                                }
                                placeholder="Exemple : Rappel rendez-vous"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Message</label>

                            <textarea
                                value={messageModele}
                                onChange={(e) =>
                                    setMessageModele(e.target.value)
                                }
                                rows="4"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={chargement}
                        >
                            Ajouter le modèle
                        </button>
                    </form>

                    <div className="models-list">
                        {modeles.map((modele) => (
                            <div
                                className="model-item"
                                key={modele.id}
                            >
                                <strong>{modele.nom}</strong>

                                <p>{modele.message}</p>

                                <button
                                    type="button"
                                    onClick={() =>
                                        utiliserModele(
                                            modele.message
                                        )
                                    }
                                >
                                    Utiliser ce modèle
                                </button>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="card">
                    <h2>Historique des SMS</h2>

                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Téléphone</th>
                                    <th>Message</th>
                                    <th>Statut</th>
                                </tr>
                            </thead>

                            <tbody>
                                {historique.length === 0 ? (
                                    <tr>
                                        <td colSpan="4">
                                            Aucun SMS dans l'historique.
                                        </td>
                                    </tr>
                                ) : (
                                    historique.map((item) => (
                                        <tr key={item.id}>
                                            <td>
                                                {item.created_at
                                                    ? new Date(
                                                          item.created_at
                                                      ).toLocaleString()
                                                    : "-"}
                                            </td>

                                            <td>
                                                {item.telephone ||
                                                    item.phone ||
                                                    "-"}
                                            </td>

                                            <td>
                                                {item.message || "-"}
                                            </td>

                                            <td>
                                                {item.statut ||
                                                    item.status ||
                                                    "-"}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>
        </div>
    );
}

export default App;