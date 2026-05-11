/* eslint-disable no-console */
//
// Generates a Google OAuth 2.0 refresh token for the SmartMoodle backend.
//
// Run from the project root:
//   cd backend
//   npm install            # if you haven't already
//   node scripts/get-refresh-token.js
//
// Reads GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET from the
// repository-root .env, opens an OAuth consent flow, captures the redirect
// at http://localhost:3000/oauth/callback, and prints the resulting
// refresh token. Paste the value into .env as GOOGLE_OAUTH_REFRESH_TOKEN.
//

const path = require('path');
require('dotenv').config({
  path: path.resolve(__dirname, '..', '..', '.env'),
});

const http = require('http');
const { google } = require('googleapis');

const REDIRECT_URI = 'http://localhost:3000/oauth/callback';
const PORT = 3000;
const SCOPES = ['https://www.googleapis.com/auth/drive'];
const TIMEOUT_MS = 5 * 60 * 1000;

const SEPARATOR = '═'.repeat(67);

function fail(message, exitCode = 1) {
  console.error(`\n[ERROR] ${message}\n`);
  process.exit(exitCode);
}

function htmlPage(title, body) {
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <title>${title}</title>
  </head>
  <body style="font-family:system-ui,sans-serif;max-width:600px;margin:4rem auto;padding:2rem;text-align:center;line-height:1.5;">
    ${body}
  </body>
</html>`;
}

function main() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    fail(
      'GOOGLE_OAUTH_CLIENT_ID et GOOGLE_OAUTH_CLIENT_SECRET sont requis ' +
        'dans .env. Voir la section "Google Drive setup" du README.',
    );
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    REDIRECT_URI,
  );

  // access_type=offline + prompt=consent guarantees we get a refresh_token
  // even if the user has already authorized this client before.
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  });

  console.log('\n=== SmartMoodle — Génération du refresh token Google Drive ===\n');
  console.log("1. Ouvrez l'URL suivante dans votre navigateur :\n");
  console.log(`   ${authUrl}\n`);
  console.log("2. Connectez-vous, cochez les permissions et autorisez l'application.");
  console.log('3. Vous serez redirigé vers localhost — ce script captera la réponse.\n');
  console.log('(En attente de la redirection… délai max : 5 minutes)\n');

  let timeoutId;

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    if (url.pathname !== '/oauth/callback') {
      res.statusCode = 404;
      res.end('Not Found');
      return;
    }

    const code = url.searchParams.get('code');
    const errorCode = url.searchParams.get('error');

    if (errorCode) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(
        htmlPage(
          'Erreur',
          `<h1>Erreur d'autorisation</h1><p><code>${errorCode}</code></p><p>Vous pouvez fermer cet onglet.</p>`,
        ),
      );
      console.error(`\n[ERROR] Autorisation refusée : ${errorCode}\n`);
      cleanup(1);
      return;
    }

    if (!code) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(
        htmlPage(
          'Erreur',
          "<h1>Erreur</h1><p>Aucun code OAuth dans la redirection.</p>",
        ),
      );
      console.error('\n[ERROR] Aucun code OAuth dans la redirection.\n');
      cleanup(1);
      return;
    }

    try {
      const { tokens } = await oauth2Client.getToken(code);

      if (!tokens.refresh_token) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(
          htmlPage(
            'Erreur',
            "<h1>Aucun refresh token reçu</h1>" +
              "<p>Cela arrive quand vous avez déjà autorisé cette application auparavant. " +
              "Révoquez l'accès dans <a href=\"https://myaccount.google.com/permissions\">Mon compte Google</a> puis relancez le script.</p>",
          ),
        );
        console.error(
          '\n[ERROR] Aucun refresh_token reçu. Cela arrive si vous avez déjà autorisé',
        );
        console.error(
          '        cette application. Solution : ouvrez https://myaccount.google.com/permissions',
        );
        console.error('        révoquez l\'accès, puis relancez ce script.\n');
        cleanup(1);
        return;
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(
        htmlPage(
          'SmartMoodle',
          '<h1>Autorisation réussie</h1>' +
            '<p>Le refresh token a été affiché dans votre terminal.</p>' +
            '<p>Vous pouvez fermer cet onglet.</p>',
        ),
      );

      console.log('\n[OK] Refresh token obtenu :\n');
      console.log(SEPARATOR);
      console.log(tokens.refresh_token);
      console.log(SEPARATOR);
      console.log('\nÉtapes suivantes :');
      console.log('  1. Copiez la valeur ci-dessus dans .env (à la racine du projet) :');
      console.log('       GOOGLE_OAUTH_REFRESH_TOKEN=<cette_valeur>');
      console.log('  2. Vérifiez que GOOGLE_DRIVE_FOLDER_ID est aussi défini.');
      console.log('  3. Redémarrez le backend :');
      console.log('       docker compose restart backend\n');

      cleanup(0);
    } catch (err) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(
        htmlPage(
          'Erreur',
          `<h1>Échec de l'échange du code</h1><p>${err.message}</p>`,
        ),
      );
      console.error(`\n[ERROR] Échec de l'échange du code : ${err.message}\n`);
      cleanup(1);
    }
  });

  function cleanup(exitCode) {
    if (timeoutId) clearTimeout(timeoutId);
    server.close(() => process.exit(exitCode));
  }

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      fail(
        `Le port ${PORT} est déjà utilisé. Arrêtez le service qui l'occupe ` +
          'puis relancez le script.',
      );
    }
    fail(`Erreur du serveur HTTP : ${err.message}`);
  });

  server.listen(PORT, '0.0.0.0', () => {
    timeoutId = setTimeout(() => {
      console.error(
        '\n[ERROR] Délai dépassé. Aucune autorisation reçue. Relancez le ' +
          "script et complétez l'autorisation dans votre navigateur.\n",
      );
      cleanup(1);
    }, TIMEOUT_MS);
  });
}

main();
