const { app, Tray, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const ActivityTracker = require("./ActivityTracker");
const config = require('./config');
const EnvironmentSpecificOperations = require('./EnvironmentSpecificOperations');

module.exports = class MainApp {
  constructor(app, menu) {
    this.isRunningAsAdmin;
    this.isDebug = true;
    this.iconPath = path.join(__dirname, 'Brain Jack.png');
    this.flags = {
      isFromSystemTrayClose: false
    }
    this._app = app;
    this._ipcMain = ipcMain;
    this._mainWindow;
    this._systemTray;
    this._trayContextMenu = menu;
    this._activityTracker;
    this.onstartupOperations();
    this.appEvents();
    this.ipcEvents();
    
  }

  mainWindowSetUp() {
    this._mainWindow = new BrowserWindow({ width: 400, height: 550 });
    this._mainWindow.loadURL(config.webAppUrl);
    this._mainWindow.setMenu(null);
    this._mainWindow.setIcon(this.iconPath);
    this._mainWindow.show();
    this.mainWindowEvents();
    this.systemTraySetup();
    if (this.isDebug) {
      this._mainWindow.webContents.openDevTools()
    }
  }

  onstartupOperations() {
    if(!this.isDebug) {
      EnvironmentSpecificOperations.WinSetAsStartupApp();
    }
    EnvironmentSpecificOperations.WinCheckIfRunningAsAdmin().then( result => {
      this.isRunningAsAdmin = result;
    });
  }

  systemTraySetup() {
    this._systemTray = new Tray(this.iconPath);
    this._systemTray.setToolTip('BrainJack Is Running...');
    this._systemTray.setContextMenu(this.contextMenuSetup());
    this.systemTrayEvents();
  }

  contextMenuSetup() {
    return this._trayContextMenu.buildFromTemplate([
      {
        label: 'Open',
        click: event => {
          this._mainWindow.show();
          this._mainWindow.reload();
        }
      },
      {
        label: 'Quit',
        click: event => {
          this.flags.isFromSystemTrayClose = true;
          app.quit();
        }
      }
    ]);
  }

  appEvents() {
    this._app.on('ready', event => this.mainWindowSetUp(event));
    this._app.on('window-all-closed', event => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });
  }

  mainWindowEvents() {
    this._mainWindow.on('close', event => {
      if (!this.flags.isFromSystemTrayClose) {
        event.preventDefault();
        this._mainWindow.hide();
      }
    });
  }

  ipcEvents() {
    this._ipcMain.on('getUserId', (event, arg) => {
      console.log(arg);
      if (arg && !this._activityTracker) {
        event.returnValue = true;
        this._mainWindow.maximize();
        this._activityTracker = new ActivityTracker(arg);
        this._activityTracker.start();
      }
    });
  }

  systemTrayEvents() {
    this._systemTray.on('click', event => {
      this._mainWindow.show();
      this._mainWindow.reload();
    });
  }
}