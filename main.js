const { create } = require('domain');
const { app, BrowserWindow, session, ipcMain, shell} = require('electron');
const { autoUpdater } = require('electron-updater');
const { spawn } = require('child_process');
const path = require('path');

let mainWindow;
let downloadItem;
let hasReloaded = false;

autoUpdater.logger = require('electron-log');
autoUpdater.logger.transports.file.level = 'info';

autoUpdater.autoInstallOnAppQuit = false;
autoUpdater.updateMode = 'none';

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 890,
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

    mainWindow.webContents.on('did-finish-load', () => {
        if (!hasReloaded) {
            hasReloaded = true;
            mainWindow.webContents.reload();
        }
    });

    mainWindow.on('closed', function() {
        mainWindow = null;
    });

    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.insertCSS(`
            body {
                overflow-y: hidden;
            }

            #sidebar {
                display: none;
            }
                
            #content {
                float: none !important;
                margin-left: auto !important;
                margin-right: auto !important;
                width: 100% !important;
            }

            #download-status {
                color: #41464b;
                background-color: #e2e3e5;
                border-color: #d3d6d8;
                padding: 1rem 1rem;
                border: 1px solid transparent;
                border-radius: 0.25rem;
            }

            #open-file-button {
                color: #fff;
                background-color: #0d6efd;
                border-color: #0d6efd;
                font-weight: 400;
                line-height: 1.5;
                text-align: center;
                text-decoration: none;
                user-select: none;
                border: 1px solid transparent;
                padding: 0.375rem 0.75rem;
                font-size: 1rem;
                border-radius: 0.25rem;
                transition: color 0.15s ease-in-out, background-color 0.15s ease-in-out, border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
            }

            #open-file-button:hover {
                background-color: #0b5ed7;
                border-color: #0a58ca;
                cursor: pointer;
            }
        `)
    });

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
    console.log('All windows closed. Stopping Flask process.');
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    console.log('App activated.');
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'AidanWarner97',
    repo: 'tileimagegen-electron'
});

