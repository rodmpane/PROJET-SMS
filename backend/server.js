import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { body, param, validationResult } from "express-validator";
import { Pool } from "pg";
import dotenv from "dotenv";
import axios from "axios";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

dotenv.config();

// ========================================
// VARIABLES D'ENVIRONNEMENT
// ========================================

const PORT = process.env.PORT || 5000;

const JWT_SECRET = process.env.JWT_SECRET;
const ESMS_API_KEY = process.env.ESMS_API_KEY;
const ESMS_SENDER_ID = process.env.ESMS_SENDER_ID;

if (!JWT_SECRET) {
    console.error("ERREUR : JWT_SECRET n'est pas configuré.");
    process.exit(1);
}

if (!ESMS_API_KEY) {
    console.error("ERREUR : ESMS_API_KEY n'est pas configuré.");
    process.exit(1);
}

if (!ESMS_SENDER_ID) {
    console.error("ERREUR : ESMS_SENDER_ID n'est pas configuré.");
    process.exit(1);
}

// ========================================
// APPLICATION
// ========================================

const app = express();

// ========================================
// SÉCURITÉ
// ========================================

app.disable("x-powered-by");

app.use(
    helmet({
        crossOriginResourcePolicy: false
    })
);

// ========================================
// CORS
// ========================================

const originesAutorisees = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://projet-sms-ndqx.onrender.com"
];

if (process.env.FRONTEND_URL) {
    originesAutorisees.push(
        process.env.FRONTEND_URL.replace(/\/$/, "")
    );
}

app.use(
    cors({
        origin: (origin, callback) => {

            if (!origin) {
                return callback(null, true);
            }

            if (originesAutorisees.includes(origin)) {
                return callback(null, true);
            }

            console.error(
                "Origine CORS refusée :",
                origin
            );

            return callback(
                new Error("Origine non autorisée.")
            );
        },

        methods: [
            "GET",
            "POST",
            "DELETE",
            "OPTIONS"
        ],

        allowedHeaders: [
            "Content-Type",
            "Authorization"
        ],

        credentials: true
    })
);

// ========================================
// JSON
// ========================================

app.use(
    express.json({
        limit: "100kb"
    })
);

// ========================================
// RATE LIMIT GLOBAL
// ========================================

const limiteGenerale = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: "Trop de requêtes. Veuillez réessayer plus tard."
    }
});

app.use(limiteGenerale);

// ========================================
// RATE LIMIT CONNEXION
// ========================================

const limiteLogin = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: "Trop de tentatives de connexion."
    }
});

// ========================================
// RATE LIMIT SMS
// ========================================

const limiteSMS = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: "Trop d'envois SMS. Veuillez patienter."
    }
});

// ========================================
// BASE DE DONNÉES
// ========================================

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl:
        process.env.NODE_ENV === "production"
            ? { rejectUnauthorized: false }
            : false
});

pool.on("error", (error) => {
    console.error(
        "Erreur inattendue PostgreSQL :",
        error.message
    );
});

// ========================================
// TEST BASE DE DONNÉES
// ========================================

pool.query("SELECT NOW()")
    .then(() => {
        console.log("Connexion PostgreSQL réussie.");
    })
    .catch((error) => {
        console.error(
            "Erreur PostgreSQL :",
            error.message
        );
    });

// ========================================
// FONCTION VALIDATION
// ========================================

function verifierValidation(req, res, next) {

    const erreurs = validationResult(req);

    if (!erreurs.isEmpty()) {
        return res.status(400).json({
            message: "Données invalides.",
            erreurs: erreurs.array()
        });
    }

    next();
}

// ========================================
// FONCTION AUTHENTIFICATION JWT
// ========================================

function authentifier(req, res, next) {

    const authorization =
        req.headers.authorization;

    if (
        !authorization ||
        !authorization.startsWith("Bearer ")
    ) {
        return res.status(401).json({
            message: "Authentification requise."
        });
    }

    const token =
        authorization.substring(7);

    try {

        const utilisateur =
            jwt.verify(token, JWT_SECRET);

        req.utilisateur = utilisateur;

        next();

    } catch (error) {

        return res.status(401).json({
            message: "Session expirée ou token invalide."
        });
    }
}

// ========================================
// ROUTE PRINCIPALE
// ========================================

app.get("/", (req, res) => {

    res.json({
        message: "Serveur SMS Clients opérationnel"
    });
});

// ========================================
// HEALTH CHECK
// ========================================

app.get("/health", async (req, res) => {

    try {

        await pool.query("SELECT 1");

        res.json({
            status: "ok",
            service: "SMS Clients API"
        });

    } catch (error) {

        console.error(
            "Health check PostgreSQL :",
            error.message
        );

        res.status(503).json({
            status: "error",
            service: "SMS Clients API"
        });
    }
});

// ========================================
// CONNEXION ADMINISTRATEUR
// ========================================

app.post(
    "/login",
    limiteLogin,

    [
        body("email")
            .trim()
            .isEmail()
            .withMessage("Adresse email invalide.")
            .normalizeEmail(),

        body("password")
            .isString()
            .isLength({ min: 1 })
            .withMessage("Mot de passe requis.")
    ],

    verifierValidation,

    async (req, res) => {

        try {

            const {
                email,
                password
            } = req.body;

            const resultat = await pool.query(
                `
                SELECT id, nom, email, password
                FROM users
                WHERE email = $1
                LIMIT 1
                `,
                [email]
            );

            if (resultat.rows.length === 0) {

                return res.status(401).json({
                    message:
                        "Email ou mot de passe incorrect."
                });
            }

            const utilisateur =
                resultat.rows[0];

            const motDePasseCorrect =
                await bcrypt.compare(
                    password,
                    utilisateur.password
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
                JWT_SECRET,
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
                "Erreur login :",
                error.message
            );

            res.status(500).json({
                message:
                    "Erreur interne du serveur."
            });
        }
    }
);

// ========================================
// DASHBOARD
// ========================================

app.get(
    "/dashboard",
    authentifier,
    async (req, res) => {

        try {

            const clients =
                await pool.query(
                    "SELECT COUNT(*) AS total FROM clients"
                );

            const groupes =
                await pool.query(
                    "SELECT COUNT(*) AS total FROM groupes"
                );

            const historique =
                await pool.query(
                    "SELECT COUNT(*) AS total FROM historique_sms"
                );

            const modeles =
                await pool.query(
                    "SELECT COUNT(*) AS total FROM modeles_sms"
                );

            res.json({
                clients: Number(
                    clients.rows[0].total
                ),

                groupes: Number(
                    groupes.rows[0].total
                ),

                historique: Number(
                    historique.rows[0].total
                ),

                modeles: Number(
                    modeles.rows[0].total
                )
            });

        } catch (error) {

            console.error(
                "Erreur dashboard :",
                error.message
            );

            res.status(500).json({
                message:
                    "Impossible de charger le tableau de bord."
            });
        }
    }
);

// ========================================
// CLIENTS - LISTE
// ========================================

app.get(
    "/clients",
    authentifier,
    async (req, res) => {

        try {

            const resultat =
                await pool.query(
                    `
                    SELECT
                        c.id,
                        c.nom,
                        c.prenom,
                        c.telephone,
                        c.email,
                        c.groupe_id,
                        g.nom AS groupe_nom
                    FROM clients c
                    LEFT JOIN groupes g
                        ON c.groupe_id = g.id
                    ORDER BY c.id DESC
                    `
                );

            res.json(resultat.rows);

        } catch (error) {

            console.error(
                "Erreur clients :",
                error.message
            );

            res.status(500).json({
                message:
                    "Impossible de récupérer les clients."
            });
        }
    }
);

// ========================================
// CLIENT - AJOUT
// ========================================

app.post(
    "/clients",
    authentifier,

    [
        body("nom")
            .trim()
            .isLength({ min: 1, max: 100 })
            .withMessage("Nom requis."),

        body("prenom")
            .optional({ nullable: true })
            .trim()
            .isLength({ max: 100 }),

        body("telephone")
            .trim()
            .isLength({ min: 6, max: 30 })
            .withMessage("Téléphone invalide."),

        body("email")
            .optional({ nullable: true })
            .trim()
            .isEmail()
            .withMessage("Email invalide."),

        body("groupeId")
            .optional({ nullable: true })
            .isInt()
            .withMessage("Groupe invalide.")
    ],

    verifierValidation,

    async (req, res) => {

        try {

            const {
                nom,
                prenom,
                telephone,
                email,
                groupeId
            } = req.body;

            const resultat =
                await pool.query(
                    `
                    INSERT INTO clients
                    (
                        nom,
                        prenom,
                        telephone,
                        email,
                        groupe_id
                    )
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING *
                    `,
                    [
                        nom,
                        prenom || null,
                        telephone,
                        email || null,
                        groupeId || null
                    ]
                );

            res.status(201).json(
                resultat.rows[0]
            );

        } catch (error) {

            console.error(
                "Erreur ajout client :",
                error.message
            );

            res.status(500).json({
                message:
                    "Impossible d'ajouter le client."
            });
        }
    }
);

// ========================================
// CLIENT - SUPPRESSION
// ========================================

app.delete(
    "/clients/:id",
    authentifier,

    [
        param("id")
            .isInt()
            .withMessage("ID client invalide.")
    ],

    verifierValidation,

    async (req, res) => {

        try {

            const resultat =
                await pool.query(
                    `
                    DELETE FROM clients
                    WHERE id = $1
                    RETURNING id
                    `,
                    [req.params.id]
                );

            if (resultat.rows.length === 0) {

                return res.status(404).json({
                    message:
                        "Client introuvable."
                });
            }

            res.json({
                message:
                    "Client supprimé avec succès."
            });

        } catch (error) {

            console.error(
                "Erreur suppression client :",
                error.message
            );

            res.status(500).json({
                message:
                    "Impossible de supprimer le client."
            });
        }
    }
);

// ========================================
// GROUPES - LISTE
// ========================================

app.get(
    "/groupes",
    authentifier,
    async (req, res) => {

        try {

            const resultat =
                await pool.query(
                    `
                    SELECT
                        id,
                        nom,
                        description
                    FROM groupes
                    ORDER BY nom ASC
                    `
                );

            res.json(resultat.rows);

        } catch (error) {

            console.error(
                "Erreur groupes :",
                error.message
            );

            res.status(500).json({
                message:
                    "Impossible de récupérer les groupes."
            });
        }
    }
);

// ========================================
// GROUPES - AJOUT
// ========================================

app.post(
    "/groupes",
    authentifier,

    [
        body("nom")
            .trim()
            .isLength({ min: 1, max: 150 })
            .withMessage("Nom du groupe requis."),

        body("description")
            .optional({ nullable: true })
            .trim()
            .isLength({ max: 500 })
    ],

    verifierValidation,

    async (req, res) => {

        try {

            const {
                nom,
                description
            } = req.body;

            const resultat =
                await pool.query(
                    `
                    INSERT INTO groupes
                    (
                        nom,
                        description
                    )
                    VALUES ($1, $2)
                    RETURNING *
                    `,
                    [
                        nom,
                        description || null
                    ]
                );

            res.status(201).json(
                resultat.rows[0]
            );

        } catch (error) {

            console.error(
                "Erreur ajout groupe :",
                error.message
            );

            res.status(500).json({
                message:
                    "Impossible d'ajouter le groupe."
            });
        }
    }
);

// ========================================
// MODÈLES SMS - LISTE
// ========================================

app.get(
    "/modeles-sms",
    authentifier,
    async (req, res) => {

        try {

            const resultat =
                await pool.query(
                    `
                    SELECT
                        id,
                        nom,
                        message
                    FROM modeles_sms
                    ORDER BY id DESC
                    `
                );

            res.json(resultat.rows);

        } catch (error) {

            console.error(
                "Erreur modèles SMS :",
                error.message
            );

            res.status(500).json({
                message:
                    "Impossible de récupérer les modèles SMS."
            });
        }
    }
);

// ========================================
// MODÈLE SMS - AJOUT
// ========================================

app.post(
    "/modeles-sms",
    authentifier,

    [
        body("nom")
            .trim()
            .isLength({ min: 1, max: 150 })
            .withMessage("Nom du modèle requis."),

        body("message")
            .trim()
            .isLength({ min: 1, max: 1000 })
            .withMessage("Message requis.")
    ],

    verifierValidation,

    async (req, res) => {

        try {

            const {
                nom,
                message
            } = req.body;

            const resultat =
                await pool.query(
                    `
                    INSERT INTO modeles_sms
                    (
                        nom,
                        message
                    )
                    VALUES ($1, $2)
                    RETURNING *
                    `,
                    [
                        nom,
                        message
                    ]
                );

            res.status(201).json(
                resultat.rows[0]
            );

        } catch (error) {

            console.error(
                "Erreur ajout modèle :",
                error.message
            );

            res.status(500).json({
                message:
                    "Impossible d'ajouter le modèle SMS."
            });
        }
    }
);

// ========================================
// ENVOI SMS INDIVIDUEL
// ========================================

app.post(
    "/sms/send",
    authentifier,
    limiteSMS,

    [
        body("telephone")
            .trim()
            .isLength({ min: 6, max: 30 })
            .withMessage("Numéro de téléphone invalide."),

        body("message")
            .trim()
            .isLength({ min: 1, max: 1000 })
            .withMessage("Message SMS invalide.")
    ],

    verifierValidation,

    async (req, res) => {

        try {

            const {
                telephone,
                message
            } = req.body;

            const resultat =
                await axios.post(
                    "https://sms.esmsafrica.io/api/messages/send",
                    {
                        to: telephone,
                        text: message,
                        sender_id: ESMS_SENDER_ID
                    },
                    {
                        headers: {
                            Authorization:
                                `Bearer ${ESMS_API_KEY}`,

                            "Content-Type":
                                "application/json"
                        },

                        timeout: 15000
                    }
                );

            await pool.query(
                `
                INSERT INTO historique_sms
                (
                    telephone,
                    message,
                    statut
                )
                VALUES ($1, $2, $3)
                `,
                [
                    telephone,
                    message,
                    "envoyé"
                ]
            );

            res.json({
                message:
                    "SMS envoyé avec succès.",
                resultat:
                    resultat.data
            });

        } catch (error) {

            console.error(
                "Erreur envoi SMS :",
                error.response?.data ||
                error.message
            );

            try {

                const {
                    telephone,
                    message
                } = req.body;

                await pool.query(
                    `
                    INSERT INTO historique_sms
                    (
                        telephone,
                        message,
                        statut
                    )
                    VALUES ($1, $2, $3)
                    `,
                    [
                        telephone,
                        message,
                        "échec"
                    ]
                );

            } catch (historiqueError) {

                console.error(
                    "Erreur historique :",
                    historiqueError.message
                );
            }

            res.status(500).json({
                message:
                    "Échec de l'envoi du SMS."
            });
        }
    }
);

// ========================================
// ENVOI SMS À UN GROUPE
// ========================================

app.post(
    "/sms/send-group",
    authentifier,
    limiteSMS,

    [
        body("groupeId")
            .isInt()
            .withMessage("Groupe invalide."),

        body("message")
            .trim()
            .isLength({ min: 1, max: 1000 })
            .withMessage("Message SMS invalide.")
    ],

    verifierValidation,

    async (req, res) => {

        try {

            const {
                groupeId,
                message
            } = req.body;

            const clients =
                await pool.query(
                    `
                    SELECT telephone
                    FROM clients
                    WHERE groupe_id = $1
                    AND telephone IS NOT NULL
                    `,
                    [groupeId]
                );

            if (clients.rows.length === 0) {

                return res.status(404).json({
                    message:
                        "Aucun client trouvé dans ce groupe."
                });
            }

            let envoyes = 0;
            let echecs = 0;

            for (
                const client of clients.rows
            ) {

                try {

                    await axios.post(
                        "https://sms.esmsafrica.io/api/messages/send",
                        {
                            to: client.telephone,
                            text: message,
                            sender_id:
                                ESMS_SENDER_ID
                        },
                        {
                            headers: {
                                Authorization:
                                    `Bearer ${ESMS_API_KEY}`,

                                "Content-Type":
                                    "application/json"
                            },

                            timeout: 15000
                        }
                    );

                    await pool.query(
                        `
                        INSERT INTO historique_sms
                        (
                            telephone,
                            message,
                            statut
                        )
                        VALUES ($1, $2, $3)
                        `,
                        [
                            client.telephone,
                            message,
                            "envoyé"
                        ]
                    );

                    envoyes++;

                } catch (error) {

                    echecs++;

                    await pool.query(
                        `
                        INSERT INTO historique_sms
                        (
                            telephone,
                            message,
                            statut
                        )
                        VALUES ($1, $2, $3)
                        `,
                        [
                            client.telephone,
                            message,
                            "échec"
                        ]
                    );
                }
            }

            res.json({
                message:
                    "Campagne SMS terminée.",
                total:
                    clients.rows.length,
                envoyes,
                echecs
            });

        } catch (error) {

            console.error(
                "Erreur SMS groupe :",
                error.message
            );

            res.status(500).json({
                message:
                    "Impossible d'envoyer les SMS au groupe."
            });
        }
    }
);

// ========================================
// HISTORIQUE SMS
// ========================================

app.get(
    "/historique",
    authentifier,
    async (req, res) => {

        try {

            const resultat =
                await pool.query(
                    `
                    SELECT
                        id,
                        telephone,
                        message,
                        statut,
                        date_envoi
                    FROM historique_sms
                    ORDER BY id DESC
                    `
                );

            res.json(resultat.rows);

        } catch (error) {

            console.error(
                "Erreur historique :",
                error.message
            );

            res.status(500).json({
                message:
                    "Impossible de récupérer l'historique."
            });
        }
    }
);

// ========================================
// GESTION DES ERREURS CORS
// ========================================

app.use(
    (error, req, res, next) => {

        if (
            error &&
            error.message ===
            "Origine non autorisée."
        ) {

            return res.status(403).json({
                message:
                    "Origine non autorisée."
            });
        }

        next(error);
    }
);

// ========================================
// ERREUR 404
// ========================================

app.use(
    (req, res) => {

        res.status(404).json({
            message:
                "Route introuvable."
        });
    }
);

// ========================================
// ERREUR SERVEUR
// ========================================

app.use(
    (error, req, res, next) => {

        console.error(
            "Erreur serveur :",
            error.message
        );

        res.status(500).json({
            message:
                "Erreur interne du serveur."
        });
    }
);

// ========================================
// DÉMARRAGE SERVEUR
// ========================================

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `Serveur SMS Clients démarré sur le port ${PORT}`
        );

        console.log(
            `Environnement : ${
                process.env.NODE_ENV || "development"
            }`
        );
    }
);