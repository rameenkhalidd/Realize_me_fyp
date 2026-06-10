/** Dev-only: set NEXT_PUBLIC_DEBUG_DOWNLOAD_PIPELINE_PNGS=true in .env.local */
export const DEBUG_DOWNLOAD_PIPELINE_PNGS =
    process.env.NEXT_PUBLIC_DEBUG_DOWNLOAD_PIPELINE_PNGS === 'true';

function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/** Downloads the same sketch/color-hints PNGs sent to /api/generate. No-op when flag is off. */
export function maybeDownloadPipelinePngsForDebug(sketchBlob: Blob, colorHintsBlob: Blob) {
    if (!DEBUG_DOWNLOAD_PIPELINE_PNGS) {
        return;
    }
    downloadBlob(sketchBlob, 'sketch.png');
    window.setTimeout(() => {
        downloadBlob(colorHintsBlob, 'color_hints.png');
    }, 250);
}
