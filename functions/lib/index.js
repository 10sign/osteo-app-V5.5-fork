"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pdfGenerator = exports.emailSender = exports.apiProxy = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const pdfkit_1 = __importDefault(require("pdfkit"));
// Initialise l’Admin SDK (une seule fois par instance)
admin.initializeApp();
/**
 * API Proxy stub
 * À remplacer par des appels upstream et des secrets via Functions config.
 */
exports.apiProxy = functions.https.onRequest(async (req, res) => {
    const allowed = ['GET', 'POST'];
    if (!allowed.includes(req.method)) {
        res.status(405).send('Method Not Allowed');
        return;
    }
    res.status(200).json({ ok: true, message: 'API Proxy stub active', path: req.path });
});
/**
 * Email Sender stub
 * Implémentez via nodemailer avec des creds SMTP dans Functions config.
 */
exports.emailSender = functions.https.onRequest(async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    try {
        const cfg = functions.config();
        const smtpHost = cfg?.smtp?.host;
        const smtpPort = cfg?.smtp?.port ? Number(cfg.smtp.port) : undefined;
        const smtpUser = cfg?.smtp?.username;
        const smtpPass = cfg?.smtp?.password;
        const defaultFrom = cfg?.smtp?.from || smtpUser;
        if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
            res.status(500).json({ ok: false, error: 'SMTP configuration missing. Set functions config: smtp.host, smtp.port, smtp.username, smtp.password, smtp.from' });
            return;
        }
        const { to, subject, text, html, from } = req.body || {};
        if (!to || !subject || (!text && !html)) {
            res.status(400).json({ ok: false, error: 'Missing required fields: to, subject, and text or html' });
            return;
        }
        const transporter = nodemailer_1.default.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: { user: smtpUser, pass: smtpPass },
        });
        const info = await transporter.sendMail({
            from: from || defaultFrom,
            to,
            subject,
            text,
            html,
        });
        res.status(200).json({ ok: true, messageId: info.messageId, accepted: info.accepted, rejected: info.rejected });
    }
    catch (err) {
        res.status(500).json({ ok: false, error: err?.message || 'Unknown error' });
    }
});
/**
 * PDF Generator stub
 * Implémentez avec votre service/librairie PDF préférée.
 */
exports.pdfGenerator = functions.https.onRequest(async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    try {
        const { template, data, filename } = req.body || {};
        const name = filename || 'document.pdf';
        const doc = new pdfkit_1.default({ size: 'A4', margin: 50 });
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => {
            const buffer = Buffer.concat(chunks);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
            res.status(200).send(buffer);
        });
        // Simple templates
        if (template === 'invoice') {
            doc.fontSize(18).text('Facture', { align: 'center' });
            doc.moveDown();
            doc.fontSize(12).text(`Numéro: ${data?.invoiceNumber ?? ''}`);
            doc.text(`Patient: ${data?.patientName ?? ''}`);
            doc.text(`Date: ${data?.date ?? ''}`);
            doc.moveDown();
            doc.text('Détails:', { underline: true });
            if (Array.isArray(data?.items)) {
                data.items.forEach((item, i) => {
                    doc.text(`- ${item?.label ?? `Ligne ${i + 1}`}: ${item?.amount ?? ''}`);
                });
            }
            doc.moveDown();
            doc.fontSize(14).text(`Total: ${data?.total ?? ''}`, { align: 'right' });
        }
        else if (template === 'medicalCertificate') {
            doc.fontSize(18).text('Certificat Médical', { align: 'center' });
            doc.moveDown();
            doc.fontSize(12).text(`Patient: ${data?.patientName ?? ''}`);
            doc.text(`Date: ${data?.date ?? ''}`);
            doc.moveDown();
            doc.text(data?.content ?? 'Certifie que le patient a suivi une consultation.');
        }
        else {
            // Generic: print key-value pairs
            doc.fontSize(16).text('Document', { align: 'center' });
            doc.moveDown();
            doc.fontSize(12).text('Données:');
            const entries = Object.entries(data || {});
            entries.forEach(([k, v]) => {
                doc.text(`${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`);
            });
        }
        doc.end();
    }
    catch (err) {
        res.status(500).json({ ok: false, error: err?.message || 'Unknown error' });
    }
});
