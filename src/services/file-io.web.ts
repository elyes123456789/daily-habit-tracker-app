/** Saving and opening backup files in a browser (download / file chooser). */

export async function saveTextFile(name: string, mimeType: string, text: string): Promise<void> {
  const url = URL.createObjectURL(new Blob([text], { type: mimeType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Resolves `null` if the user cancels. */
export function pickTextFile(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) file.text().then(resolve, reject);
      else resolve(null);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}
