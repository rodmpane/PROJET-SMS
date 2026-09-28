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
// VARIABLES SECRÈTES
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

// ========================================
// APPLICATION EXPRESS
// ========================================

const app = express();

app.disable("x-powered-by");

// ========================================
// HELMET
// ========================================

app.use(
    helmet({
        crossOriginResourcePolicy: {
            policy: "cross-origin"
        }
    })
);

// ========================================
// CORS
// ========================================

const originesAutorisees = [
    "http://localhost:5173",
    "http://127.0.0.1:5173"
];

if (process.env.FRONTEND_URL) {
    originesAutorisees.push(
        process.env.FRONTEND_URL
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
        ]
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
// LIMITATION GÉNÉRALE
// ========================================

const limiteGenerale = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,

    message: {
        message:
            "Trop de requêtes. Veuillez réessayer plus tard."
    }
});

app.use(limiteGenerale);

// ========================================
// LIMITATION LOGIN
// ========================================

const limiteLogin = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,

    message: {
        message:
            "Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes."
    }
});

// ========================================
// LIMITATION SMS
// ========================================

const limiteSMS = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,

    message: {
        message:
            "Trop d'envois SMS. Veuillez patienter avant de recommencer."
    }
});

// ========================================
// VALIDATION
// ========================================

const verifierValidation = (
    req,
    res,
    next
) => {

    const erreurs =
        validationResult(req);

    if (!erreurs.isEmpty()) {

        return res.status(400).json({
            message:
                "Données invalides.",

            erreurs:
                erreurs.array().map(
                    (erreur) => ({
                        champ:
                            erreur.path,

                        message:
                            erreur.msg
                    })
                )
        });
    }

    next();
};

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

        console.log(
            "Connexion à PostgreSQL réussie !"
        );

        client.release();
    })
    .catch((error) => {

        console.error(
            "Erreur connexion PostgreSQL :",
            error.message
        );
    });

// ========================================
// ROUTE PRINCIPALE
// ========================================

app.get("/", (req, res) => {

    res.json({
        message:
            "Serveur SMS Clients opérationnel"
    });
});

// ========================================
// ROUTE DE SANTÉ
// ========================================

app.get("/health", (req, res) => {

    res.status(200).json({
        status: "ok",
        service: "SMS Clients API"
    });
});

// ========================================
// LOGIN
// ========================================

app.post(
    "/login",
    limiteLogin,

    [
        body("email")
            .trim()
            .isEmail()
            .withMessage(
                "Adresse email invalide."
            )
            .normalizeEmail(),

        body("mot_de_passe")
            .isString()
            .isLength({
                min: 1,
                max: 200
            })
            .withMessage(
                "Mot de passe invalide."
            )
    ],

    verifierValidation,

    async (req, res) => {

        try {

            const {
                email,
                mot_de_passe
            } = req.body;

            const result =
                await pool.query(
                    `SELECT *
                     FROM users
                     WHERE email = $1`,
                    [email]
                );

            if (
                result.rows.length === 0
            ) {

                return res.status(401).json({
                    message:
                        "Email ou mot de passe incorrect."
                });
            }

            const utilisateur =
                result.rows[0];

            const motDePasseCorrect =
                await bcrypt.compare(
                    mot_de_passe,
                    utilisateur.mot_de_passe
                );

            if (!motDePasseCorrect) {

                return res.status(401).json({
                    message:
                        "Email ou mot de passe incorrect."
                });
            }

            const token =
                jwt.sign(
                    {
                        id:
                            utilisateur.id,

                        email:
                            utilisateur.email,

                        nom:
                            utilisateur.nom
                    },

                    process.env.JWT_SECRET,

                    {
                        expiresIn: "8h"
                    }
                );

            res.json({
                message:
                    "Connexion réussie.",

                token,

                utilisateur: {
                    id:
                        utilisateur.id,

                    nom:
                        utilisateur.nom,

                    email:
                        utilisateur.email
                }
            });

        } catch (error) {

            console.error(
                "Erreur connexion :",
                error.message
            );

            res.status(500).json({
                message:
                    "Erreur lors de la connexion."
            });
        }
    }
);

// ========================================
// JWT
// ========================================

const verifierToken = (
    req,
    res,
    next
) => {

    const authorization =
        req.headers.authorization;

    if (
        !authorization ||
        !authorization.startsWith(
            "Bearer "
        )
    ) {

        return res.status(401).json({
            message:
                "Accès non autorisé. Token manquant."
        });
    }

    const token =
        authorization.split(" ")[1];

    try {

        const decoded =
            jwt.verify(
                token,
                process.env.JWT_SECRET
            );

        req.utilisateur =
            decoded;

        next();

    } catch (error) {

        return res.status(401).json({
            message:
                "Token invalide ou expiré."
        });
    }
};

// ========================================
// CLIENTS - GET
// ========================================

app.get(
    "/clients",
    verifierToken,

    async (req, res) => {

        try {

            const result =
                await pool.query(
                    `SELECT
                        c.*,
                        g.nom AS groupe_nom
                     FROM clients c
                     LEFT JOIN groupes g
                        ON c.groupe_id = g.id
                     ORDER BY c.id DESC`
                );

            res.json(
                result.rows
            );

        } catch (error) {

            console.error(
                "Erreur récupération clients :",
                error.message
            );

            res.status(500).json({
                message:
                    "Erreur récupération clients."
            });
        }
    }
);

// ========================================
// CLIENTS - AJOUT
// ========================================

app.post(
    "/clients",
    verifierToken,

    [
        body("nom")
            .trim()
            .isLength({
                min: 1,
                max: 100
            })
            .withMessage(
                "Le nom est obligatoire."
            ),

        body("prenom")
            .optional({
                values: "null"
            })
            .trim()
            .isLength({
                max: 100
            }),

        body("telephone")
            .trim()
            .isLength({
                min: 8,
                max: 20
            })
            .withMessage(
                "Numéro de téléphone invalide."
            ),

        body("email")
            .optional({
                values: "null"
            })
            .trim()
            .isEmail()
            .withMessage(
                "Adresse email invalide."
            ),

        body("groupe_id")
            .optional({
                values: "null"
            })
            .isInt({
                min: 1
            })
            .withMessage(
                "Groupe invalide."
            )
    ],

    verifierValidation,

    async (req, res) => {

        try {

            const {
                nom,
                prenom,
                telephone,
                email,
                groupe,
                groupe_id
            } = req.body;

            const result =
                await pool.query(
                    `INSERT INTO clients
                    (
                        nom,
                        prenom,
                        telephone,
                        email,
                        groupe,
                        groupe_id
                    )
                    VALUES
                    ($1, $2, $3, $4, $5, $6)
                    RETURNING *`,

                    [
                        nom,
                        prenom || null,
                        telephone,
                        email || null,
                        groupe || null,
                        groupe_id || null
                    ]
                );

            res.status(201).json(
                result.rows[0]
            );

        } catch (error) {

            console.error(
                "Erreur ajout client :",
                error.message
            );

            res.status(500).json({
                message:
                    "Erreur lors de l'ajout du client."
            });
        }
    }
);

// ========================================
// CLIENTS - SUPPRESSION
// ========================================

app.delete(
    "/clients/:id",
    verifierToken,

    [
        param("id")
            .isInt({
                min: 1
            })
            .withMessage(
                "Identifiant client invalide."
            )
    ],

    verifierValidation,

    async (req, res) => {

        try {

            const { id } =
                req.params;

            await pool.query(
                `DELETE FROM clients
                 WHERE id = $1`,
                [id]
            );

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
                    "Erreur lors de la suppression."
            });
        }
    }
);

// ========================================
// GROUPES - GET
// ========================================

app.get(
    "/groupes",
    verifierToken,

    async (req, res) => {

        try {

            const result =
                await pool.query(
                    `SELECT *
                     FROM groupes
                     ORDER BY id ASC`
                );

            res.json(
                result.rows
            );

        } catch (error) {

            console.error(
                "Erreur récupération groupes :",
                error.message
            );

            res.status(500).json({
                message:
                    "Erreur récupération groupes."
            });
        }
    }
);

// ========================================
// GROUPES - AJOUT
// ========================================

app.post(
    "/groupes",
    verifierToken,

    [
        body("nom")
            .trim()
            .isLength({
                min: 1,
                max: 100
            })
            .withMessage(
                "Le nom du groupe est obligatoire."
            ),

        body("description")
            .optional({
                values: "null"
            })
            .trim()
            .isLength({
                max: 500
            })
    ],

    verifierValidation,

    async (req, res) => {

        try {

            const {
                nom,
                description
            } = req.body;

            const result =
                await pool.query(
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
                error.message
            );

            res.status(500).json({
                message:
                    "Erreur lors de l'ajout du groupe."
            });
        }
    }
);

// ========================================
// ENVOI SMS ESMS AFRICA
// ========================================

const envoyerSMS = async (
    telephone,
    message
) => {

    const response =
        await axios.post(
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
                },

                timeout: 15000
            }
        );

    return response.data;
};

// ========================================
// SMS INDIVIDUEL
// ========================================

app.post(
    "/sms/send",
    verifierToken,
    limiteSMS,

    [
        body("telephone")
            .trim()
            .isLength({
                min: 8,
                max: 20
            })
            .withMessage(
                "Numéro de téléphone invalide."
            ),

        body("message")
            .isString()
            .trim()
            .isLength({
                min: 1,
                max: 1600
            })
            .withMessage(
                "Message SMS invalide."
            ),

        body("client_id")
            .optional({
                values: "null"
            })
            .isInt({
                min: 1
            }),

        body("groupe_id")
            .optional({
                values: "null"
            })
            .isInt({
                min: 1
            })
    ],

    verifierValidation,

    async (req, res) => {

        try {

            const {
                client_id,
                telephone,
                message,
                groupe_id
            } = req.body;

            let statut = "envoyé";

            try {

                await envoyerSMS(
                    telephone,
                    message
                );

            } catch (smsError) {

                console.error(
                    "Erreur eSMS Africa :",
                    smsError.response?.data ||
                    smsError.message
                );

                statut = "échec";
            }

            const nombreSMS =
                Math.ceil(
                    message.length / 160
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
                    statut,
                    nombreSMS
                ]
            );

            if (
                statut === "échec"
            ) {

                return res.status(500).json({
                    message:
                        "Échec de l'envoi du SMS."
                });
            }

            res.json({
                message:
                    "SMS envoyé avec succès.",

                statut
            });

        } catch (error) {

            console.error(
                "Erreur envoi SMS :",
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
// SMS GROUPE
// ========================================

app.post(
    "/sms/send-group",
    verifierToken,
    limiteSMS,

    [
        body("groupe_id")
            .isInt({
                min: 1
            })
            .withMessage(
                "Groupe invalide."
            ),

        body("message")
            .isString()
            .trim()
            .isLength({
                min: 1,
                max: 1600
            })
            .withMessage(
                "Message SMS invalide."
            )
    ],

    verifierValidation,

    async (req, res) => {

        try {

            const {
                groupe_id,
                message
            } = req.body;

            const clientsResult =
                await pool.query(
                    `SELECT *
                     FROM clients
                     WHERE groupe_id = $1
                     ORDER BY id ASC`,
                    [groupe_id]
                );

            if (
                clientsResult.rows.length === 0
            ) {

                return res.status(404).json({
                    message:
                        "Aucun client dans ce groupe."
                });
            }

            let envoyes = 0;
            let echecs = 0;

            const nombreSMS =
                Math.ceil(
                    message.length / 160
                );

            for (
                const client
                of clientsResult.rows
            ) {

                let statut = "envoyé";

                try {

                    await envoyerSMS(
                        client.telephone,
                        message
                    );

                    envoyes++;

                } catch (smsError) {

                    console.error(
                        `Erreur SMS ${client.telephone} :`,
                        smsError.response?.data ||
                        smsError.message
                    );

                    statut = "échec";
                    echecs++;
                }

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
                        statut,
                        nombreSMS
                    ]
                );
            }

            res.json({

                message:
                    "Envoi groupé terminé.",

                total:
                    clientsResult.rows.length,

                envoyes,

                echecs
            });

        } catch (error) {

            console.error(
                "Erreur envoi groupe :",
                error.message
            );

            res.status(500).json({
                message:
                    "Erreur lors de l'envoi groupé."
            });
        }
    }
);

// ========================================
// HISTORIQUE
// ========================================

app.get(
    "/historique",
    verifierToken,

    async (req, res) => {

        try {

            const result =
                await pool.query(
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
                     ORDER BY h.date_envoi DESC`
                );

            res.json(
                result.rows
            );

        } catch (error) {

            console.error(
                "Erreur récupération historique :",
                error.message
            );

            res.status(500).json({
                message:
                    "Erreur récupération historique."
            });
        }
    }
);

// ========================================
// MODÈLES SMS - GET
// ========================================

app.get(
    "/modeles-sms",
    verifierToken,

    async (req, res) => {

        try {

            const result =
                await pool.query(
                    `SELECT *
                     FROM modeles_sms
                     ORDER BY date_creation DESC`
                );

            res.json(
                result.rows
            );

        } catch (error) {

            console.error(
                "Erreur récupération modèles :",
                error.message
            );

            res.status(500).json({
                message:
                    "Erreur récupération modèles."
            });
        }
    }
);

// ========================================
// MODÈLES SMS - AJOUT
// ========================================

app.post(
    "/modeles-sms",
    verifierToken,

    [
        body("nom")
            .trim()
            .isLength({
                min: 1,
                max: 100
            })
            .withMessage(
                "Le nom est obligatoire."
            ),

        body("message")
            .isString()
            .trim()
            .isLength({
                min: 1,
                max: 1600
            })
            .withMessage(
                "Le message est obligatoire."
            )
    ],

    verifierValidation,

    async (req, res) => {

        try {

            const {
                nom,
                message
            } = req.body;

            const result =
                await pool.query(
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
                error.message
            );

            res.status(500).json({
                message:
                    "Erreur lors de l'ajout du modèle."
            });
        }
    }
);

// ========================================
// DASHBOARD
// ========================================

app.get(
    "/dashboard",
    verifierToken,

    async (req, res) => {

        try {

            const clientsResult =
                await pool.query(
                    `SELECT COUNT(*) AS total
                     FROM clients`
                );

            const groupesResult =
                await pool.query(
                    `SELECT COUNT(*) AS total
                     FROM groupes`
                );

            const smsResult =
                await pool.query(
                    `SELECT COUNT(*) AS total
                     FROM historique_sms`
                );

            const smsReussisResult =
                await pool.query(
                    `SELECT COUNT(*) AS total
                     FROM historique_sms
                     WHERE statut = 'envoyé'`
                );

            const smsEchecsResult =
                await pool.query(
                    `SELECT COUNT(*) AS total
                     FROM historique_sms
                     WHERE statut = 'échec'`
                );

            res.json({

                clients:
                    Number(
                        clientsResult.rows[0].total
                    ),

                groupes:
                    Number(
                        groupesResult.rows[0].total
                    ),

                sms_total:
                    Number(
                        smsResult.rows[0].total
                    ),

                sms_reussis:
                    Number(
                        smsReussisResult.rows[0].total
                    ),

                sms_echecs:
                    Number(
                        smsEchecsResult.rows[0].total
                    )
            });

        } catch (error) {

            console.error(
                "Erreur dashboard :",
                error.message
            );

            res.status(500).json({
                message:
                    "Erreur lors du chargement des statistiques."
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
            error.message ===
            "Origine non autorisée."
        ) {

            return res.status(403).json({
                message:
                    "Accès refusé."
            });
        }

        next(error);
    }
);

// ========================================
// ERREUR GÉNÉRALE
// ========================================

app.use(
    (error, req, res, next) => {

        console.error(
            "Erreur serveur :",
            error.message
        );

        res.status(500).json({
            message:
                "Une erreur interne est survenue."
        });
    }
);

// ========================================
// DÉMARRAGE DU SERVEUR
// ========================================

const PORT =
    process.env.PORT || 5000;

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `Serveur démarré sur le port ${PORT}`
        );

        console.log(
            "Sécurité : Helmet + Rate Limit + Validation + JWT"
        );
    }
);