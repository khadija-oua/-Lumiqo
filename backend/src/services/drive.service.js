const { Readable } = require('stream');
const { google } = require('googleapis');

const FRENCH_MISSING_OAUTH_ENV =
  'Configuration OAuth Google Drive incomplète. Définissez ' +
  'GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET et ' +
  'GOOGLE_OAUTH_REFRESH_TOKEN dans .env. Voir la section ' +
  '"Google Drive setup" du README.';

const FRENCH_FOLDER_INVALID =
  'Le dossier Google Drive est introuvable ou inaccessible. Vérifiez ' +
  'GOOGLE_DRIVE_FOLDER_ID dans .env et que le dossier existe dans le ' +
  'compte Drive autorisé.';

// Hard-coded so the OAuth2 client uses the same redirect URI registered
// in the GCP OAuth client. Must match scripts/get-refresh-token.js.
const REDIRECT_URI = 'http://localhost:3000/oauth/callback';

let driveClient = null;
let folderValidationPromise = null;

function getDrive() {
  if (driveClient) return driveClient;

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(FRENCH_MISSING_OAUTH_ENV);
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    REDIRECT_URI,
  );
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  driveClient = google.drive({ version: 'v3', auth: oauth2Client });
  return driveClient;
}

function getFolderId() {
  const id = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!id) throw new Error(FRENCH_FOLDER_INVALID);
  return id;
}

// Verifies GOOGLE_DRIVE_FOLDER_ID points to a real, accessible folder.
// Memoized at module level on success, so the check runs once per process.
// On failure we clear the cached promise so the next call retries (useful
// after the operator fixes .env and triggers another request).
async function ensureFolderValid() {
  if (folderValidationPromise) return folderValidationPromise;

  folderValidationPromise = (async () => {
    const drive = getDrive();
    const folderId = getFolderId();
    try {
      const res = await drive.files.get({
        fileId: folderId,
        fields: 'id, mimeType',
      });
      if (res.data.mimeType !== 'application/vnd.google-apps.folder') {
        throw new Error(FRENCH_FOLDER_INVALID);
      }
    } catch (err) {
      const status = err.code || err.response?.status;
      if (
        status === 404 ||
        status === 403 ||
        err.message === FRENCH_FOLDER_INVALID
      ) {
        throw new Error(FRENCH_FOLDER_INVALID);
      }
      throw err;
    }
  })();

  // If validation fails, allow the next call to retry by dropping the cache.
  folderValidationPromise.catch(() => {
    folderValidationPromise = null;
  });

  return folderValidationPromise;
}

async function uploadPdf(buffer, filename, mimeType) {
  const drive = getDrive();
  await ensureFolderValid();
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
  });

  return { fileId: res.data.id, webViewLink: res.data.webViewLink };
}

async function deleteFile(fileId) {
  const drive = getDrive();
  await ensureFolderValid();
  await drive.files.delete({ fileId });
}

async function getDownloadStream(fileId) {
  const drive = getDrive();
  await ensureFolderValid();
  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' },
  );
  return res.data;
}

module.exports = { uploadPdf, deleteFile, getDownloadStream };
