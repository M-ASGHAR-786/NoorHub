/**
 * NoorHub - Sacred Recitation Counter & Acoustic Resonance Engine
 * Core Logic File: js/counter.js
 */

(function () {
  'use strict';

  // ==========================================================================
  // 📅 TIME-LOCK & ACTIVE SESSION RESOLUTION
  // ==========================================================================

  function formatLocalYMD(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function formatBeautifulDate(dateStr) {
    if (!dateStr) return "---";
    const parts = dateStr.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const day = d.getDate();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getMonth()];
    const year = String(d.getFullYear()).slice(-2);
    
    let suffix = "th";
    if (day === 1 || day === 21 || day === 31) suffix = "st";
    else if (day === 2 || day === 22) suffix = "nd";
    else if (day === 3 || day === 23) suffix = "rd";
    
    return `${day}${suffix} ${month}, ${year}`;
  }

  const todayStr = formatLocalYMD(new Date());
  
  let activeDate = localStorage.getItem('noorhub_active_date');
  if (!activeDate) {
    activeDate = todayStr;
    localStorage.setItem('noorhub_active_date', todayStr);
  }

  if (!localStorage.getItem('noorhub_install_date')) {
    localStorage.setItem('noorhub_install_date', todayStr);
  }

  // Strictly lock down Counter modifications on any day other than today at 12:00 AM (no grace period)
  const isReadOnly = (activeDate !== todayStr);

  const focusedDateDisplay = document.getElementById('focused-date-display');
  if (focusedDateDisplay) {
    focusedDateDisplay.textContent = formatBeautifulDate(activeDate);
  }

  // Floating Pulse Warning Badge
  const historicalBanner = document.getElementById('historical-date-banner');
  const historicalValue = document.getElementById('historical-date-value');
  if (historicalBanner && historicalValue) {
    if (activeDate !== todayStr) {
      historicalValue.textContent = activeDate;
      historicalBanner.classList.remove('hidden');
      historicalBanner.classList.add('flex');
    } else {
      historicalBanner.classList.add('hidden');
      historicalBanner.classList.remove('flex');
    }
  }

  const triggerZone = document.getElementById('counter-trigger-zone');
  const resetBtn = document.getElementById('reset-counter-btn');

  if (isReadOnly) {
    if (triggerZone) {
      triggerZone.style.cursor = 'not-allowed';
      triggerZone.classList.add('opacity-80');
      const tapPrompt = document.getElementById('tap-prompt-text');
      if (tapPrompt) {
        tapPrompt.textContent = 'Session Locked';
        tapPrompt.classList.remove('group-hover:text-amber-400');
        tapPrompt.classList.add('text-red-400/80');
      }
    }
    if (resetBtn) {
      resetBtn.classList.add('opacity-20', 'pointer-events-none', 'select-none');
      resetBtn.setAttribute('disabled', 'true');
    }
  }

  // ==========================================================================
  // 🕌 DHIKR LEDGER DATABASE & ACTIVE TALLY MATRIX
  // ==========================================================================

  const DHIKR_DATABASE = [
    {
      id: "subhanallah",
      name: "SubhanAllah",
      arabic: "سُبْحَانَ اللهِ وَبِحَمْدِهِ، سُبْحَانَ اللهِ الْعَظِيمِ",
      translation: "Glory be to Allah and His is the praise, Glory be to Allah the Most Great.",
      virtue: "Virtue: Two phrases are light on the tongue, heavy on the scales of deeds, and beloved to the Most Merciful: 'SubhanAllahi wa bihamdihi, SubhanAllahil-Adheem'. [Sahih al-Bukhari 6682, Sahih Muslim 2694]"
    },
    {
      id: "lailahaillallah",
      name: "La ilaha illallah",
      arabic: "لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
      translation: "None has the right to be worshipped except Allah alone, Who has no partner. His is the sovereignty and His is the praise, and He is Able to do all things.",
      virtue: "Virtue: Reciting this 100 times in a day rewards the value of freeing ten slaves, records 100 good deeds, wipes 100 sins, and protects from Satan until evening. [Sahih al-Bukhari 3292, Sahih Muslim 2691]"
    },
    {
      id: "astaghfirullah",
      name: "Astaghfirullah",
      arabic: "أَسْتَغْفِرُ اللهَ الْعَظِيمَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ",
      translation: "I seek the forgiveness of Allah the Almighty, whom there is no deity except Him, the Ever-Living, the Sustainer, and I repent unto Him.",
      virtue: "Virtue: Whoever recites this, their sins will be forgiven even if they had fled from an advancing army (a major sin). [Sunan At-Tirmidhi 3577, Sunan Abi Dawud 1517]"
    },
    {
      id: "lahawla",
      name: "La hawla...",
      arabic: "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ",
      translation: "There is no might and no power except with Allah.",
      virtue: "Virtue: The Prophet (peace and blessings be upon him) described this phrase as a majestic treasure from among the direct treasures of Paradise. [Sahih al-Bukhari 4205, Sahih Muslim 2704]"
    },
    {
      id: "salawat",
      name: "Salawat",
      arabic: "اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ",
      translation: "O Allah, send prayers and peace upon our Prophet Muhammad.",
      virtue: "Virtue: The Prophet (peace and blessings be upon him) said: 'Whoever sends prayers upon me ten times in the morning and ten times in the evening will obtain my intercession on the Day of Resurrection'. [At-Tabarani, Sahih Al-Jami 6357]"
    }
  ];

  let activeDhikrId = localStorage.getItem('noorhub_active_dhikr') || 'subhanallah';
  let activeSessionTally = 0;

  function renderDhikrLedger() {
    const ledgerContainer = document.getElementById('dhikr-ledger-list');
    if (!ledgerContainer) return;

    ledgerContainer.innerHTML = '';
    let grandTotal = 0;

    DHIKR_DATABASE.forEach(dhikr => {
      const storageKey = `noorhub_dhikr_${activeDate}_${dhikr.id}`;
      const count = parseInt(localStorage.getItem(storageKey) || '0', 10);
      grandTotal += count;

      const row = document.createElement('div');
      
      if (dhikr.id === activeDhikrId) {
        row.className = 'bg-amber-400/10 text-amber-200 border border-amber-400/30 font-semibold shadow-md rounded-xl px-4 py-2.5 flex items-center justify-between cursor-pointer transition-all duration-300 scale-[1.02]';
      } else {
        row.className = 'hover:bg-amber-400/5 text-slate-400 border border-transparent rounded-xl px-4 py-2.5 flex items-center justify-between cursor-pointer transition-all duration-300';
      }

      row.innerHTML = `
        <span class="text-xs tracking-wider">${dhikr.name}</span>
        <span class="font-mono font-bold text-amber-400">${count}</span>
      `;

      row.addEventListener('click', () => {
        if (isSoundOn) {
          selectSound.currentTime = 0;
          selectSound.play().catch(() => {});
        }

        activeDhikrId = dhikr.id;
        localStorage.setItem('noorhub_active_dhikr', activeDhikrId);
        activeSessionTally = 0;
        
        const digitalDisplay = document.getElementById('digital-display');
        if (digitalDisplay) digitalDisplay.textContent = '0';

        renderDhikrLedger();
        updateShowcaseCard();
      });

      ledgerContainer.appendChild(row);
    });

    const grandTotalDisplay = document.getElementById('grand-total-display');
    if (grandTotalDisplay) {
      grandTotalDisplay.textContent = grandTotal;
    }
  }

  function updateCentralCounterDisplay() {
    const digitalDisplay = document.getElementById('digital-display');
    if (!digitalDisplay) return;
    digitalDisplay.textContent = activeSessionTally;
  }

  function updateShowcaseCard() {
    const arabEl = document.getElementById('dhikr-arabic');
    const transEl = document.getElementById('dhikr-translation');
    const virtEl = document.getElementById('dhikr-virtue');

    if (arabEl && transEl && virtEl) {
      const activeDhikr = DHIKR_DATABASE.find(d => d.id === activeDhikrId) || DHIKR_DATABASE[0];
      arabEl.textContent = activeDhikr.arabic;
      transEl.textContent = activeDhikr.translation;
      virtEl.textContent = activeDhikr.virtue;
    }
  }

  // ==========================================================================
  // 🔊 AUDIO RESOURCES
  // ==========================================================================

  const clickSound = new Audio('assets/audio/Click.wav');
  const selectSound = new Audio('assets/audio/Select.wav');
  
  let isSoundOn = localStorage.getItem('noorhub_sound_enabled') !== 'false';

  const navAudioBtn = document.getElementById('nav-audio-toggle-btn');
  const navAudioText = document.getElementById('nav-audio-state-text');
  const mobileAudioBtn = document.getElementById('mobile-audio-btn');
  const mobileAudioText = document.querySelector('.mobile-audio-state');

  function updateNavAudioDisplay() {
    if (navAudioText) {
      navAudioText.textContent = isSoundOn ? 'On' : 'Off';
      navAudioText.className = isSoundOn ? 'text-amber-400' : 'text-red-400';
    }
    if (mobileAudioText) {
      mobileAudioText.textContent = isSoundOn ? 'On' : 'Off';
      mobileAudioText.className = isSoundOn ? 'text-amber-400 font-bold' : 'text-red-400 font-bold';
    }
  }

  if (navAudioBtn) {
    navAudioBtn.addEventListener('click', () => {
      isSoundOn = !isSoundOn;
      localStorage.setItem('noorhub_sound_enabled', isSoundOn);
      updateNavAudioDisplay();
      
      if (isSoundOn) {
        selectSound.currentTime = 0;
        selectSound.play().catch(() => {});
      }
    });
  }

  if (mobileAudioBtn) {
    mobileAudioBtn.addEventListener('click', () => {
      isSoundOn = !isSoundOn;
      localStorage.setItem('noorhub_sound_enabled', isSoundOn);
      updateNavAudioDisplay();

      if (isSoundOn) {
        selectSound.currentTime = 0;
        selectSound.play().catch(() => {});
      }
    });
  }

  // ==========================================================================
  // 🚨 LOCKED COUNTER TOAST NOTIFICATION GENERATOR
  // ==========================================================================

  function showLockedToast() {
    const container = document.getElementById('toast-container');
    if (!container) return;

    // Clear existing toast if any
    container.innerHTML = '';

    const toast = document.createElement('div');
    toast.className = 'locked-toast flex items-center justify-between gap-3 px-4 py-3 bg-[#03140f] border border-amber-400/20 text-[#fda085] rounded-xl shadow-2xl pointer-events-auto backdrop-blur-md max-w-sm transition-all duration-300';
    toast.innerHTML = `
      <div class="flex items-center gap-2 font-sans text-xs font-semibold">
        <span>🔒</span>
        <span>Session Locked: Recitations are restricted to the current date.</span>
      </div>
      <button class="text-slate-400 hover:text-amber-400 font-bold text-sm cursor-pointer ml-2" onclick="this.parentElement.remove()">✕</button>
    `;

    container.appendChild(toast);

    // Auto remove after 2.5 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 2500);
  }

  // ==========================================================================
  // 🔢 INTERACTIVE COUNTER CLICKS & WAVE PULSING
  // ==========================================================================

  let pulseFactor = 0;

  if (triggerZone) {
    triggerZone.addEventListener('click', () => {
      if (isReadOnly) {
        // Trigger locked toast notification and selectSound
        showLockedToast();
        if (isSoundOn) {
          selectSound.currentTime = 0;
          selectSound.play().catch(() => {});
        }
        return;
      }

      pulseFactor = 22;
      activeSessionTally++;

      const ledgerKey = `noorhub_dhikr_${activeDate}_${activeDhikrId}`;
      let cumulativeCount = parseInt(localStorage.getItem(ledgerKey) || '0', 10);
      cumulativeCount++;
      localStorage.setItem(ledgerKey, cumulativeCount);

      updateCentralCounterDisplay();
      renderDhikrLedger();

      if (isSoundOn) {
        clickSound.currentTime = 0;
        clickSound.play().catch(() => {});
      }
    });
  }

  if (resetBtn && !isReadOnly) {
    resetBtn.addEventListener('click', () => {
      if (isSoundOn) {
        selectSound.currentTime = 0;
        selectSound.play().catch(() => {});
      }

      const activeCategory = DHIKR_DATABASE.find(d => d.id === activeDhikrId);
      const nameToReset = activeCategory ? activeCategory.name : "active";
      
      const isConfirmed = confirm(`Are you certain you want to reset your current active session count for ${nameToReset}? This will NOT delete your cumulative ledger record for today.`);
      if (isConfirmed) {
        activeSessionTally = 0;
        updateCentralCounterDisplay();
      }
    });
  }

  // ==========================================================================
  // 🌌 AUDIO-REACTIVE CANVAS WAVE GENERATOR
  // ==========================================================================

  const canvas = document.getElementById('audio-wave-canvas');
  let audioCtx = null;
  let analyserNode = null;
  let audioDataArray = null;
  let micStream = null;

  async function initializeMicrophone() {
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      analyserNode = audioCtx.createAnalyser();
      analyserNode.fftSize = 256;
      
      const source = audioCtx.createMediaStreamSource(micStream);
      source.connect(analyserNode);
      
      const bufferLength = analyserNode.frequencyBinCount;
      audioDataArray = new Uint8Array(bufferLength);
    } catch (err) {
      console.warn("Waveforms running in static visual drift fallback mode.");
    }
  }

  function handleContextResume() {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }
  document.body.addEventListener('click', handleContextResume, { once: true });
  document.body.addEventListener('touchstart', handleContextResume, { once: true });

  function resizeWaveCanvas() {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
  }

  let visualTime = 0;
  function renderOrganicWave() {
    requestAnimationFrame(renderOrganicWave);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    ctx.clearRect(0, 0, w, h);

    const centerX = w / 2;
    const centerY = h / 2;
    const baseRadius = Math.min(w, h) / 2 - 6;

    let volumeAverage = 0;
    let isMicActive = false;
    
    if (analyserNode && audioDataArray) {
      analyserNode.getByteFrequencyData(audioDataArray);
      let sum = 0;
      for (let i = 0; i < audioDataArray.length; i++) {
        sum += audioDataArray[i];
      }
      volumeAverage = sum / audioDataArray.length;
      isMicActive = true;
    }

    visualTime += 0.035;
    pulseFactor *= 0.93;

    ctx.beginPath();
    const steps = 180;
    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * 2 * Math.PI;
      let noise = 0;
      let voiceSpike = 0;

      if (isMicActive) {
        noise = Math.sin(angle * 6 + visualTime) * 3 + Math.cos(angle * 3 - visualTime * 1.2) * 2;
        if (volumeAverage > 1.2) {
          const freqIdx = Math.floor((i / steps) * (audioDataArray.length / 2));
          const freqVal = audioDataArray[freqIdx] || 0;
          voiceSpike = (freqVal / 255.0) * Math.max(16, volumeAverage * 0.95);
        }
      } else {
        noise = Math.sin(angle * 4 + visualTime) * 1.5;
      }

      const currentRadius = baseRadius + noise + voiceSpike + (pulseFactor * 0.4);
      const x = centerX + currentRadius * Math.cos(angle);
      const y = centerY + currentRadius * Math.sin(angle);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(226, 184, 103, 0.42)';
    ctx.lineWidth = 3.0 + (pulseFactor * 0.15); 
    ctx.stroke();

    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * 2 * Math.PI;
      let noise = 0;
      let voiceSpike = 0;

      if (isMicActive) {
        noise = Math.cos(angle * 4 - visualTime * 0.8) * 1.8;
        if (volumeAverage > 1.2) {
          const freqIdx = Math.floor((1 - (i / steps)) * (audioDataArray.length / 3));
          const freqVal = audioDataArray[freqIdx] || 0;
          voiceSpike = (freqVal / 255.0) * volumeAverage * 0.35;
        }
      } else {
        noise = Math.cos(angle * 3 - visualTime) * 1.0;
      }

      const currentRadius = (baseRadius - 14) + noise + voiceSpike - (pulseFactor * 0.15);
      const x = centerX + currentRadius * Math.cos(angle);
      const y = centerY + currentRadius * Math.sin(angle);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(253, 160, 133, 0.16)';
    ctx.lineWidth = 1.0;
    ctx.stroke();
  }

  // ==========================================================================
  // 📊 REAL-TIME TELEMETRY SYSTEM & STREAK MATRIX RULES
  // ==========================================================================

  function calculateHabitStreak() {
    let streak = 0;
    let checkDate = new Date();
    const userGender = localStorage.getItem('noorhub_user_gender') || 'woman';
    
    while (true) {
      const dateStr = formatLocalYMD(checkDate);
      const habits = JSON.parse(localStorage.getItem('noorhub_habits_' + dateStr)) || [];
      const prayers = JSON.parse(localStorage.getItem('noorhub_prayers_' + dateStr)) || {};
      
      let prayerCount = 0;
      if (typeof prayers === 'object' && prayers !== null) {
        const genderBlock = prayers[userGender] || prayers['woman'] || prayers['man'];
        if (genderBlock && typeof genderBlock === 'object') {
          Object.values(genderBlock).forEach(p => {
            if (p && typeof p === 'object') {
              if (p.offered) prayerCount++;
            }
          });
        }
      }
      
      const targetRequiredPrayers = isFriday(dateStr) ? 6 : 5;
      const totalAccomplished = habits.length;

      if (totalAccomplished >= 6 && prayerCount === targetRequiredPrayers) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        if (dateStr === todayStr) {
          checkDate.setDate(checkDate.getDate() - 1);
          continue;
        }
        break;
      }
    }
    return streak;
  }

  function syncTelemetryMetrics() {
    const statActsDone = document.getElementById('stat-acts-done');
    const statStreakDays = document.getElementById('stat-streak-days');

    if (statActsDone) {
      const habitsList = JSON.parse(localStorage.getItem('noorhub_habits_' + activeDate)) || [];
      statActsDone.textContent = `${habitsList.length}/15`;
    }

    if (statStreakDays) {
      const streakValue = calculateHabitStreak();
      statStreakDays.textContent = `${streakValue} day${streakValue !== 1 ? 's' : ''}`;
    }
  }

  // ==========================================================================
  // 📊 INTERACTIVE TELEMETRY MODAL BINDER
  // ==========================================================================

  const telemetryCard = document.getElementById('telemetry-card');
  const telemetryModal = document.getElementById('telemetry-modal');
  const telemetryClose = document.getElementById('telemetry-modal-close');
  const telemetryOk = document.getElementById('telemetry-modal-ok');

  if (telemetryCard && telemetryModal) {
    telemetryCard.addEventListener('click', () => {
      if (isSoundOn) {
        selectSound.currentTime = 0;
        selectSound.play().catch(() => {});
      }
      telemetryModal.classList.remove('hidden');
    });
  }

  function closeTelemetryModal() {
    if (isSoundOn) {
      selectSound.currentTime = 0;
      selectSound.play().catch(() => {});
    }
    if (telemetryModal) {
      telemetryModal.classList.add('hidden');
    }
  }

  if (telemetryClose) telemetryClose.addEventListener('click', closeTelemetryModal);
  if (telemetryOk) telemetryOk.addEventListener('click', closeTelemetryModal);

  // ==========================================================================
  // 🍔 RESPONSIVE NAVBAR HAMBURGER NAVIGATION TOGGLE
  // ==========================================================================

  const mobileBtn = document.getElementById('mobile-menu-btn');
  const mobileContent = document.getElementById('mobile-menu-content');

  if (mobileBtn && mobileContent) {
    mobileBtn.addEventListener('click', () => {
      if (isSoundOn) {
        selectSound.currentTime = 0;
        selectSound.play().catch(() => {});
      }
      mobileContent.classList.toggle('hidden');
    });
  }

  // ==========================================================================
  // 📚 GUIDE OVERLAY MODAL TRIGGERS
  // ==========================================================================

  const guideModal = document.getElementById('guide-modal');
  const navGuideBtn = document.getElementById('nav-guide-btn');
  const mobileGuideBtn = document.getElementById('mobile-guide-btn');
  const guideCloseBtn = document.getElementById('guide-close-btn');
  const guideOkBtn = document.getElementById('guide-ok-btn');

  function openGuideModal() {
    if (isSoundOn) {
      selectSound.currentTime = 0;
      selectSound.play().catch(() => {});
    }
    if (guideModal) guideModal.classList.remove('hidden');
  }

  function closeGuideModal() {
    if (isSoundOn) {
      selectSound.currentTime = 0;
      selectSound.play().catch(() => {});
    }
    if (guideModal) guideModal.classList.add('hidden');
  }

  if (navGuideBtn) navGuideBtn.addEventListener('click', openGuideModal);
  if (mobileGuideBtn) mobileGuideBtn.addEventListener('click', openGuideModal);
  if (guideCloseBtn) guideCloseBtn.addEventListener('click', closeGuideModal);
  if (guideOkBtn) guideOkBtn.addEventListener('click', closeGuideModal);

  // ==========================================================================
  // 👥 FELLOWS CREDITS TOGGLE
  // ==========================================================================

  const fellowsBtn = document.getElementById('fellows-toggle-btn');
  const fellowsList = document.getElementById('fellows-list');

  if (fellowsBtn && fellowsList) {
    fellowsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (isSoundOn) {
        selectSound.currentTime = 0;
        selectSound.play().catch(() => {});
      }
      fellowsList.classList.toggle('hidden');
    });
  }

  // ==========================================================================
  // 📉 SCROLL-RESPONSIVE BOUNCY NAVBAR BEHAVIOR WITH SMOOTH PAGE SHIFT
  // ==========================================================================

  let lastScrollTop = 0;
  const navbar = document.querySelector('nav');

  if (navbar) {
    window.addEventListener('scroll', () => {
      let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      if (scrollTop > lastScrollTop && scrollTop > 90) {
        navbar.style.transform = 'translateY(-150%)';
      } else {
        navbar.style.transform = 'translateY(0)';
      }
      lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    }, { passive: true });
  }

  // Handle smooth out-transitions before page shifts to prevent hard cuts
  const localLinks = document.querySelectorAll('a[href]');
  localLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const targetUrl = link.getAttribute('href');
      if (targetUrl && !targetUrl.startsWith('http') && !targetUrl.startsWith('#')) {
        e.preventDefault();
        
        if (isSoundOn) {
          selectSound.currentTime = 0;
          selectSound.play().catch(() => {});
        }
        
        document.body.classList.remove('fade-in');
        
        setTimeout(() => {
          window.location.href = targetUrl;
        }, 220); // matching body fade transition opacity (0.22s)
      }
    });
  });

  // ==========================================================================
  // INITIALIZATION HANDLERS
  // ==========================================================================

  window.addEventListener('DOMContentLoaded', () => {
    updateCentralCounterDisplay();
    renderDhikrLedger();
    updateShowcaseCard();
    updateNavAudioDisplay();
    
    if (canvas) {
      resizeWaveCanvas();
      window.addEventListener('resize', resizeWaveCanvas);
      initializeMicrophone();
      renderOrganicWave();
    }
    syncTelemetryMetrics();
  });

})();