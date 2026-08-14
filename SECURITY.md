# Security Policy

## Supported version

Security fixes are applied to the current default branch and the live deployment.

## Report a vulnerability

Do not open a public issue when a problem could expose local music files, corrupt an
attached drive, disclose credentials, or allow untrusted file content to execute.

Use GitHub's private vulnerability reporting feature if it is enabled. Otherwise,
contact the repository owner through the contact method listed on the GitHub profile.

Include the browser and operating system, affected file type, reproduction steps,
expected and observed behavior, and whether any local files were changed.

## Sensitive areas

Take extra care around:

- browser file-system permissions
- SQLite and database parsing
- playlist and device-library writes
- malformed metadata and imported files
- Pioneer and Denon export compatibility
- local backups and rollback behavior

## Safety rule

Treat every imported database, playlist, and metadata file as untrusted input. Before
writing to removable media, preserve a recoverable backup and verify the output.

## Secrets

Never commit `.env` files, access tokens, API keys, or deployment credentials.
Revoke and rotate any credential that is exposed.
