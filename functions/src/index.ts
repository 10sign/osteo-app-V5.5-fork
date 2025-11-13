import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import nodemailer from 'nodemailer';
import PDFDocument = require('pdfkit');
import { randomUUID } from 'crypto';

// Initialisation sécurisée du SDK Admin
// - En environnement Firebase Functions (GCP), l'initialisation par défaut fonctionne (ADC)
// - Hors GCP, on peut fournir les identifiants via variables d'environnement
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || 'ostheo-app';
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  const databaseURL = process.env.FIREBASE_DATABASE_URL || 'https://ostheo-app-default-rtdb.europe-west1.firebasedatabase.app';

  if (clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      databaseURL,
    });
  } else {
    // Fallback: ADC (Application Default Credentials) lorsqu'on tourne sur Firebase Functions
    admin.initializeApp({ databaseURL });
  }
}

async function requireAuth(req: any) {
  const authHeader = req.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) throw new Error('UNAUTHENTICATED');
  const decoded = await admin.auth().verifyIdToken(token);
  return decoded.uid;
}

export const apiProxy = functions.https.onRequest(async (req: any, res: any) => {
  const allowed = ['GET', 'POST'];
  if (!allowed.includes(req.method)) {
    res.status(405).send('Method Not Allowed');
    return;
  }

  res.status(200).json({ ok: true, message: 'API Proxy stub active', path: req.path });
});

export const emailSender = functions.https.onRequest(async (req: any, res: any) => {
  try {
    await requireAuth(req);
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    const config = functions.config();
    const smtp = config.smtp || {};
    const { host, port, username, password, from } = smtp;

    if (!host || !port || !username || !password) {
      res.status(500).json({ error: 'SMTP configuration missing' });
      return;
    }

    const { to, subject, text, html } = req.body || {};
    if (!to || !subject || (!text && !html)) {
      res.status(400).json({ error: 'Missing required fields: to, subject, text|html' });
      return;
    }

    const transporter = nodemailer.createTransport({
      host,
      port: Number(port),
      secure: Number(port) === 465,
      auth: { user: username, pass: password },
    });

    const info = await transporter.sendMail({
      from: from || username,
      to,
      subject,
      text,
      html,
    });

    res.status(200).json({ messageId: info.messageId, accepted: info.accepted, rejected: info.rejected });
  } catch (err: any) {
    if (err?.message === 'UNAUTHENTICATED') {
      res.status(401).json({ error: 'Unauthenticated' });
      return;
    }
    res.status(500).json({ error: 'Internal Server Error', details: err?.message });
  }
});

export const pdfGenerator = functions.https.onRequest(async (req: any, res: any) => {
  try {
    await requireAuth(req);
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    const { template, data, filename } = req.body || {};
    const fname = filename || 'document.pdf';

    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);

    doc.fontSize(18).text('OsteoApp – Document PDF', { align: 'center' }).moveDown();

    if (template === 'invoice') {
      doc.fontSize(14).text('Facture', { underline: true }).moveDown();
      doc.fontSize(12).text(`Numéro: ${data?.invoiceNumber || '-'}`);
      doc.text(`Patient: ${data?.patientName || '-'}`);
      doc.text(`Date: ${data?.date || '-'}`).moveDown();
      const items = Array.isArray(data?.items) ? data.items : [];
      items.forEach((it: any, idx: number) => {
        doc.text(`• ${idx + 1}. ${it.label || 'Item'} – ${it.amount || '-'}`);
      });
      doc.moveDown();
      doc.text(`Total: ${data?.total || '-'}`, { align: 'right' });
    } else if (template === 'medicalCertificate') {
      doc.fontSize(14).text('Certificat Médical', { underline: true }).moveDown();
      doc.fontSize(12).text(`Patient: ${data?.patientName || '-'}`);
      doc.text(`Date: ${data?.date || '-'}`).moveDown();
      doc.text(data?.content || 'Ce certificat atteste…');
    } else {
      doc.fontSize(12).text('Template inconnu; dump des données:').moveDown();
      Object.entries(data || {}).forEach(([k, v]) => {
        doc.text(`${k}: ${JSON.stringify(v)}`);
      });
    }

    doc.end();
    doc.pipe(res);
  } catch (err: any) {
    if (err?.message === 'UNAUTHENTICATED') {
      res.status(401).json({ error: 'Unauthenticated' });
      return;
    }
    res.status(500).json({ error: 'Internal Server Error', details: err?.message });
  }
});

// CORS helper: allow simple cross-origin requests from local dev and app
function setCors(res: any) {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
}

// Upload proxy to bypass client-side CORS/preflight/network blocks
export const uploadDocumentProxy = functions.https.onRequest(async (req: any, res: any) => {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  try {
    const uid = await requireAuth(req);
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    const { path, base64, contentType, customMetadata } = req.body || {};
    if (!path || !base64) {
      res.status(400).json({ error: 'Missing required fields: path, base64' });
      return;
    }

    // Enforce that users can only write under their own namespace
    if (!String(path).startsWith(`users/${uid}/`)) {
      res.status(403).json({ error: 'Forbidden: invalid storage path for user' });
      return;
    }

    const buffer = Buffer.from(base64, 'base64');
    const bucket = admin.storage().bucket();
    const file = bucket.file(String(path));
    const token = randomUUID();

    const metadata: any = {
      contentType: contentType || 'application/octet-stream',
      metadata: {
        firebaseStorageDownloadTokens: token,
        ...(customMetadata && typeof customMetadata === 'object' ? customMetadata : {}),
      },
    };

    await file.save(buffer, metadata);

    const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(String(path))}?alt=media&token=${token}`;
    res.status(200).json({
      path,
      downloadUrl,
      size: buffer.length,
      contentType: metadata.contentType,
    });
  } catch (err: any) {
    if (err?.message === 'UNAUTHENTICATED') {
      res.status(401).json({ error: 'Unauthenticated' });
      return;
    }
    res.status(500).json({ error: 'Internal Server Error', details: err?.message });
  }
});