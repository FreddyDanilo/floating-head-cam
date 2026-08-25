import fs from 'fs';
import path from 'path';

const releaseNotesPath = path.join(process.cwd(), 'build', 'release-notes.md');

const content = '# Release Notes\n\n* General updates and improvements.';

fs.mkdirSync(path.dirname(releaseNotesPath), { recursive: true });
fs.writeFileSync(releaseNotesPath, content);
console.log('Release notes generated at build/release-notes.md');
