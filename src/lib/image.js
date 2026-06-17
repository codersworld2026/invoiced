// Resize an image File down to fit within maxDim (px) and return a PNG data URL.
// Ported from the monolith — used for logo uploads so stored logos stay small.
export function resizeImageToDataUrl(file, maxDim = 400) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const srcW = img.naturalWidth || img.width || maxDim;
        const srcH = img.naturalHeight || img.height || maxDim;
        const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
        const w = Math.max(1, Math.round(srcW * scale));
        const h = Math.max(1, Math.round(srcH * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
