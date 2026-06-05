const { app, BrowserWindow, dialog } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

// Prevent EPIPE broken pipe crashes in Windows GUI mode
if (app.isPackaged) {
  console.log = () => {};
  console.error = () => {};
}

let mainWindow;
let pythonProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    autoHideMenuBar: true,
    show: false, // Don't show until server is ready
    icon: path.join(__dirname, 'public', 'Sasi.ai_favicon.jpg'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
  });

  // Check if the backend is ready before showing the window
  checkServer();
}

function checkServer() {
  console.log("Checking if backend server is up at http://127.0.0.1:8000/ ...");
  
  const req = http.get('http://127.0.0.1:8000/', (res) => {
    // If we get a response, the server is ready!
    console.log("Backend server is ready!");
    mainWindow.loadURL('http://127.0.0.1:8000/login');
    mainWindow.show();
  });

  req.on('error', (err) => {
    // Server not ready yet, wait 1 second and try again
    setTimeout(checkServer, 1000);
  });
}

app.whenReady().then(() => {
  console.log("Electron app ready, starting Python backend...");
  
  // Find the PyInstaller executable based on whether we are in dev or prod
  let backendPath;
  if (app.isPackaged) {
    // In production, the executable is bundled in the resources folder
    backendPath = path.join(process.resourcesPath, 'VoiceDoc', 'VoiceDoc.exe');
  } else {
    // In development, the executable is in the dist folder
    backendPath = path.join(__dirname, '..', 'dist', 'VoiceDoc', 'VoiceDoc.exe');
  }
  
  console.log(`Launching backend from: ${backendPath}`);
  
  try {
    pythonProcess = spawn(backendPath, [], { detached: false, windowsHide: true });
    
    pythonProcess.stdout.on('data', (data) => {
      console.log(`Backend stdout: ${data}`);
    });
    
    pythonProcess.stderr.on('data', (data) => {
      console.error(`Backend stderr: ${data}`);
    });
    
    pythonProcess.on('close', (code) => {
      console.log(`Backend process exited with code ${code}`);
    });
    
    pythonProcess.on('error', (err) => {
      console.error(`Failed to start backend process: ${err}`);
      dialog.showErrorBox('Backend Error', `Failed to start the AI backend engine. Please ensure VoiceDoc.exe exists at ${backendPath}\n\nError: ${err.message}`);
    });
  } catch (err) {
    console.error("Spawn exception:", err);
    dialog.showErrorBox('Critical Error', `Failed to start VoiceDoc.exe: ${err}`);
  }

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  console.log("All windows closed, cleaning up...");
  if (pythonProcess) {
    console.log("Killing Python background process...");
    pythonProcess.kill();
  }
  if (process.platform !== 'darwin') app.quit();
});
