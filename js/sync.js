/**
 * NoorHub - Shared PWA Real-Time Sync & "Sync Devices" Modal Engine
 * Core Logic File: js/sync.js
 */

const NoorSyncEngine = (function () {
  'use strict';

  // ==========================================================================
  // ⚙️ FREE-TIER FIREBASE DATABASE CONFIGURATIONS
  // ==========================================================================
  const firebaseConfig = {
    apiKey: "AIzaSyAqMNNziR6bvIatoGSJ8S27FNEEQNLgvs4",
    authDomain: "noorhub-22737.firebaseapp.com",
    databaseURL: "https://noorhub-22737-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "noorhub-22737",
    storageBucket: "noorhub-22737.firebasestorage.app",
    messagingSenderId: "621957088941",
    appId: "1:621957088941:web:8f7040fcbe623eba02e824"
  };

  let db = null;
  let isSoundOn = localStorage.getItem('noorhub_sound_enabled') !== 'false';
  const selectSound = new Audio('assets/audio/Select.wav');

  // Initialize Firebase (only if config is filled)
  if (typeof firebase !== 'undefined' && firebaseConfig.apiKey !== "YOUR_API_KEY") {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
  }

  // ==========================================================================
  // 👤 LOCAL DEVICE IDENTITY GENERATION
  // ==========================================================================

  let localDeviceId = localStorage.getItem('noorhub_device_id');
  if (!localDeviceId) {
    localDeviceId = 'DEV-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    localStorage.setItem('noorhub_device_id', localDeviceId);
  }

  let localDeviceName = localStorage.getItem('noorhub_device_name') || 'Web Browser';

  // ==========================================================================
  // 🛡️ DEVICE TRUST & AUTHORIZATION ALGORITHMS
  // ==========================================================================

  async function checkDeviceAuthorization(masterKey, deviceId) {
    if (!db) return false;
    try {
      const snapshot = await db.ref(`sync-keys/${masterKey}/authorized_devices/${deviceId}`).once('value');
      const deviceData = snapshot.val();
      return (deviceData && deviceData.active === true);
    } catch (e) {
      console.error("Device Trust Check Failed:", e);
      return false;
    }
  }

  async function registerDevice(masterKey, deviceName) {
    if (!db) return false;
    try {
      await db.ref(`sync-keys/${masterKey}/authorized_devices/${localDeviceId}`).set({
        name: deviceName || localDeviceName,
        active: true,
        last_sync: new Date().toISOString()
      });
      localStorage.setItem('noorhub_sync_key', masterKey);
      localStorage.setItem('noorhub_device_name', deviceName || localDeviceName);
      return true;
    } catch (e) {
      console.error("Device Registration Failed:", e);
      return false;
    }
  }

  async function revokeDevice(masterKey, targetDeviceId) {
    if (!db) return false;
    try {
      await db.ref(`sync-keys/${masterKey}/authorized_devices/${targetDeviceId}/active`).set(false);
      return true;
    } catch (e) {
      console.error("Device Revocation Failed:", e);
      return false;
    }
  }

  // ==========================================================================
  // 📁 EPHEMERAL "SELF-DELETING" MAILBOX SYNCHRONIZATION
  // ==========================================================================

  async function pushToMailbox() {
    const masterKey = localStorage.getItem('noorhub_sync_key');
    if (!masterKey || !db) return false;

    const isAuthorized = await checkDeviceAuthorization(masterKey, localDeviceId);
    if (!isAuthorized) {
      console.warn("Upload Blocked: Device is not authorized.");
      return false;
    }

    try {
      const localDataPayload = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('noorhub_') && key !== 'noorhub_sync_key' && key !== 'noorhub_device_id' && key !== 'noorhub_device_name') {
          localDataPayload[key] = localStorage.getItem(key);
        }
      }

      await db.ref(`sync-keys/${masterKey}/mailbox`).set({
        sender_device_id: localDeviceId,
        payload: JSON.stringify(localDataPayload),
        timestamp: new Date().toISOString()
      });

      await db.ref(`sync-keys/${masterKey}/authorized_devices/${localDeviceId}/last_sync`).set(new Date().toISOString());
      return true;
    } catch (e) {
      console.error("Mailbox Upload Failed:", e);
      return false;
    }
  }

  async function fetchFromMailbox() {
    const masterKey = localStorage.getItem('noorhub_sync_key');
    if (!masterKey || !db) return false;

    const isAuthorized = await checkDeviceAuthorization(masterKey, localDeviceId);
    if (!isAuthorized) {
      console.warn("Fetch Blocked: Device is not authorized.");
      localStorage.removeItem('noorhub_sync_key');
      return false;
    }

    try {
      const snapshot = await db.ref(`sync-keys/${masterKey}/mailbox`).once('value');
      const mailboxData = snapshot.val();

      if (!mailboxData || !mailboxData.payload) {
        return false;
      }

      if (mailboxData.sender_device_id === localDeviceId) {
        return false;
      }

      const receivedPayload = JSON.parse(mailboxData.payload);
      Object.keys(receivedPayload).forEach(key => {
        localStorage.setItem(key, receivedPayload[key]);
      });

      await db.ref(`sync-keys/${masterKey}/mailbox`).remove();
      await db.ref(`sync-keys/${masterKey}/authorized_devices/${localDeviceId}/last_sync`).set(new Date().toISOString());
      return true;
    } catch (e) {
      console.error("Mailbox Sync & Self-Deletion Failed:", e);
      return false;
    }
  }

  // ==========================================================================
  // 🔄 UI CONTROLLER & MODAL EVENT BINDINGS (GLOBAL)
  // ==========================================================================

  function playUIAudio() {
    isSoundOn = localStorage.getItem('noorhub_sound_enabled') !== 'false';
    if (isSoundOn) {
      selectSound.currentTime = 0;
      selectSound.play().catch(() => {});
    }
  }

  function openSyncModal() {
    playUIAudio();
    const syncModal = document.getElementById('sync-modal');
    if (syncModal) {
      syncModal.classList.remove('hidden');
      renderSyncModalState();
    }
  }

  function closeSyncModal() {
    playUIAudio();
    const syncModal = document.getElementById('sync-modal');
    if (syncModal) syncModal.classList.add('hidden');
  }

  function renderSyncModalState() {
    const onboardingState = document.getElementById('sync-state-onboarding');
    const activeState = document.getElementById('sync-state-active');
    const syncKey = localStorage.getItem('noorhub_sync_key');

    if (!syncKey) {
      if (onboardingState) onboardingState.classList.remove('hidden');
      if (activeState) activeState.classList.add('hidden');
    } else {
      if (onboardingState) onboardingState.classList.add('hidden');
      if (activeState) activeState.classList.remove('hidden');
      
      const displayKeyEl = document.getElementById('display-active-sync-key');
      if (displayKeyEl) displayKeyEl.textContent = syncKey;

      loadAuthorizedDevices();
    }
  }

  function loadAuthorizedDevices() {
    const devicesContainer = document.getElementById('sync-devices-list');
    const syncKey = localStorage.getItem('noorhub_sync_key');
    if (!devicesContainer || !syncKey || !db) return;

    devicesContainer.innerHTML = '<div class="text-slate-500 text-[10px] py-2">Loading authorized devices...</div>';

    db.ref(`sync-keys/${syncKey}/authorized_devices`).once('value').then(snapshot => {
      devicesContainer.innerHTML = '';
      const devices = snapshot.val();
      if (!devices) return;

      Object.keys(devices).forEach(deviceId => {
        const dev = devices[deviceId];
        const isLocal = deviceId === localDeviceId;
        
        const row = document.createElement('div');
        row.className = 'flex items-center justify-between p-2.5 bg-black/30 border border-amber-400/5 rounded-lg text-xs';
        
        const nameCol = `
          <div class="flex flex-col text-left">
            <span class="font-medium text-slate-300">${dev.name} ${isLocal ? '<span class="text-[8px] text-amber-400 font-sans ml-1">(This Device)</span>' : ''}</span>
            <span class="text-[8px] text-slate-500 font-mono">${deviceId}</span>
          </div>
        `;

        const actionCol = document.createElement('div');
        if (!dev.active) {
          actionCol.innerHTML = '<span class="text-[9px] uppercase tracking-widest text-red-500 font-bold bg-red-955/20 px-2 py-0.5 rounded border border-red-500/10 font-sans">Blocked</span>';
        } else if (isLocal) {
          actionCol.innerHTML = '<span class="text-[9px] uppercase tracking-widest text-emerald-400 font-bold bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-500/10 font-sans">Active</span>';
        } else {
          const blockBtn = document.createElement('button');
          blockBtn.className = 'text-[9px] uppercase font-sans font-bold text-red-400 hover:text-red-300 cursor-pointer focus:outline-none';
          blockBtn.textContent = 'Block';
          blockBtn.addEventListener('click', () => {
            const confirmed = confirm(`Are you sure you want to block and revoke access for "${dev.name}"? They will instantly be locked out of syncing.`);
            if (confirmed) {
              revokeDevice(syncKey, deviceId).then(success => {
                if (success) {
                  loadAuthorizedDevices();
                }
              });
            }
          });
          actionCol.appendChild(blockBtn);
        }

        row.innerHTML = nameCol;
        row.appendChild(actionCol);
        devicesContainer.appendChild(row);
      });
    });
  }

  // ==========================================================================
  // 🔌 BIND GLOBAL NAVIGATION & CLICK EVENT LISTENERS
  // ==========================================================================

  document.addEventListener('DOMContentLoaded', () => {
    const navSyncBtn = document.getElementById('nav-sync-btn');
    const mobileSyncBtn = document.getElementById('mobile-sync-btn');
    const syncModalClose = document.getElementById('sync-modal-close');

    if (navSyncBtn) navSyncBtn.addEventListener('click', openSyncModal);
    if (mobileSyncBtn) mobileSyncBtn.addEventListener('click', openSyncModal);
    if (syncModalClose) syncModalClose.addEventListener('click', closeSyncModal);

    const generateSyncKeyBtn = document.getElementById('generate-sync-key-btn');
    const showLinkInputBtn = document.getElementById('show-link-input-btn');
    const submitLinkDeviceBtn = document.getElementById('submit-link-device-btn');
    const copySyncKeyBtn = document.getElementById('copy-sync-key-btn');
    const disconnectSyncBtn = document.getElementById('disconnect-sync-btn');
    const nicknameInput = document.getElementById('sync-device-nickname');
    const existingKeyInput = document.getElementById('existing-sync-key-input');
    const linkKeyContainer = document.getElementById('link-key-input-container');

    if (generateSyncKeyBtn) {
      generateSyncKeyBtn.addEventListener('click', () => {
        const nickname = nicknameInput.value.trim() || 'My Device';
        const generatedKey = 'NH-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();

        registerDevice(generatedKey, nickname).then(success => {
          if (success) {
            pushToMailbox();
            renderSyncModalState();
          } else {
            alert("Could not initialize Sync Key. Please check your internet connection.");
          }
        });
      });
    }

    if (showLinkInputBtn && linkKeyContainer) {
      showLinkInputBtn.addEventListener('click', () => {
        linkKeyContainer.classList.toggle('hidden');
      });
    }

    if (submitLinkDeviceBtn && existingKeyInput) {
      submitLinkDeviceBtn.addEventListener('click', () => {
        const targetKey = existingKeyInput.value.trim().toUpperCase();
        const nickname = nicknameInput.value.trim() || 'Linked Device';

        if (!targetKey) {
          alert("Please enter a valid 8-character Master Key.");
          return;
        }

        registerDevice(targetKey, nickname).then(success => {
          if (success) {
            fetchFromMailbox().then(updated => {
              if (updated) {
                alert("Link Connection Successful! Your local logs are now completely synchronized.");
                window.location.reload();
              } else {
                alert("Linked successfully! This device is now authorized inside the Trust Center.");
                renderSyncModalState();
              }
            });
          } else {
            alert("Linking failed. Please check your Master Sync Key and internet connection.");
          }
        });
      });
    }

    if (copySyncKeyBtn) {
      copySyncKeyBtn.addEventListener('click', () => {
        const syncKey = localStorage.getItem('noorhub_sync_key');
        if (syncKey) {
          navigator.clipboard.writeText(syncKey).then(() => {
            copySyncKeyBtn.textContent = 'Copied!';
            setTimeout(() => { copySyncKeyBtn.textContent = 'Copy'; }, 1500);
          });
        }
      });
    }

    if (disconnectSyncBtn) {
      disconnectSyncBtn.addEventListener('click', () => {
        const confirmed = confirm("Are you certain you want to disconnect sync on this device? This will erase the sync key link but preserve all your tracking data on this device.");
        if (confirmed) {
          localStorage.removeItem('noorhub_sync_key');
          renderSyncModalState();
          window.location.reload();
        }
      });
    }

    if (localStorage.getItem('noorhub_sync_key')) {
      setInterval(() => {
        fetchFromMailbox().then(updated => {
          if (updated) {
            window.location.reload();
          }
        });
      }, 10000);

      // Listen for window online events to instantly push offline-modified logs
      window.addEventListener('online', () => {
        pushToMailbox();
      });
    }
  });

  return {
    localDeviceId: localDeviceId,
    localDeviceName: localDeviceName,
    registerDevice: registerDevice,
    revokeDevice: revokeDevice,
    pushToMailbox: pushToMailbox,
    fetchFromMailbox: fetchFromMailbox,
    checkDeviceAuthorization: checkDeviceAuthorization
  };

})();