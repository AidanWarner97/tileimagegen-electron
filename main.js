const { create } = require('domain');
const { app, BrowserWindow, session, ipcMain, shell } = require('electron');
const path = require('path');

let mainWindow;
let downloadItem;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 655,
        icon: path.join(__dirname, 'logo.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            sandbox: true
        },
        autoHideMenuBar: true
    });

    mainWindow.loadURL('https://tileimagegen.uk');

    session.defaultSession.on('will-download', (event, item, webContents) => {
        const filePath = path.join(app.getPath('downloads'), item.getFilename());
        item.setSavePath(filePath);

        mainWindow.webContents.send('download-started');

        item.on('updated', (event, state) => {
            if (state === 'progressing') {
                const receivedBytes = item.getReceivedBytes();
                const totalBytes = item.getTotalBytes();
                const progress = Math.round((receivedBytes / totalBytes) * 100);
                mainWindow.webContents.send('download-progress', progress);
            }
        });

        item.once('done', (event, state) => {
            if (state === 'completed') {
                mainWindow.webContents.send('download-complete', filePath);
            } else {
                mainWindow.webContents.send('download-failed');
            }
        });
    });

    ipcMain.on('open-file', (event, filePath) => {
        shell.openPath(filePath);
    });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});