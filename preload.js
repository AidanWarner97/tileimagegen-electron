window.addEventListener('DOMContentLoaded', () => {
    const replaceText = (selector, text) => {
      const element = document.getElementById(selector);
      if (element) element.innerText = text;
    }
  
    for (const dependency of ['chrome', 'node', 'electron']) {
      replaceText(`${dependency}-version`, process.versions[dependency]);
    }
});
  
const { contextBridge, ipcRenderer } = require('electron');

// Inject hidden download status elements
window.addEventListener('DOMContentLoaded', () => {
    const downloadStatusHtml = `
        <div id="download-status" class="alert alert-secondary" style="margin-bottom:0;position:absolute;bottom:5px;right:10px;z-index:1000;display:none;">
            <progress id="download-progress" value="0" max="100"></progress>
            <span id="download-progress-text">0%</span>
            <button id="open-file-button" class="btn btn-primary" style="display: none;">Open File</button>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', downloadStatusHtml);

    const downloadStatus = document.getElementById('download-status');
    const progressElement = document.getElementById('download-progress');
    const progressText = document.getElementById('download-progress-text');
    const openFileButton = document.getElementById('open-file-button');

    ipcRenderer.on('download-started', () => {
        downloadStatus.style.display = 'block';
    });

    ipcRenderer.on('download-progress', (event, progress) => {
        progressElement.value = progress;
        progressText.textContent = `${progress}%`;
    });

    ipcRenderer.on('download-complete', (event, filePath) => {
        progressElement.style.display = 'none';
        downloadStatus.style.display = 'inline-flex';
        progressText.textContent = 'Download Complete';
        progressText.style.display = 'flex';
        progressText.style.alignItems = 'center';
        progressText.style.border = '0';
        openFileButton.style.display = 'block';
        openFileButton.onclick = () => {
            ipcRenderer.send('open-file', filePath);
        };
    });

    ipcRenderer.on('download-failed', () => {
        progressText.textContent = 'Download Failed';
    });

    const styleCookies = document.createElement('hideCookie');
    styleCookies.textContent = `
        .cookie {
            display:none;
        }
    `;
    document.head.appendChild(styleCookies);
});

// Expose APIs to the renderer process
contextBridge.exposeInMainWorld('electron', {
    openFile: (filePath) => ipcRenderer.send('open-file', filePath)
});
