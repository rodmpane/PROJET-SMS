import { useEffect, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:5000";

function App() {
    // ========================================
    // AUTHENTIFICATION
    // ========================================

    const [token, setToken] = useState(
        localStorage.getItem("sms_token")
    );

    const [utilisateur, setUtilisateur] = useState(() => {
        const data =
            localStorage.getItem("sms_utilisateur");

        return data ? JSON.parse(data) : null;
    });

    // ========================================
    // ÉTATS
    // ========================================

    const [clients, setClients] = useState([]);
    const [groupes, setGroupes] = useState([]);
    const [historique, setHistorique] = useState([]);
    const [modeles, setModeles] = useState([]);

    const [chargement, setChargement] = useState(false);

    const [messageErreur, setMessageErreur] =
        useState("");

    // ========================================
    // CONNEXION
    // ========================================

    const [emailConnexion, setEmailConnexion] =
        useState("");

    const [motDePasseConnexion, setMotDePasseConnexion] =
        useState("");

    const [chargementConnexion, setChargementConnexion] =
        useState(false);

    const [erreurConnexion, setErreurConnexion] =
        useState("");

    // ========================================
    // CLIENT
    // ========================================

    const [nom, setNom] = useState("");
    const [prenom, setPrenom] = useState("");
    const [telephone, setTelephone] = useState("");
    const [email, setEmail] = useState("");
    const [groupeId, setGroupeId] = useState("");

    // ========================================
    // SMS INDIVIDUEL
    // ========================================

    const [clientSms, setClientSms] = useState("");
    const [messageSms, setMessageSms] = useState("");

    // ========================================
    // SMS GROUPE
    // ========================================

    const [groupeSms, setGroupeSms] = useState("");
    const [messageGroupe, setMessageGroupe] =
        useState("");

    // ========================================
    // MODÈLE SMS
    // ========================================

    const [nomModele, setNomModele] = useState("");
    const [messageModele, setMessageModele] =
        useState("");

    // ========================================
    // FONCTION HEADERS JWT
    // ========================================

    const getHeaders = (avecJson = false) => {
        const headers = {
            Authorization: `Bearer ${token}`
        };

        if (avecJson) {
            headers["Content-Type"] =
                "application/json";
        }

        return headers;
    };

    // ========================================
    // GESTION SESSION EXPIRÉE
    // ========================================

    const gererErreurAuthentification = (
        response
    ) => {
        if (response.status === 401) {

            localStorage.removeItem(
                "sms_token"
            );

            localStorage.removeItem(
                "sms_utilisateur"
            );

            setToken(null);
            setUtilisateur(null);

            setClients([]);
            setGroupes([]);
            setHistorique([]);
            setModeles([]);

            setMessageErreur(
                "Votre session a expiré. Veuillez vous reconnecter."
            );

            return true;
        }

        return false;
    };

    // ========================================
    // CONNEXION
    // ========================================

    const seConnecter = async (e) => {
        e.preventDefault();

        setErreurConnexion("");
        setChargementConnexion(true);

        try {
            const response = await fetch(
                `${API_URL}/login`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify({
                        email: emailConnexion,
                        mot_de_passe:
                            motDePasseConnexion
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                        "Erreur de connexion."
                );
            }

            localStorage.setItem(
                "sms_token",
                data.token
            );

            localStorage.setItem(
                "sms_utilisateur",
                JSON.stringify(
                    data.utilisateur
                )
            );

            setToken(data.token);

            setUtilisateur(
                data.utilisateur
            );

            setEmailConnexion("");
            setMotDePasseConnexion("");

        } catch (error) {
            setErreurConnexion(
                error.message
            );
        } finally {
            setChargementConnexion(false);
        }
    };

    // ========================================
    // DÉCONNEXION
    // ========================================

    const seDeconnecter = () => {

        localStorage.removeItem(
            "sms_token"
        );

        localStorage.removeItem(
            "sms_utilisateur"
        );

        setToken(null);
        setUtilisateur(null);

        setClients([]);
        setGroupes([]);
        setHistorique([]);
        setModeles([]);
    };

    // ========================================
    // CHARGER CLIENTS
    // ========================================

    const chargerClients = async () => {
        try {

            const response = await fetch(
                `${API_URL}/clients`,
                {
                    headers: getHeaders()
                }
            );

            if (
                gererErreurAuthentification(
                    response
                )
            ) {
                return;
            }

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                        "Erreur clients."
                );
            }

            setClients(data);

        } catch (error) {

            console.error(
                "Erreur clients :",
                error
            );

            setMessageErreur(
                error.message
            );
        }
    };

    // ========================================
    // CHARGER GROUPES
    // ========================================

    const chargerGroupes = async () => {
        try {

            const response = await fetch(
                `${API_URL}/groupes`,
                {
                    headers: getHeaders()
                }
            );

            if (
                gererErreurAuthentification(
                    response
                )
            ) {
                return;
            }

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                        "Erreur groupes."
                );
            }

            setGroupes(data);

        } catch (error) {

            console.error(
                "Erreur groupes :",
                error
            );

            setMessageErreur(
                error.message
            );
        }
    };

    // ========================================
    // CHARGER MODÈLES
    // ========================================

    const chargerModeles = async () => {
        try {

            const response = await fetch(
                `${API_URL}/modeles-sms`,
                {
                    headers: getHeaders()
                }
            );

            if (
                gererErreurAuthentification(
                    response
                )
            ) {
                return;
            }

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                        "Erreur modèles."
                );
            }

            setModeles(data);

        } catch (error) {

            console.error(
                "Erreur modèles :",
                error
            );

            setMessageErreur(
                error.message
            );
        }
    };

    // ========================================
    // CHARGER HISTORIQUE
    // ========================================

    const chargerHistorique = async () => {
        try {

            const response = await fetch(
                `${API_URL}/historique`,
                {
                    headers: getHeaders()
                }
            );

            if (
                gererErreurAuthentification(
                    response
                )
            ) {
                return;
            }

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                        "Erreur historique."
                );
            }

            setHistorique(data);

        } catch (error) {

            console.error(
                "Erreur historique :",
                error
            );

            setMessageErreur(
                error.message
            );
        }
    };

    // ========================================
    // CHARGEMENT INITIAL
    // ========================================

    useEffect(() => {

        if (!token) {
            setChargement(false);
            return;
        }

        const chargerDonnees = async () => {

            setChargement(true);

            await Promise.all([
                chargerClients(),
                chargerGroupes(),
                chargerModeles(),
                chargerHistorique()
            ]);

            setChargement(false);
        };

        chargerDonnees();

    }, [token]);

    // ========================================
    // AJOUT CLIENT
    // ========================================

    const ajouterClient = async (e) => {

        e.preventDefault();

        try {

            const response = await fetch(
                `${API_URL}/clients`,
                {
                    method: "POST",
                    headers: getHeaders(true),

                    body: JSON.stringify({
                        nom,
                        prenom,
                        telephone,
                        email,
                        groupe_id:
                            groupeId
                                ? Number(groupeId)
                                : null
                    })
                }
            );

            if (
                gererErreurAuthentification(
                    response
                )
            ) {
                return;
            }

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                        "Erreur ajout client."
                );
            }

            setNom("");
            setPrenom("");
            setTelephone("");
            setEmail("");
            setGroupeId("");

            await chargerClients();

        } catch (error) {

            setMessageErreur(
                error.message
            );
        }
    };

    // ========================================
    // SUPPRIMER CLIENT
    // ========================================

    const supprimerClient = async (id) => {

        const confirmation =
            window.confirm(
                "Voulez-vous vraiment supprimer ce client ?"
            );

        if (!confirmation) {
            return;
        }

        try {

            const response = await fetch(
                `${API_URL}/clients/${id}`,
                {
                    method: "DELETE",
                    headers: getHeaders()
                }
            );

            if (
                gererErreurAuthentification(
                    response
                )
            ) {
                return;
            }

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                        "Erreur suppression."
                );
            }

            await chargerClients();

        } catch (error) {

            setMessageErreur(
                error.message
            );
        }
    };

    // ========================================
    // ENVOYER SMS INDIVIDUEL
    // ========================================

    const envoyerSms = async (e) => {

        e.preventDefault();

        if (!clientSms || !messageSms) {

            setMessageErreur(
                "Sélectionnez un client et saisissez un message."
            );

            return;
        }

        try {

            const client =
                clients.find(
                    (c) =>
                        String(c.id) ===
                        String(clientSms)
                );

            if (!client) {
                throw new Error(
                    "Client introuvable."
                );
            }

            const response = await fetch(
                `${API_URL}/sms/send`,
                {
                    method: "POST",
                    headers: getHeaders(true),

                    body: JSON.stringify({
                        telephone:
                            client.telephone,

                        message:
                            messageSms,

                        client_id:
                            client.id,

                        groupe_id:
                            client.groupe_id
                    })
                }
            );

            if (
                gererErreurAuthentification(
                    response
                )
            ) {
                return;
            }

            const data =
                await response.json();

            if (!response.ok) {

                throw new Error(
                    data.message ||
                        "Erreur envoi SMS."
                );
            }

            alert(
                "SMS envoyé avec succès."
            );

            setClientSms("");
            setMessageSms("");

            await chargerHistorique();

        } catch (error) {

            setMessageErreur(
                error.message
            );
        }
    };

    // ========================================
    // ENVOYER SMS GROUPE
    // ========================================

    const envoyerSmsGroupe = async (e) => {

        e.preventDefault();

        if (!groupeSms || !messageGroupe) {

            setMessageErreur(
                "Sélectionnez un groupe et saisissez un message."
            );

            return;
        }

        try {

            const response = await fetch(
                `${API_URL}/sms/send-group`,
                {
                    method: "POST",
                    headers: getHeaders(true),

                    body: JSON.stringify({
                        groupe_id:
                            Number(groupeSms),

                        message:
                            messageGroupe
                    })
                }
            );

            if (
                gererErreurAuthentification(
                    response
                )
            ) {
                return;
            }

            const data =
                await response.json();

            if (!response.ok) {

                throw new Error(
                    data.message ||
                        "Erreur envoi groupé."
                );
            }

            alert(
                `Envoi terminé.

Total : ${data.total}
Envoyés : ${data.envoyes}
Échecs : ${data.echecs}`
            );

            setGroupeSms("");
            setMessageGroupe("");

            await chargerHistorique();

        } catch (error) {

            setMessageErreur(
                error.message
            );
        }
    };

    // ========================================
    // AJOUT MODÈLE
    // ========================================

    const ajouterModele = async (e) => {

        e.preventDefault();

        if (!nomModele || !messageModele) {

            setMessageErreur(
                "Nom et message obligatoires."
            );

            return;
        }

        try {

            const response = await fetch(
                `${API_URL}/modeles-sms`,
                {
                    method: "POST",
                    headers: getHeaders(true),

                    body: JSON.stringify({
                        nom: nomModele,
                        message:
                            messageModele
                    })
                }
            );

            if (
                gererErreurAuthentification(
                    response
                )
            ) {
                return;
            }

            const data =
                await response.json();

            if (!response.ok) {

                throw new Error(
                    data.message ||
                        "Erreur ajout modèle."
                );
            }

            setNomModele("");
            setMessageModele("");

            await chargerModeles();

        } catch (error) {

            setMessageErreur(
                error.message
            );
        }
    };

    // ========================================
    // UTILISER UN MODÈLE
    // ========================================

    const utiliserModele = (message) => {

        setMessageSms(message);
        setMessageGroupe(message);
    };

    // ========================================
    // PAGE CONNEXION
    // ========================================

    if (!token) {

        return (
            <div className="app-container">

                <div className="login-container">

                    <div className="login-card">

                        <div className="login-icon">
                            📱
                        </div>

                        <h1>
                            SMS Clients
                        </h1>

                        <h2>
                            Connexion administrateur
                        </h2>

                        {erreurConnexion && (
                            <div className="message-erreur">
                                {erreurConnexion}
                            </div>
                        )}

                        <form
                            onSubmit={
                                seConnecter
                            }
                        >

                            <div>

                                <label>
                                    Email
                                </label>

                                <input
                                    type="email"
                                    value={
                                        emailConnexion
                                    }
                                    onChange={(e) =>
                                        setEmailConnexion(
                                            e.target.value
                                        )
                                    }
                                    placeholder="Votre adresse email"
                                    required
                                />

                            </div>

                            <div>

                                <label>
                                    Mot de passe
                                </label>

                                <input
                                    type="password"
                                    value={
                                        motDePasseConnexion
                                    }
                                    onChange={(e) =>
                                        setMotDePasseConnexion(
                                            e.target.value
                                        )
                                    }
                                    placeholder="Votre mot de passe"
                                    required
                                />

                            </div>

                            <button
                                type="submit"
                                disabled={
                                    chargementConnexion
                                }
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

    // ========================================
    // CHARGEMENT
    // ========================================

    if (chargement) {

        return (
            <div className="app-container">

                <h2>
                    Chargement...
                </h2>

            </div>
        );
    }

    // ========================================
    // APPLICATION
    // ========================================

    return (
        <div className="app-container">

            {/* ================================= */}
            {/* EN-TÊTE */}
            {/* ================================= */}

            <header className="app-header">

                <div>

                    <h1>
                        📱 SMS Clients
                    </h1>

                    <p>
                        Gestion et envoi de SMS
                    </p>

                </div>

                <div className="admin-zone">

                    <span>
                        👤{" "}
                        {utilisateur?.nom}
                    </span>

                    <button
                        type="button"
                        onClick={
                            seDeconnecter
                        }
                    >
                        Déconnexion
                    </button>

                </div>

            </header>

            {/* ================================= */}
            {/* MESSAGE ERREUR */}
            {/* ================================= */}

            {messageErreur && (

                <div className="message-erreur">

                    {messageErreur}

                    <button
                        type="button"
                        onClick={() =>
                            setMessageErreur("")
                        }
                    >
                        ×
                    </button>

                </div>
            )}

            {/* ================================= */}
            {/* CLIENTS */}
            {/* ================================= */}

            <section>

                <h2>
                    👥 Gestion des clients
                </h2>

                <form
                    onSubmit={
                        ajouterClient
                    }
                >

                    <input
                        type="text"
                        placeholder="Nom"
                        value={nom}
                        onChange={(e) =>
                            setNom(
                                e.target.value
                            )
                        }
                        required
                    />

                    <input
                        type="text"
                        placeholder="Prénom"
                        value={prenom}
                        onChange={(e) =>
                            setPrenom(
                                e.target.value
                            )
                        }
                    />

                    <input
                        type="text"
                        placeholder="Téléphone"
                        value={telephone}
                        onChange={(e) =>
                            setTelephone(
                                e.target.value
                            )
                        }
                        required
                    />

                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) =>
                            setEmail(
                                e.target.value
                            )
                        }
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
                                    key={
                                        groupe.id
                                    }
                                    value={
                                        groupe.id
                                    }
                                >
                                    {
                                        groupe.nom
                                    }
                                </option>

                            )
                        )}

                    </select>

                    <button type="submit">
                        Ajouter le client
                    </button>

                </form>

                <div className="table-container">

                    <table>

                        <thead>

                            <tr>

                                <th>
                                    Nom
                                </th>

                                <th>
                                    Prénom
                                </th>

                                <th>
                                    Téléphone
                                </th>

                                <th>
                                    Email
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
                                            {
                                                client.nom
                                            }
                                        </td>

                                        <td>
                                            {
                                                client.prenom
                                            }
                                        </td>

                                        <td>
                                            {
                                                client.telephone
                                            }
                                        </td>

                                        <td>
                                            {
                                                client.email
                                            }
                                        </td>

                                        <td>
                                            {
                                                client.groupe_nom ||
                                                "Sans groupe"
                                            }
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

                                )
                            )}

                        </tbody>

                    </table>

                </div>

            </section>

            {/* ================================= */}
            {/* SMS INDIVIDUEL */}
            {/* ================================= */}

            <section>

                <h2>
                    📱 Envoyer un SMS
                </h2>

                <form
                    onSubmit={
                        envoyerSms
                    }
                >

                    <select
                        value={clientSms}
                        onChange={(e) =>
                            setClientSms(
                                e.target.value
                            )
                        }
                        required
                    >

                        <option value="">
                            Sélectionner un client
                        </option>

                        {clients.map(
                            (client) => (

                                <option
                                    key={
                                        client.id
                                    }
                                    value={
                                        client.id
                                    }
                                >
                                    {client.nom}{" "}
                                    {client.prenom}{" "}
                                    -{" "}
                                    {
                                        client.telephone
                                    }
                                </option>

                            )
                        )}

                    </select>

                    <textarea
                        placeholder="Votre message..."
                        value={messageSms}
                        onChange={(e) =>
                            setMessageSms(
                                e.target.value
                            )
                        }
                        rows="4"
                        required
                    />

                    <button type="submit">
                        Envoyer le SMS
                    </button>

                </form>

            </section>

            {/* ================================= */}
            {/* SMS GROUPE */}
            {/* ================================= */}

            <section>

                <h2>
                    📢 Envoyer un SMS à un groupe
                </h2>

                <form
                    onSubmit={
                        envoyerSmsGroupe
                    }
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
                                    key={
                                        groupe.id
                                    }
                                    value={
                                        groupe.id
                                    }
                                >
                                    {
                                        groupe.nom
                                    }
                                </option>

                            )
                        )}

                    </select>

                    <textarea
                        placeholder="Message à envoyer au groupe..."
                        value={
                            messageGroupe
                        }
                        onChange={(e) =>
                            setMessageGroupe(
                                e.target.value
                            )
                        }
                        rows="4"
                        required
                    />

                    <button type="submit">
                        Envoyer au groupe
                    </button>

                </form>

            </section>

            {/* ================================= */}
            {/* MODÈLES SMS */}
            {/* ================================= */}

            <section>

                <h2>
                    📝 Modèles SMS
                </h2>

                <form
                    onSubmit={
                        ajouterModele
                    }
                >

                    <input
                        type="text"
                        placeholder="Nom du modèle"
                        value={nomModele}
                        onChange={(e) =>
                            setNomModele(
                                e.target.value
                            )
                        }
                        required
                    />

                    <textarea
                        placeholder="Message du modèle..."
                        value={
                            messageModele
                        }
                        onChange={(e) =>
                            setMessageModele(
                                e.target.value
                            )
                        }
                        rows="4"
                        required
                    />

                    <button type="submit">
                        Ajouter le modèle
                    </button>

                </form>

                <div className="modeles-container">

                    {modeles.map(
                        (modele) => (

                            <div
                                key={
                                    modele.id
                                }
                                className="modele-card"
                            >

                                <h3>
                                    {
                                        modele.nom
                                    }
                                </h3>

                                <p>
                                    {
                                        modele.message
                                    }
                                </p>

                                <button
                                    type="button"
                                    onClick={() =>
                                        utiliserModele(
                                            modele.message
                                        )
                                    }
                                >
                                    Utiliser
                                </button>

                            </div>

                        )
                    )}

                </div>

            </section>

            {/* ================================= */}
            {/* HISTORIQUE */}
            {/* ================================= */}

            <section>

                <h2>
                    📜 Historique des SMS
                </h2>

                <button
                    type="button"
                    onClick={
                        chargerHistorique
                    }
                >
                    Actualiser
                </button>

                <div className="table-container">

                    <table>

                        <thead>

                            <tr>

                                <th>
                                    Date
                                </th>

                                <th>
                                    Téléphone
                                </th>

                                <th>
                                    Message
                                </th>

                                <th>
                                    Groupe
                                </th>

                                <th>
                                    Statut
                                </th>

                                <th>
                                    SMS
                                </th>

                            </tr>

                        </thead>

                        <tbody>

                            {historique.map(
                                (item) => (

                                    <tr
                                        key={
                                            item.id
                                        }
                                    >

                                        <td>
                                            {new Date(
                                                item.date_envoi
                                            ).toLocaleString()}
                                        </td>

                                        <td>
                                            {
                                                item.telephone
                                            }
                                        </td>

                                        <td>
                                            {
                                                item.message
                                            }
                                        </td>

                                        <td>
                                            {
                                                item.groupe_nom ||
                                                "-"
                                            }
                                        </td>

                                        <td>
                                            {
                                                item.statut
                                            }
                                        </td>

                                        <td>
                                            {
                                                item.nombre_sms
                                            }
                                        </td>

                                    </tr>

                                )
                            )}

                        </tbody>

                    </table>

                </div>

            </section>

        </div>
    );
}

export default App;