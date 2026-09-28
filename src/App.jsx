import { useEffect, useState } from "react";
import "./App.css";

const API_URL =
    import.meta.env.VITE_API_URL || "http://localhost:5000";

function App() {
    const [token, setToken] = useState(
        localStorage.getItem("sms_token") || ""
    );

    const [utilisateur, setUtilisateur] = useState(() => {
        try {
            const saved =
                localStorage.getItem("sms_utilisateur");

            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const [clients, setClients] = useState([]);
    const [groupes, setGroupes] = useState([]);
    const [historique, setHistorique] = useState([]);
    const [modeles, setModeles] = useState([]);

    const [nom, setNom] = useState("");
    const [prenom, setPrenom] = useState("");
    const [telephone, setTelephone] = useState("");
    const [emailClient, setEmailClient] = useState("");
    const [groupeId, setGroupeId] = useState("");

    const [clientSms, setClientSms] = useState("");
    const [messageSms, setMessageSms] = useState("");

    const [groupeSms, setGroupeSms] = useState("");
    const [messageGroupe, setMessageGroupe] = useState("");

    const [nomModele, setNomModele] = useState("");
    const [messageModele, setMessageModele] = useState("");

    const [nomGroupe, setNomGroupe] = useState("");
    const [descriptionGroupe, setDescriptionGroupe] = useState("");

    async function api(url, options = {}) {
        const response = await fetch(API_URL + url, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token,
                ...(options.headers || {})
            }
        });

        const data = await response.json();

        if (response.status === 401) {
            localStorage.removeItem("sms_token");
            localStorage.removeItem("sms_utilisateur");
            setToken("");
            setUtilisateur(null);
            throw new Error("Session expirée.");
        }

        if (!response.ok) {
            throw new Error(
                data.message || "Une erreur est survenue."
            );
        }

        return data;
    }

    async function seConnecter(e) {
        e.preventDefault();

        setMessage("");
        setLoading(true);

        try {
            const response = await fetch(
                API_URL + "/login",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        email: email.trim(),
                        password: password
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                        "Email ou mot de passe incorrect."
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

            setToken(data.token);
            setUtilisateur(data.utilisateur);
            setMessage("Connexion réussie.");
            setPassword("");

        } catch (error) {
            setMessage(
                error.message ||
                    "Impossible de se connecter."
            );
        } finally {
            setLoading(false);
        }
    }

    function seDeconnecter() {
        localStorage.removeItem("sms_token");
        localStorage.removeItem("sms_utilisateur");

        setToken("");
        setUtilisateur(null);
    }

    async function chargerDonnees() {
        try {
            const [
                clientsData,
                groupesData,
                historiqueData,
                modelesData
            ] = await Promise.all([
                api("/clients"),
                api("/groupes"),
                api("/historique"),
                api("/modeles-sms")
            ]);

            setClients(clientsData);
            setGroupes(groupesData);
            setHistorique(historiqueData);
            setModeles(modelesData);

        } catch (error) {
            setMessage(error.message);
        }
    }

    useEffect(() => {
        if (token) {
            chargerDonnees();
        }
    }, [token]);

    async function ajouterClient(e) {
        e.preventDefault();

        try {
            await api("/clients", {
                method: "POST",
                body: JSON.stringify({
                    nom,
                    prenom,
                    telephone,
                    email: emailClient,
                    groupeId: groupeId
                        ? Number(groupeId)
                        : null
                })
            });

            setNom("");
            setPrenom("");
            setTelephone("");
            setEmailClient("");
            setGroupeId("");

            setMessage("Client ajouté avec succès.");

            await chargerDonnees();

        } catch (error) {
            setMessage(error.message);
        }
    }

    async function supprimerClient(id) {
        if (!window.confirm("Supprimer ce client ?")) {
            return;
        }

        try {
            await api("/clients/" + id, {
                method: "DELETE"
            });

            setMessage("Client supprimé.");
            await chargerDonnees();

        } catch (error) {
            setMessage(error.message);
        }
    }

    async function ajouterGroupe(e) {
        e.preventDefault();

        try {
            await api("/groupes", {
                method: "POST",
                body: JSON.stringify({
                    nom: nomGroupe,
                    description: descriptionGroupe
                })
            });

            setNomGroupe("");
            setDescriptionGroupe("");

            setMessage("Groupe ajouté avec succès.");

            await chargerDonnees();

        } catch (error) {
            setMessage(error.message);
        }
    }

    async function envoyerSms(e) {
        e.preventDefault();

        try {
            const data = await api("/sms/send", {
                method: "POST",
                body: JSON.stringify({
                    telephone: clientSms,
                    message: messageSms
                })
            });

            setMessage(
                data.message ||
                    "SMS envoyé avec succès."
            );

            setClientSms("");
            setMessageSms("");

            await chargerDonnees();

        } catch (error) {
            setMessage(error.message);
        }
    }

    async function envoyerSmsGroupe(e) {
        e.preventDefault();

        try {
            const data = await api(
                "/sms/send-group",
                {
                    method: "POST",
                    body: JSON.stringify({
                        groupeId: Number(groupeSms),
                        message: messageGroupe
                    })
                }
            );

            setMessage(
                data.message ||
                    "Campagne terminée."
            );

            setMessageGroupe("");

            await chargerDonnees();

        } catch (error) {
            setMessage(error.message);
        }
    }

    async function ajouterModele(e) {
        e.preventDefault();

        try {
            await api("/modeles-sms", {
                method: "POST",
                body: JSON.stringify({
                    nom: nomModele,
                    message: messageModele
                })
            });

            setNomModele("");
            setMessageModele("");

            setMessage(
                "Modèle ajouté avec succès."
            );

            await chargerDonnees();

        } catch (error) {
            setMessage(error.message);
        }
    }

    function utiliserModele(message) {
        setMessageSms(message);
        setMessageGroupe(message);
    }

    if (!token) {
        return (
            <div className="app">
                <div className="login-container">
                    <div className="login-box">
                        <h1>SMS Clients</h1>

                        <h2>
                            Connexion administrateur
                        </h2>

                        {message && (
                            <div className="error-message">
                                {message}
                            </div>
                        )}

                        <form
                            onSubmit={seConnecter}
                        >
                            <div className="form-group">
                                <label>
                                    Email
                                </label>

                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) =>
                                        setEmail(
                                            e.target.value
                                        )
                                    }
                                    placeholder="Votre adresse email"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>
                                    Mot de passe
                                </label>

                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(
                                            e.target.value
                                        )
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

    return (
        <div className="app">

            <header className="topbar">
                <div>
                    <h1>SMS Clients</h1>
                    <p>
                        Gestion et envoi de SMS
                    </p>
                </div>

                <div>
                    <span>
                        {utilisateur?.nom ||
                            "Administrateur"}
                    </span>

                    <button
                        onClick={seDeconnecter}
                    >
                        Déconnexion
                    </button>
                </div>
            </header>

            <main className="dashboard">

                {message && (
                    <div className="success-message">
                        {message}
                    </div>
                )}

                <section>
                    <h2>Clients</h2>

                    <form
                        onSubmit={ajouterClient}
                        className="card"
                    >
                        <input
                            value={nom}
                            onChange={(e) =>
                                setNom(e.target.value)
                            }
                            placeholder="Nom"
                            required
                        />

                        <input
                            value={prenom}
                            onChange={(e) =>
                                setPrenom(e.target.value)
                            }
                            placeholder="Prénom"
                        />

                        <input
                            value={telephone}
                            onChange={(e) =>
                                setTelephone(
                                    e.target.value
                                )
                            }
                            placeholder="Téléphone"
                            required
                        />

                        <input
                            type="email"
                            value={emailClient}
                            onChange={(e) =>
                                setEmailClient(
                                    e.target.value
                                )
                            }
                            placeholder="Email"
                        />

                        <select
                            value={groupeId}
                            onChange={(e) =>
                                setGroupeId(
                                    e.target.value
                                )
                            }
                        >
                            <option value="">
                                Sans groupe
                            </option>

                            {groupes.map(
                                (groupe) => (
                                    <option
                                        key={groupe.id}
                                        value={groupe.id}
                                    >
                                        {groupe.nom}
                                    </option>
                                )
                            )}
                        </select>

                        <button type="submit">
                            Ajouter le client
                        </button>
                    </form>

                    <div className="card">
                        <h3>
                            Liste des clients
                        </h3>

                        {clients.length === 0 ? (
                            <p>
                                Aucun client.
                            </p>
                        ) : (
                            <table>
                                <thead>
                                    <tr>
                                        <th>
                                            Nom
                                        </th>
                                        <th>
                                            Téléphone
                                        </th>
                                        <th>
                                            Groupe
                                        </th>
                                        <th>
                                            Action
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {clients.map(
                                        (client) => (
                                            <tr
                                                key={
                                                    client.id
                                                }
                                            >
                                                <td>
                                                    {client.nom}{" "}
                                                    {client.prenom}
                                                </td>

                                                <td>
                                                    {
                                                        client.telephone
                                                    }
                                                </td>

                                                <td>
                                                    {
                                                        client.groupe_nom
                                                    ||
                                                        "Sans groupe"}
                                                </td>

                                                <td>
                                                    <button
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
                                        )
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </section>

                <section>
                    <h2>Groupes</h2>

                    <form
                        onSubmit={ajouterGroupe}
                        className="card"
                    >
                        <input
                            value={nomGroupe}
                            onChange={(e) =>
                                setNomGroupe(
                                    e.target.value
                                )
                            }
                            placeholder="Nom du groupe"
                            required
                        />

                        <input
                            value={descriptionGroupe}
                            onChange={(e) =>
                                setDescriptionGroupe(
                                    e.target.value
                                )
                            }
                            placeholder="Description"
                        />

                        <button type="submit">
                            Ajouter le groupe
                        </button>
                    </form>

                    <div className="card">
                        {groupes.length === 0 ? (
                            <p>
                                Aucun groupe.
                            </p>
                        ) : (
                            <ul>
                                {groupes.map(
                                    (groupe) => (
                                        <li
                                            key={
                                                groupe.id
                                            }
                                        >
                                            <strong>
                                                {
                                                    groupe.nom
                                                }
                                            </strong>

                                            {" - "}

                                            {
                                                groupe.description
                                            }
                                        </li>
                                    )
                                )}
                            </ul>
                        )}
                    </div>
                </section>

                <section>
                    <h2>SMS individuel</h2>

                    <form
                        onSubmit={envoyerSms}
                        className="card"
                    >
                        <input
                            value={clientSms}
                            onChange={(e) =>
                                setClientSms(
                                    e.target.value
                                )
                            }
                            placeholder="Numéro du destinataire"
                            required
                        />

                        <textarea
                            value={messageSms}
                            onChange={(e) =>
                                setMessageSms(
                                    e.target.value
                                )
                            }
                            placeholder="Votre message"
                            required
                        />

                        <button type="submit">
                            Envoyer le SMS
                        </button>
                    </form>
                </section>

                <section>
                    <h2>SMS groupe</h2>

                    <form
                        onSubmit={envoyerSmsGroupe}
                        className="card"
                    >
                        <select
                            value={groupeSms}
                            onChange={(e) =>
                                setGroupeSms(
                                    e.target.value
                                )
                            }
                            required
                        >
                            <option value="">
                                Sélectionner un groupe
                            </option>

                            {groupes.map(
                                (groupe) => (
                                    <option
                                        key={groupe.id}
                                        value={groupe.id}
                                    >
                                        {groupe.nom}
                                    </option>
                                )
                            )}
                        </select>

                        <textarea
                            value={messageGroupe}
                            onChange={(e) =>
                                setMessageGroupe(
                                    e.target.value
                                )
                            }
                            placeholder="Message à envoyer au groupe"
                            required
                        />

                        <button type="submit">
                            Envoyer au groupe
                        </button>
                    </form>
                </section>

                <section>
                    <h2>Modèles SMS</h2>

                    <form
                        onSubmit={ajouterModele}
                        className="card"
                    >
                        <input
                            value={nomModele}
                            onChange={(e) =>
                                setNomModele(
                                    e.target.value
                                )
                            }
                            placeholder="Nom du modèle"
                            required
                        />

                        <textarea
                            value={messageModele}
                            onChange={(e) =>
                                setMessageModele(
                                    e.target.value
                                )
                            }
                            placeholder="Message du modèle"
                            required
                        />

                        <button type="submit">
                            Ajouter le modèle
                        </button>
                    </form>

                    <div className="card">
                        {modeles.length === 0 ? (
                            <p>
                                Aucun modèle.
                            </p>
                        ) : (
                            <ul>
                                {modeles.map(
                                    (modele) => (
                                        <li
                                            key={
                                                modele.id
                                            }
                                        >
                                            <strong>
                                                {
                                                    modele.nom
                                                }
                                            </strong>

                                            <p>
                                                {
                                                    modele.message
                                                }
                                            </p>

                                            <button
                                                onClick={() =>
                                                    utiliserModele(
                                                        modele.message
                                                    )
                                                }
                                            >
                                                Utiliser
                                            </button>
                                        </li>
                                    )
                                )}
                            </ul>
                        )}
                    </div>
                </section>

                <section>
                    <h2>
                        Historique SMS
                    </h2>

                    <div className="card">
                        {historique.length === 0 ? (
                            <p>
                                Aucun SMS dans
                                l'historique.
                            </p>
                        ) : (
                            <table>
                                <thead>
                                    <tr>
                                        <th>
                                            Téléphone
                                        </th>
                                        <th>
                                            Message
                                        </th>
                                        <th>
                                            Statut
                                        </th>
                                        <th>
                                            Date
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {historique.map(
                                        (sms) => (
                                            <tr
                                                key={
                                                    sms.id
                                                }
                                            >
                                                <td>
                                                    {
                                                        sms.telephone
                                                    }
                                                </td>

                                                <td>
                                                    {
                                                        sms.message
                                                    }
                                                </td>

                                                <td>
                                                    {
                                                        sms.statut
                                                    }
                                                </td>

                                                <td>
                                                    {
                                                        sms.date_envoi
                                                    }
                                                </td>
                                            </tr>
                                        )
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </section>

            </main>
        </div>
    );
}

export default App;