const { create } = require('domain');
const { app, BrowserWindow, session, ipcMain, shell} = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

let mainWindow;
let downloadItem;

autoUpdater.logger = require('electron-log');
autoUpdater.logger.transports.file.level = 'info';

autoUpdater.autoInstallOnAppQuit = false;
autoUpdater.updateMode = 'none';

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

autoUpdater.on('error', (error) => {
    console.error('Update error:', error);
  });

autoUpdater.on('checking-for-update', () => {
    console.log('Checking for update...');
  });
  
  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info.version);
  });
  
  autoUpdater.on('update-not-available', () => {
    console.log('Update not available.');
  });
  
  autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded:', info.version);
  });
  

app.on('ready', () => {
    createWindow();
    autoUpdater.checkForUpdatesAndNotify();
});

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

autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'AidanWarner97',
    repo: 'tileimagegen-electron'
});

