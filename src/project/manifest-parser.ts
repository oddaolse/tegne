import type { ProjectManifest } from './types';

export function parseManifest(text: string): ProjectManifest {
  const manifest: ProjectManifest = { entries: [] };

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) continue;

    if (line.startsWith('@name ')) {
      manifest.name = line.slice('@name '.length).trim();
    } else if (!line.startsWith('@')) {
      // Any non-directive non-blank line is a filename
      manifest.entries.push({ filename: line });
    }
  }

  return manifest;
}
