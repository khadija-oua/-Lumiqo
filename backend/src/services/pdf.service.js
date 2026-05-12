// pdf-parse's index.js tries to load a test PDF when require()'d in some
// environments. Importing the implementation directly avoids that side effect.
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

const driveService = require('./drive.service');

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function extractTextFromDriveFile(driveFileId) {
  const stream = await driveService.getDownloadStream(driveFileId);
  const buffer = await streamToBuffer(stream);
  const result = await pdfParse(buffer);
  return (result.text || '').trim();
}

module.exports = { extractTextFromDriveFile };
