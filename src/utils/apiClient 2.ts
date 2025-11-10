import { getAuth } from 'firebase/auth';

export async function callEmailSender(payload: unknown) {
  const user = getAuth().currentUser;
  const token = user ? await user.getIdToken() : '';
  const res = await fetch('/emailSender', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`EmailSender failed: ${res.status}`);
  return res.json();
}

export async function callPdfGenerator(payload: unknown) {
  const user = getAuth().currentUser;
  const token = user ? await user.getIdToken() : '';
  const res = await fetch('/pdfGenerator', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`PdfGenerator failed: ${res.status}`);
  return res.blob();
}