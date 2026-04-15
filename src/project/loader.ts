const DIAGRAM_EXTENSIONS = new Set(['.sd', '.id', '.iff', '.tm', '.tegne']);

export async function loadProjectDirectory(
  dirHandle: FileSystemDirectoryHandle,
): Promise<Map<string, string>> {
  const files = new Map<string, string>();

  for await (const [name, handle] of dirHandle.entries()) {
    if (handle.kind !== 'file') continue;
    const dotIdx = name.lastIndexOf('.');
    const ext    = dotIdx !== -1 ? name.slice(dotIdx) : '';
    if (!DIAGRAM_EXTENSIONS.has(ext)) continue;

    const file = await handle.getFile();
    const text = await file.text();
    files.set(name, text);
  }

  return files;
}
