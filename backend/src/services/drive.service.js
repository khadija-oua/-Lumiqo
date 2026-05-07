const fs = require('fs');
const { Readable } = require('stream');
const { google } = require('googleapis');

let driveClient = null;

// Lazy: only initialise the Drive client (and validate creds) when first needed.
// This means routes that don't touch Drive still work even if the service
// account JSON hasn't been provisioned yet.
function getDrive() {
  if (driveClient) return driveClient;

  const keyPath = process.env.GOOGLE_DRIVE_CREDENTIALS_PATH;
  if (!keyPath) {
    throw new Error('GOOGLE_DRIVE_CREDENTIALS_PATH is not set');
  }
  if (!fs.existsSync(keyPath)) {
    throw new Error(`Drive credentials file not found at ${keyPath}`);
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: keyPath,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  driveClient = google.drive({ version: 'v3', auth });
  return driveClient;
}

function getFolderId() {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID is not set');
  }
  return folderId;
}

async function uploadPdf(buffer, filename, mimeType) {
  const drive = getDrive();
  const folderId = getFolderId();

  const res = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [folderId],
      mimeType,
    },
    media: {
      mimeType,
      body: Readable.from(buffer),
    },
    fields: 'id, webViewLink',
    supportsAllDrives: true,
  });

  return { fileId: res.data.id, webViewLink: res.data.webViewLink };
}

async function deleteFile(fileId) {
  const drive = getDrive();
  await drive.files.delete({ fileId, supportsAllDrives: true });
}

async function getDownloadStream(fileId) {
  const drive = getDrive();
  const res = await drive.files.get(
    { fileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'stream' },
  );
  return res.data;
}

module.exports = { uploadPdf, deleteFile, getDownloadStream };
