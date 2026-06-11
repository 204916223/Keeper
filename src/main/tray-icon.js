const { nativeImage } = require('electron');

function createTrayIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
      <path fill="#000000" d="M9 2h2v1h2v2h2v3h1v4h-1v2h-2v1H5v-1H3v-2H2V8h1V5h2V3h4V2z"/>
      <path fill="none" d="M6 8h2v2H6zM11 8h2v2h-2zM8 12h3v1H8z"/>
    </svg>
  `;

  const image = nativeImage.createFromDataURL(
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
  );

  if (process.platform === 'darwin') {
    image.setTemplateImage(true);
  }

  return image;
}

module.exports = {
  createTrayIcon,
};
