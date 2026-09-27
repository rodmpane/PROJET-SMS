import express from "express";
import cors from "cors";
import { Pool } from "pg";
import dotenv from "dotenv";
import axios from "axios";
import jwt from "jsonwebtoken";

dotenv.config();

// ========================================
// VÉRIFICATION DES VARIABLES SECRÈTES
// ========================================

if (!process.env.JWT_SECRET) {
    console.error(
        "ERREUR : JWT_SECRET n'est pas configuré dans le fichier .env"
    );
    process.exit(1);
}

if (!process.env.ESMS_API_KEY) {
    console.error(
        "ERREUR : ESMS_API_KEY n'est pas configurée dans le fichier .env"
    );
    process.exit(1);
}

if (!process.env.ESMS_SENDER_ID) {
    console.error(
        "ERREUR : ESMS_SENDER_ID n'est pas configuré dans le fichier .env"
    );
    process.exit(1);
}

const app = express();

app.use(cors());
app.use(express.json());

// ========================================
// CONNEXION POSTGRESQL
// ========================================

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

pool.connect()
    .then((client) => {
        console.log("Connexion à PostgreSQL réussie !");
        client.release();
    })
    .catch((error) => {
        console.error(
            "Erreur de connexion PostgreSQL :",
            error
        );
    });

// ========================================
// ROUTE PRINCIPALE
// ========================================

app.get("/", (req, res) => {
    res.json({
        message: "Serveur SMS Clients opérationnel"
    });
});

// ========================================
// CONNEXION ADMINISTRATEUR
// ========================================

app.post("/login", async (req, res) => {
    try {
        const {
            email,
            mot_de_passe
        } = req.body;

        if (!email || !mot_de_passe) {
            return res.status(400).json({
                message:
                    "Email et mot de passe obligatoires."
            });
        }

        const result = await pool.query(
            `SELECT *
             FROM users
             WHERE email = $1`,
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                message:
                    "Email ou mot de passe incorrect."
            });
        }

        const utilisateur = result.rows[0];

        const bcrypt = await import("bcrypt");

        const motDePasseCorrect =
            await bcrypt.default.compare(
                mot_de_passe,
                utilisateur.mot_de_passe
            );

        if (!motDePasseCorrect) {
            return res.status(401).json({
                message:
                    "Email ou mot de passe incorrect."
            });
        }

        const token = jwt.sign(
            {
                id: utilisateur.id,
                email: utilisateur.email,
                nom: utilisateur.nom
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "8h"
            }
        );

        res.json({
            message: "Connexion réussie.",
            token,
            utilisateur: {
                id: utilisateur.id,
                nom: utilisateur.nom,
                email: utilisateur.email
            }
        });

    } catch (error) {
        console.error(
            "Erreur connexion :",
            error
        );

        res.status(500).json({
            message:
                "Erreur lors de la connexion."
        });
    }
});

// ========================================
// MIDDLEWARE DE VÉRIFICATION JWT
// ========================================

const verifierToken = (req, res, next) => {

    const authorization =
        req.headers.authorization;

    if (!authorization) {
        return res.status(401).json({
            message:
                "Accès non autorisé. Token manquant."
        });
    }

    const parties =
        authorization.split(" ");

    if (
        parties.length !== 2 ||
        parties[0] !== "Bearer"
    ) {
        return res.status(401).json({
            message:
                "Format du token invalide."
        });
    }

    const token = parties[1];

    try {

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.utilisateur = decoded;

        next();

    } catch (error) {

        return res.status(401).json({
            message:
                "Session expirée ou token invalide."
        });
    }
};

// ========================================
// CLIENTS
// ========================================

// GET CLIENTS

app.get(
    "/clients",
    verifierToken,
    async (req, res) => {

        try {

            const result = await pool.query(
                `SELECT
                    c.*,
                    g.nom AS groupe_nom
                 FROM clients c
                 LEFT JOIN groupes g
                    ON c.groupe_id = g.id
                 ORDER BY c.id DESC`
            );

            res.json(result.rows);

        } catch (error) {

            console.error(
                "Erreur récupération clients :",
                error
            );

            res.status(500).json({
                message:
                    "Erreur récupération clients."
            });
        }
    }
);

// AJOUT CLIENT

app.post(
    "/clients",
    verifierToken,
    async (req, res) => {

        try {

            const {
                nom,
                prenom,
                telephone,
                email,
                groupe_id
            } = req.body;

            if (!nom || !telephone) {
                return res.status(400).json({
                    message:
                        "Nom et téléphone obligatoires."
                });
            }

            const result = await pool.query(
                `INSERT INTO clients
                (
                    nom,
                    prenom,
                    telephone,
                    email,
                    groupe_id
                )
                VALUES
                ($1, $2, $3, $4, $5)
                RETURNING *`,
                [
                    nom,
                    prenom || null,
                    telephone,
                    email || null,
                    groupe_id || null
                ]
            );

            res.status(201).json(
                result.rows[0]
            );

        } catch (error) {

            console.error(
                "Erreur ajout client :",
                error
            );

            res.status(500).json({
                message:
                    "Erreur lors de l'ajout du client."
            });
        }
    }
);

// SUPPRESSION CLIENT

app.delete(
    "/clients/:id",
    verifierToken,
    async (req, res) => {

        try {

            const { id } = req.params;

            await pool.query(
                `DELETE FROM clients
                 WHERE id = $1`,
                [id]
            );

            res.json({
                message:
                    "Client supprimé."
            });

        } catch (error) {

            console.error(
                "Erreur suppression client :",
                error
            );

            res.status(500).json({
                message:
                    "Erreur lors de la suppression."
            });
        }
    }
);

// ========================================
// GROUPES
// ========================================

// GET GROUPES

app.get(
    "/groupes",
    verifierToken,
    async (req, res) => {

        try {

            const result = await pool.query(
                `SELECT *
                 FROM groupes
                 ORDER BY nom ASC`
            );

            res.json(result.rows);

        } catch (error) {

            console.error(
                "Erreur récupération groupes :",
                error
            );

            res.status(500).json({
                message:
                    "Erreur récupération groupes."
            });
        }
    }
);

// AJOUT GROUPE

app.post(
    "/groupes",
    verifierToken,
    async (req, res) => {

        try {

            const {
                nom,
                description
            } = req.body;

            if (!nom) {
                return res.status(400).json({
                    message:
                        "Nom du groupe obligatoire."
                });
            }

            const result = await pool.query(
                `INSERT INTO groupes
                (
                    nom,
                    description
                )
                VALUES
                ($1, $2)
                RETURNING *`,
                [
                    nom,
                    description || null
                ]
            );

            res.status(201).json(
                result.rows[0]
            );

        } catch (error) {

            console.error(
                "Erreur ajout groupe :",
                error
            );

            res.status(500).json({
                message:
                    "Erreur lors de l'ajout du groupe."
            });
        }
    }
);

// ========================================
// ENVOI SMS INDIVIDUEL
// ========================================

app.post(
    "/sms/send",
    verifierToken,
    async (req, res) => {

        try {

            const {
                telephone,
                message,
                client_id,
                groupe_id
            } = req.body;

            if (!telephone || !message) {
                return res.status(400).json({
                    message:
                        "Téléphone et message obligatoires."
                });
            }

            const response = await axios.post(
                "https://sms.esmsafrica.io/api/messages/send",
                {
                    to: telephone,
                    text: message,
                    sender_id:
                        process.env.ESMS_SENDER_ID
                },
                {
                    headers: {
                        Authorization:
                            `Bearer ${process.env.ESMS_API_KEY}`,
                        "Content-Type":
                            "application/json"
                    }
                }
            );

            await pool.query(
                `INSERT INTO historique_sms
                (
                    client_id,
                    telephone,
                    message,
                    groupe_id,
                    statut,
                    nombre_sms
                )
                VALUES
                ($1, $2, $3, $4, $5, $6)`,
                [
                    client_id || null,
                    telephone,
                    message,
                    groupe_id || null,
                    "envoyé",
                    1
                ]
            );

            res.json({
                message:
                    "SMS envoyé avec succès.",
                resultat:
                    response.data
            });

        } catch (error) {

            console.error(
                "Erreur envoi SMS :",
                error.response?.data ||
                error.message
            );

            res.status(500).json({
                message:
                    "Erreur lors de l'envoi du SMS."
            });
        }
    }
);

// ========================================
// ENVOI SMS PAR GROUPE
// ========================================

app.post(
    "/sms/send-group",
    verifierToken,
    async (req, res) => {

        try {

            const {
                groupe_id,
                message
            } = req.body;

            if (!groupe_id || !message) {
                return res.status(400).json({
                    message:
                        "Groupe et message obligatoires."
                });
            }

            const clients =
                await pool.query(
                    `SELECT *
                     FROM clients
                     WHERE groupe_id = $1`,
                    [groupe_id]
                );

            if (clients.rows.length === 0) {
                return res.status(404).json({
                    message:
                        "Aucun client dans ce groupe."
                });
            }

            let envoyes = 0;
            let echecs = 0;

            for (
                const client
                of clients.rows
            ) {

                try {

                    await axios.post(
                        "https://sms.esmsafrica.io/api/messages/send",
                        {
                            to: client.telephone,
                            text: message,
                            sender_id:
                                process.env.ESMS_SENDER_ID
                        },
                        {
                            headers: {
                                Authorization:
                                    `Bearer ${process.env.ESMS_API_KEY}`,
                                "Content-Type":
                                    "application/json"
                            }
                        }
                    );

                    await pool.query(
                        `INSERT INTO historique_sms
                        (
                            client_id,
                            telephone,
                            message,
                            groupe_id,
                            statut,
                            nombre_sms
                        )
                        VALUES
                        ($1, $2, $3, $4, $5, $6)`,
                        [
                            client.id,
                            client.telephone,
                            message,
                            groupe_id,
                            "envoyé",
                            1
                        ]
                    );

                    envoyes++;

                } catch (error) {

                    echecs++;

                    await pool.query(
                        `INSERT INTO historique_sms
                        (
                            client_id,
                            telephone,
                            message,
                            groupe_id,
                            statut,
                            nombre_sms
                        )
                        VALUES
                        ($1, $2, $3, $4, $5, $6)`,
                        [
                            client.id,
                            client.telephone,
                            message,
                            groupe_id,
                            "échec",
                            1
                        ]
                    );
                }
            }

            res.json({
                message:
                    "Envoi groupé terminé.",
                total:
                    clients.rows.length,
                envoyes,
                echecs
            });

        } catch (error) {

            console.error(
                "Erreur envoi groupe :",
                error
            );

            res.status(500).json({
                message:
                    "Erreur lors de l'envoi groupé."
            });
        }
    }
);

// ========================================
// HISTORIQUE SMS
// ========================================

app.get(
    "/historique",
    verifierToken,
    async (req, res) => {

        try {

            const result = await pool.query(
                `SELECT
                    h.*,
                    c.nom,
                    c.prenom,
                    g.nom AS groupe_nom
                 FROM historique_sms h
                 LEFT JOIN clients c
                    ON h.client_id = c.id
                 LEFT JOIN groupes g
                    ON h.groupe_id = g.id
                 ORDER BY
                    h.date_envoi DESC`
            );

            res.json(result.rows);

        } catch (error) {

            console.error(
                "Erreur historique :",
                error
            );

            res.status(500).json({
                message:
                    "Erreur récupération historique."
            });
        }
    }
);

// ========================================
// MODÈLES SMS
// ========================================

// GET MODÈLES

app.get(
    "/modeles-sms",
    verifierToken,
    async (req, res) => {

        try {

            const result = await pool.query(
                `SELECT *
                 FROM modeles_sms
                 ORDER BY date_creation DESC`
            );

            res.json(result.rows);

        } catch (error) {

            console.error(
                "Erreur récupération modèles :",
                error
            );

            res.status(500).json({
                message:
                    "Erreur récupération modèles."
            });
        }
    }
);

// AJOUT MODÈLE

app.post(
    "/modeles-sms",
    verifierToken,
    async (req, res) => {

        try {

            const {
                nom,
                message
            } = req.body;

            if (!nom || !message) {
                return res.status(400).json({
                    message:
                        "Nom et message obligatoires."
                });
            }

            const result = await pool.query(
                `INSERT INTO modeles_sms
                (
                    nom,
                    message
                )
                VALUES
                ($1, $2)
                RETURNING *`,
                [
                    nom,
                    message
                ]
            );

            res.status(201).json(
                result.rows[0]
            );

        } catch (error) {

            console.error(
                "Erreur ajout modèle :",
                error
            );

            res.status(500).json({
                message:
                    "Erreur lors de l'ajout du modèle."
            });
        }
    }
);

// ========================================
// DÉMARRAGE SERVEUR
// ========================================

app.listen(
    5000,
    () => {
        console.log(
            "Serveur démarré sur http://localhost:5000"
        );
    }
);