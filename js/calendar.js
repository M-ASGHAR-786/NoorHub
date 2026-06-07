/**
 * NoorHub - Spiritual Planner, Prayer Syncing & Qaza Ledger Engine
 * Core Logic File: js/calendar.js
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

  // Formats modern dates into: "Jun 28"
  function formatModernDateShort(date) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = date.getDate();
    const month = months[date.getMonth()];
    return `${month} ${day}`;
  }

  // Grace Period: Locks modifications on days earlier than yesterday (24-hour limit)
  function checkIsReadOnly(activeStr, todayStr) {
    if (!activeStr || !todayStr) return false;
    const activeParts = activeStr.split('-').map(Number);
    const todayParts = todayStr.split('-').map(Number);
    
    const activeObj = new Date(activeParts[0], activeParts[1] - 1, activeParts[2]);
    const todayObj = new Date(todayParts[0], todayParts[1] - 1, todayParts[2]);
    
    const diffTime = todayObj - activeObj;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays >= 2 || diffDays < 0) {
      return true;
    }
    return false;
  }

  // Helper to determine Friday
  function isFriday(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.getDay() === 5;
  }

  const todayStr = formatLocalYMD(new Date());

  // Setup testing fallback: set installDate to the 1st day of the current month
  // so that previous days are unlocked and selectable even after clearing site data.
  let installDateStr = localStorage.getItem('noorhub_install_date');
  if (!installDateStr) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    installDateStr = `${year}-${month}-01`;
    localStorage.setItem('noorhub_install_date', installDateStr);
  }

  const installDate = new Date(installDateStr + 'T00:00:00');
  const installYear = installDate.getFullYear();

  let activeDate = localStorage.getItem('noorhub_active_date');
  if (!activeDate) {
    activeDate = todayStr;
    localStorage.setItem('noorhub_active_date', todayStr);
  }

  let isReadOnly = checkIsReadOnly(activeDate, todayStr);

  // Sync state warning badge
  const warningBanner = document.getElementById('historical-date-banner');
  const warningValue = document.getElementById('historical-date-value');
  function updateHistoricalBanner() {
    if (warningBanner && warningValue) {
      if (activeDate !== todayStr) {
        warningValue.textContent = activeDate;
        warningBanner.classList.remove('hidden');
        warningBanner.classList.add('flex');
      } else {
        warningBanner.classList.add('hidden');
        warningBanner.classList.remove('flex');
      }
    }
  }

  // ==========================================================================
  // 🔊 AUDIO RESOURCES
  // ==========================================================================

  const selectSound = new Audio('assets/audio/Select.wav');
  const completeSound = new Audio('assets/audio/Complete.mp3');
  
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
  // 📆 CALENDAR ENGINE & COLOR-GRADING GRID (YEAR LIMIT BOUNDARIES INCLUDED)
  // ==========================================================================

  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const activeSessionDateObj = new Date(activeDate + 'T00:00:00');
  let viewMonth = activeSessionDateObj.getMonth();
  let viewYear = activeSessionDateObj.getFullYear();

  const prevMonthBtn = document.getElementById('prev-month-btn');
  const nextMonthBtn = document.getElementById('next-month-btn');
  const monthYearDisplay = document.getElementById('month-year-display');
  const calendarGrid = document.getElementById('calendar-grid');

  function generateCalendarGrid() {
    if (!calendarGrid || !monthYearDisplay) return;

    calendarGrid.innerHTML = '';
    monthYearDisplay.textContent = `${MONTH_NAMES[viewMonth]} ${viewYear}`;

    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const totalMonthDays = new Date(viewYear, viewMonth + 1, 0).getDate();

    evaluateNavigationBoundaries();

    for (let i = 0; i < firstDayIndex; i++) {
      const filler = document.createElement('div');
      filler.className = 'w-full h-12 md:h-14 opacity-10 bg-[#03140f]/10 rounded-lg';
      calendarGrid.appendChild(filler);
    }

    for (let day = 1; day <= totalMonthDays; day++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const cellMS = new Date(dateStr + 'T00:00:00').getTime();

      const dayCard = document.createElement('div');
      dayCard.className = 'w-full h-12 md:h-14 flex flex-col justify-between p-2 rounded-xl text-xs font-semibold cursor-pointer select-none transition-all duration-300 relative';
      dayCard.innerHTML = `<span class="text-[10px] text-slate-400">${day}</span>`;

      const isFuture = cellMS > new Date(todayStr + 'T00:00:00').getTime();

      if (isFuture) {
        dayCard.classList.add('day-locked');
      } else {
        const habitsList = JSON.parse(localStorage.getItem(`noorhub_habits_${dateStr}`)) || [];
        const completedCount = habitsList.length;

        if (completedCount === 15) {
          dayCard.className += ' bg-amber-400/20 border border-amber-400/40 text-amber-300 hover:bg-amber-400/30';
          dayCard.innerHTML += `<span class="absolute bottom-1 right-2 text-[8px] animate-pulse">🟡</span>`;
        } else if (completedCount >= 12) {
          dayCard.className += ' bg-emerald-955/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-955/30';
          dayCard.innerHTML += `<span class="absolute bottom-1 right-2 text-[8px]">🟢</span>`;
        } else if (completedCount >= 6) {
          dayCard.className += ' bg-amber-955/20 border border-amber-500/40 text-amber-300 hover:bg-amber-955/30';
          dayCard.innerHTML += `<span class="absolute bottom-1 right-2 text-[8px]">🟠</span>`;
        } else {
          dayCard.className += ' bg-red-955/20 border border-red-500/20 text-red-350 hover:bg-red-955/30';
          dayCard.innerHTML += `<span class="absolute bottom-1 right-2 text-[8px]">🔴</span>`;
        }

        // Differentiate editable days vs read-only older days
        const isDayReadOnly = checkIsReadOnly(dateStr, todayStr);
        if (isDayReadOnly) {
          dayCard.classList.add('day-read-only');
        } else {
          dayCard.classList.add('day-editable');
        }

        if (dateStr === activeDate) {
          dayCard.className += ' ring-2 ring-amber-400 ring-offset-2 ring-offset-[#010f0b] scale-[1.03] z-10';
        }

        dayCard.addEventListener('click', () => {
          activeDate = dateStr;
          isReadOnly = checkIsReadOnly(activeDate, todayStr);
          localStorage.setItem('noorhub_active_date', activeDate);
          
          if (isSoundOn) {
            selectSound.currentTime = 0;
            selectSound.play().catch(() => {});
          }

          updateHistoricalBanner();
          renderPrayerTrackerConsole();
          renderQazaLedger();
          loadNoteInput();
          generateCalendarGrid();
        });

        dayCard.addEventListener('dblclick', () => {
          chronoLockSynchronizeSession(dateStr);
        });
      }

      calendarGrid.appendChild(dayCard);
    }

    // Refresh dynamic consistency analytics
    renderMonthlyDevotionAnalytics();
  }

  function evaluateNavigationBoundaries() {
    const realCurrentYear = new Date().getFullYear();

    // Symmetrical visual feedback for past boundary (January of installation year)
    if (viewYear <= installYear && viewMonth === 0) {
      prevMonthBtn.classList.add('opacity-40');
    } else {
      prevMonthBtn.classList.remove('opacity-40', 'pointer-events-none', 'opacity-20');
    }

    // Symmetrical visual feedback for future boundary (December of the current calendar year)
    if (viewYear >= realCurrentYear && viewMonth === 11) {
      nextMonthBtn.classList.add('opacity-40');
    } else {
      nextMonthBtn.classList.remove('opacity-40', 'pointer-events-none', 'opacity-20');
    }
  }

  // Polite modal alerts
  function triggerFutureYearWarningModal() {
    if (isSoundOn) {
      selectSound.currentTime = 0;
      selectSound.play().catch(() => {});
    }

    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[105] flex items-center justify-center bg-black/85 backdrop-blur-md transition-all duration-300';
    overlay.innerHTML = `
      <div class="glass-card p-6 max-w-sm text-center border border-amber-400/20 shadow-2xl font-sans">
        <span class="text-3xl mb-3 block animate-pulse">⏳</span>
        <h3 class="luxury-serif text-amber-400 text-sm font-bold tracking-widest uppercase mb-2">Sacred Focus</h3>
        <p class="text-slate-300 text-[11px] leading-relaxed mb-4">
          Dear believer, the future is written by the divine alone. Let us focus our hearts and actions on the blessings of the current year instead of looking prematurely into what is to come.
        </p>
        <button id="modal-future-ok-btn" class="px-5 py-2 bg-amber-400/10 text-amber-400 text-[10px] uppercase font-bold rounded-lg border border-amber-400/25 cursor-pointer w-full">
          Acknowledge with Focus
        </button>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('#modal-future-ok-btn').addEventListener('click', () => {
      if (isSoundOn) {
        selectSound.currentTime = 0;
        selectSound.play().catch(() => {});
      }
      document.body.removeChild(overlay);
    });
  }

  function triggerPastYearWarningModal() {
    if (isSoundOn) {
      selectSound.currentTime = 0;
      selectSound.play().catch(() => {});
    }

    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[105] flex items-center justify-center bg-black/85 backdrop-blur-md transition-all duration-300 font-sans';
    overlay.innerHTML = `
      <div class="glass-card p-6 max-w-sm text-center border border-amber-400/20 shadow-2xl font-sans">
        <span class="text-3xl mb-3 block animate-pulse">⏳</span>
        <h3 class="luxury-serif text-amber-400 text-sm font-bold tracking-widest uppercase mb-2">Sacred Beginnings</h3>
        <p class="text-slate-300 text-[11px] leading-relaxed mb-4">
          Dear believer, the past is already sealed in the divine grace of the Creator. Let us focus our hearts and actions on the blessings of the current year, instead of looking back at the past. Begin Your Journey Here!
        </p>
        <button id="modal-past-ok-btn" class="px-5 py-2 bg-amber-400/10 text-amber-400 text-[10px] uppercase font-bold rounded-lg border border-amber-400/25 cursor-pointer w-full">
          Acknowledge with Focus
        </button>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('#modal-past-ok-btn').addEventListener('click', () => {
      if (isSoundOn) {
        selectSound.currentTime = 0;
        selectSound.play().catch(() => {});
      }
      document.body.removeChild(overlay);
    });
  }

  function chronoLockSynchronizeSession(targetDate) {
    if (isSoundOn) {
      selectSound.currentTime = 0;
      selectSound.play().catch(() => {});
    }

    localStorage.setItem('noorhub_active_date', targetDate);

    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md transition-all duration-300';
    overlay.innerHTML = `
      <div class="glass-card p-8 max-w-sm text-center border border-amber-400/20 shadow-2xl scale-95 transition-transform duration-300">
        <span class="text-4xl mb-4 block animate-bounce">⏳</span>
        <h3 class="luxury-serif text-amber-400 text-sm font-bold tracking-widest uppercase mb-2">Chrono-Lock Sync</h3>
        <p class="text-slate-300 text-xs font-light">Session synchronized to <span class="font-mono text-amber-200">${targetDate}</span></p>
      </div>
    `;
    document.body.appendChild(overlay);

    setTimeout(() => {
      window.location.reload();
    }, 1200);
  }

  if (prevMonthBtn) {
    prevMonthBtn.addEventListener('click', () => {
      let targetMonth = viewMonth - 1;
      let targetYear = viewYear;
      if (targetMonth < 0) {
        targetMonth = 11;
        targetYear--;
      }

      // Block navigation older than installation start year
      if (targetYear < installYear) {
        triggerPastYearWarningModal();
        return;
      }

      viewMonth = targetMonth;
      viewYear = targetYear;
      generateCalendarGrid();
      
      if (isSoundOn) {
        selectSound.currentTime = 0;
        selectSound.play().catch(() => {});
      }
    });
  }

  if (nextMonthBtn) {
    nextMonthBtn.addEventListener('click', () => {
      const realToday = new Date();
      const realCurrentYear = realToday.getFullYear();

      let targetMonth = viewMonth + 1;
      let targetYear = viewYear;
      if (targetMonth > 11) {
        targetMonth = 0;
        targetYear++;
      }

      // Block navigation beyond the current calendar year in the real world
      if (targetYear > realCurrentYear) {
        triggerFutureYearWarningModal();
        return;
      }

      viewMonth = targetMonth;
      viewYear = targetYear;
      generateCalendarGrid();

      if (isSoundOn) {
        selectSound.currentTime = 0;
        selectSound.play().catch(() => {});
      }
    });
  }

  // ==========================================================================
  // 🕌 ADAPTIVE GENDER & FRIDAY PRAYER TRACKER (FRIDAY LOCKOUT IMPLEMENTED)
  // ==========================================================================

  let userGender = localStorage.getItem('noorhub_user_gender') || 'woman';

  const defaultPrayerData = {
    man: {
      fajr: { offered: false, withImam: false },
      dhuhr: { offered: false, withImam: false },
      jumma: { offered: false, withImam: false },
      asr: { offered: false, withImam: false },
      maghrib: { offered: false, withImam: false },
      isha: { offered: false, withImam: false }
    },
    woman: {
      fajr: { offered: false, withImam: false },
      dhuhr: { offered: false, withImam: false },
      jumma: { offered: false, withImam: false },
      asr: { offered: false, withImam: false },
      maghrib: { offered: false, withImam: false },
      isha: { offered: false, withImam: false }
    }
  };

  const genderToggleBtn = document.getElementById('gender-toggle-btn');
  const genderToggleText = document.getElementById('gender-toggle-text');
  const prayerMatrixContainer = document.getElementById('prayer-matrix-container');
  const trackerDateLabel = document.getElementById('prayer-tracker-date');

  function handleGenderToggle() {
    if (isReadOnly) return;

    const targetGender = userGender === 'woman' ? 'man' : 'woman';
    const prayerStorageKey = `noorhub_prayers_${activeDate}`;
    let activeDatePrayerData = JSON.parse(localStorage.getItem(prayerStorageKey)) || defaultPrayerData;

    // Show overwrite alert dialog exactly ONCE upon button switch
    if (hasRecordedPrayers(userGender, activeDatePrayerData)) {
      const confirmed = confirm(
        `⚠️ Warning:\nYou have recorded prayer logs in ${userGender.toUpperCase()} mode for this day.\n\nSwitching to ${targetGender.toUpperCase()} mode now will permanently delete and overwrite previous prayer records of the other gender.\n\nDo you wish to proceed?`
      );
      if (!confirmed) {
        return; // Halt switch toggle
      }
      // Clean and erase other gender data on confirm
      activeDatePrayerData[userGender] = JSON.parse(JSON.stringify(defaultPrayerData[userGender]));
      localStorage.setItem(prayerStorageKey, JSON.stringify(activeDatePrayerData));
    }

    if (isSoundOn) {
      selectSound.currentTime = 0;
      selectSound.play().catch(() => {});
    }

    userGender = targetGender;
    localStorage.setItem('noorhub_user_gender', userGender);
    renderPrayerTrackerConsole();
  }

  if (genderToggleBtn) {
    genderToggleBtn.addEventListener('click', handleGenderToggle);
  }

  function hasRecordedPrayers(gender, pData) {
    const block = pData[gender];
    if (!block) return false;
    return Object.values(block).some(p => p.offered === true || p.withImam === true);
  }

  function triggerWomanModal(checkboxEl, callback) {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[101] flex items-center justify-center bg-black/85 backdrop-blur-md transition-all duration-300 font-sans';
    overlay.innerHTML = `
      <div class="glass-card p-6 max-w-sm text-center border border-amber-400/20 shadow-2xl font-sans">
        <span class="text-3xl mb-3 block animate-bounce">🕌</span>
        <h3 class="luxury-serif text-amber-400 text-sm font-bold tracking-widest uppercase mb-2">Congregational Prayer</h3>
        <p class="text-slate-300 text-[11px] leading-relaxed mb-4">
          Are you sure you offered this prayer with an Imam? (e.g., in a Mosque, behind a male Imam, or behind a female Imam in a valid all-woman Fard prayer congregation?)
        </p>
        <div class="flex items-center justify-center gap-3">
          <button id="modal-cancel-btn" class="px-4 py-2 bg-black/40 text-slate-300 text-[10px] uppercase font-bold rounded-lg border border-amber-400/10 cursor-pointer">Cancel</button>
          <button id="modal-confirm-btn" class="px-4 py-2 bg-amber-400/10 text-amber-400 text-[10px] uppercase font-bold rounded-lg border border-amber-400/25 cursor-pointer">Yes, Confirmed</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('#modal-cancel-btn').addEventListener('click', () => {
      if (isSoundOn) {
        selectSound.currentTime = 0;
        selectSound.play().catch(() => {});
      }
      checkboxEl.checked = false;
      document.body.removeChild(overlay);
    });

    overlay.querySelector('#modal-confirm-btn').addEventListener('click', () => {
      if (isSoundOn) {
        completeSound.currentTime = 0;
        completeSound.play().catch(() => {});
      }
      checkboxEl.checked = true;
      document.body.removeChild(overlay);
      callback(true);
    });
  }

  // ==========================================================================
  // 🕌 ONE-TIME GENDER ONBOARDING INTERCEPT MODAL (SINGLE-CLICK UX COMPLIANCE)
  // ==========================================================================

  function triggerGenderOnboardingModal(prayer, isCongregational) {
    if (isSoundOn) {
      selectSound.currentTime = 0;
      selectSound.play().catch(() => {});
    }

    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[120] flex items-center justify-center bg-black/85 backdrop-blur-md transition-all duration-300';
    overlay.innerHTML = `
      <div class="glass-card p-6 md:p-8 max-w-sm text-center border border-amber-400/20 shadow-2xl font-sans">
        <span class="text-3xl mb-3 block animate-bounce">🕌</span>
        <h3 class="luxury-serif text-gold-gradient text-sm font-bold tracking-widest uppercase mb-2">Welcome to NoorHub</h3>
        <p class="text-slate-300 text-[11px] leading-relaxed mb-6">
          To ensure your spiritual planner, prayer console, and telemetry tracking conform accurately to your obligations, please select your default mode. This setup is a one-time configuration.
        </p>
        <div class="flex flex-col gap-3">
          <button id="modal-gender-man" class="px-5 py-2.5 bg-emerald-955/40 text-amber-200 text-xs font-bold uppercase rounded-lg border border-amber-400/25 hover:border-amber-400/50 hover:bg-emerald-950/60 cursor-pointer transition-all duration-300">
            Man Mode
          </button>
          <button id="modal-gender-woman" class="px-5 py-2.5 bg-[#1a0f12] text-amber-200 text-xs font-bold uppercase rounded-lg border border-amber-400/25 hover:border-amber-400/50 hover:bg-[#2e151b] cursor-pointer transition-all duration-300">
            Woman Mode
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const handleSelection = (selectedGender) => {
      userGender = selectedGender;
      localStorage.setItem('noorhub_user_gender', selectedGender);
      localStorage.setItem('noorhub_gender_initialized', 'true');
      localStorage.setItem(`noorhub_gender_warned_${activeDate}`, 'true');
      
      document.body.removeChild(overlay);

      // Instantly evaluate and write clicked check into storage
      const prayerStorageKey = `noorhub_prayers_${activeDate}`;
      let activeDatePrayerData = JSON.parse(localStorage.getItem(prayerStorageKey)) || defaultPrayerData;

      if (isCongregational) {
        if (selectedGender === 'woman') {
          // If woman, run standard Woman modal check sequence
          const dummyCheckbox = document.createElement('input');
          dummyCheckbox.type = 'checkbox';
          triggerWomanModal(dummyCheckbox, (confirmed) => {
            if (confirmed) {
              activeDatePrayerData['woman'][prayer].withImam = true;
              activeDatePrayerData['woman'][prayer].offered = true;
              localStorage.setItem(prayerStorageKey, JSON.stringify(activeDatePrayerData));
              
              if (isSoundOn) {
                completeSound.currentTime = 0;
                completeSound.play().catch(() => {});
              }
              renderPrayerTrackerConsole();
              attemptRealtimeMailboxPush();
            }
          });
        } else {
          activeDatePrayerData['man'][prayer].withImam = true;
          activeDatePrayerData['man'][prayer].offered = true;
          localStorage.setItem(prayerStorageKey, JSON.stringify(activeDatePrayerData));
          
          if (isSoundOn) {
            completeSound.currentTime = 0;
            completeSound.play().catch(() => {});
          }
          renderPrayerTrackerConsole();
          attemptRealtimeMailboxPush();
        }
      } else {
        activeDatePrayerData[selectedGender][prayer].offered = true;
        localStorage.setItem(prayerStorageKey, JSON.stringify(activeDatePrayerData));
        
        if (isSoundOn) {
          completeSound.currentTime = 0;
          completeSound.play().catch(() => {});
        }
        renderPrayerTrackerConsole();
        attemptRealtimeMailboxPush();
      }
    };

    overlay.querySelector('#modal-gender-man').addEventListener('click', () => handleSelection('man'));
    overlay.querySelector('#modal-gender-woman').addEventListener('click', () => handleSelection('woman'));
  }

  function renderPrayerTrackerConsole() {
    if (!prayerMatrixContainer || !genderToggleText) return;

    const prayerStorageKey = `noorhub_prayers_${activeDate}`;
    let activeDatePrayerData = JSON.parse(localStorage.getItem(prayerStorageKey)) || defaultPrayerData;

    // Migrate structures if empty
    if (!activeDatePrayerData.man || !activeDatePrayerData.woman) {
      const migrated = JSON.parse(JSON.stringify(defaultPrayerData));
      if (activeDatePrayerData.fajr) {
        migrated[userGender] = activeDatePrayerData;
      }
      activeDatePrayerData = migrated;
      localStorage.setItem(prayerStorageKey, JSON.stringify(activeDatePrayerData));
    }

    if (trackerDateLabel) {
      trackerDateLabel.textContent = formatBeautifulDate(activeDate);
    }

    genderToggleText.textContent = userGender === 'man' ? 'Man' : 'Woman';
    prayerMatrixContainer.innerHTML = '';
    
    // Friday Jumma insertion rules
    const isTodayFriday = isFriday(activeDate);
    const prayersList = isTodayFriday 
      ? ["fajr", "dhuhr", "jumma", "asr", "maghrib", "isha"]
      : ["fajr", "dhuhr", "asr", "maghrib", "isha"];

    // Evaluate Dhuhr vs Jumma lockout states on Fridays
    const dhuhrState = activeDatePrayerData[userGender].dhuhr || { offered: false };
    const jummaState = activeDatePrayerData[userGender].jumma || { offered: false };
    const isDhuhrLockedByJumma = isTodayFriday && jummaState.offered;
    const isJummaLockedByDhuhr = isTodayFriday && dhuhrState.offered;

    prayersList.forEach(prayer => {
      const displayTitle = prayer === 'jumma' ? 'Jumma' : prayer.charAt(0).toUpperCase() + prayer.slice(1);
      const row = document.createElement('div');
      
      // Determine lock rules
      let isRowLocked = isReadOnly;
      if (prayer === 'dhuhr' && isDhuhrLockedByJumma) isRowLocked = true;
      if (prayer === 'jumma' && isJummaLockedByDhuhr) isRowLocked = true;

      // Apply row lockout styling
      if (isRowLocked && !isReadOnly) {
        row.className = 'flex flex-col md:flex-row md:items-center justify-between p-3.5 prayer-row-locked border border-amber-400/5 rounded-xl gap-2 transition-all duration-300';
      } else {
        row.className = 'flex flex-col md:flex-row md:items-center justify-between p-3.5 bg-emerald-955/25 border border-amber-400/5 rounded-xl gap-2 transition-all duration-300';
      }

      const labelCol = `
        <div>
          <span class="text-xs font-semibold tracking-wider text-amber-200">${displayTitle} Prayer</span>
        </div>
      `;

      const triggersCol = document.createElement('div');
      triggersCol.className = 'flex items-center gap-4';

      const prayerState = activeDatePrayerData[userGender][prayer] || { offered: false, withImam: false };
      const cursorClass = isRowLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer';

      // Offered Checkbox
      const offeredLabel = document.createElement('label');
      offeredLabel.className = `flex items-center gap-2 text-xs text-slate-400 ${cursorClass}`;
      
      const offeredCheck = document.createElement('input');
      offeredCheck.type = 'checkbox';
      offeredCheck.className = 'w-4 h-4 accent-amber-400 cursor-pointer rounded-md';
      offeredCheck.checked = prayerState.offered;
      if (isRowLocked) offeredCheck.setAttribute('disabled', 'true');

      // With Imam Checkbox
      const congregationalLabel = document.createElement('label');
      congregationalLabel.className = `flex items-center gap-2 text-xs text-slate-400 ${cursorClass}`;

      const congregationalCheck = document.createElement('input');
      congregationalCheck.type = 'checkbox';
      congregationalCheck.className = 'w-4 h-4 accent-amber-400 cursor-pointer rounded-md';
      congregationalCheck.checked = prayerState.withImam;
      if (isRowLocked) congregationalCheck.setAttribute('disabled', 'true');

      // Intercept clicks to verify if Gender Mode has been initialized yet (Single-Click UX)
      const verifyInitializationAndRun = (e, callback, isCongregational) => {
        if (isReadOnly) return false;
        if (localStorage.getItem('noorhub_gender_initialized') !== 'true') {
          e.preventDefault();
          triggerGenderOnboardingModal(prayer, isCongregational);
          return false;
        }
        callback();
        return true;
      };

      // Friday Jumma mutual lockout triggers with automatic check-all logic
      if (prayer === 'jumma') {
        offeredCheck.addEventListener('change', (e) => {
          const runAction = () => {
            const checkedVal = e.target.checked;
            congregationalCheck.checked = checkedVal;
            activeDatePrayerData[userGender].jumma.offered = checkedVal;
            activeDatePrayerData[userGender].jumma.withImam = checkedVal;

            if (checkedVal && activeDatePrayerData[userGender].dhuhr) {
              activeDatePrayerData[userGender].dhuhr.offered = false;
              activeDatePrayerData[userGender].dhuhr.withImam = false;
            }

            localStorage.setItem(prayerStorageKey, JSON.stringify(activeDatePrayerData));

            if (isSoundOn) {
              if (checkedVal) {
                completeSound.currentTime = 0;
                completeSound.play().catch(() => {});
              } else {
                selectSound.currentTime = 0;
                selectSound.play().catch(() => {});
              }
            }
            renderPrayerTrackerConsole();
            attemptRealtimeMailboxPush();
          };

          verifyInitializationAndRun(e, runAction, false);
        });

        congregationalCheck.addEventListener('change', (e) => {
          const runAction = () => {
            const checkedVal = e.target.checked;
            offeredCheck.checked = checkedVal;
            activeDatePrayerData[userGender].jumma.offered = checkedVal;
            activeDatePrayerData[userGender].jumma.withImam = checkedVal;

            if (checkedVal && activeDatePrayerData[userGender].dhuhr) {
              activeDatePrayerData[userGender].dhuhr.offered = false;
              activeDatePrayerData[userGender].dhuhr.withImam = false;
            }

            localStorage.setItem(prayerStorageKey, JSON.stringify(activeDatePrayerData));

            if (isSoundOn) {
              if (checkedVal) {
                completeSound.currentTime = 0;
                completeSound.play().catch(() => {});
              } else {
                selectSound.currentTime = 0;
                selectSound.play().catch(() => {});
              }
            }
            renderPrayerTrackerConsole();
            attemptRealtimeMailboxPush();
          };

          verifyInitializationAndRun(e, runAction, true);
        });
      } else {
        offeredCheck.addEventListener('click', (e) => {
          if (isRowLocked) return;
          const runAction = () => {
            const isChecked = e.target.checked;
            activeDatePrayerData[userGender][prayer].offered = isChecked;

            if (!isChecked) {
              congregationalCheck.checked = false;
              activeDatePrayerData[userGender][prayer].withImam = false;
            }

            localStorage.setItem(prayerStorageKey, JSON.stringify(activeDatePrayerData));

            if (isSoundOn) {
              if (isChecked) {
                completeSound.currentTime = 0;
                completeSound.play().catch(() => {});
              } else {
                selectSound.currentTime = 0;
                selectSound.play().catch(() => {});
              }
            }
            renderPrayerTrackerConsole();
            attemptRealtimeMailboxPush();
          };

          verifyInitializationAndRun(e, runAction, false);
        });

        congregationalCheck.addEventListener('click', (e) => {
          if (isRowLocked) return;
          const runAction = () => {
            const runSave = () => {
              activeDatePrayerData[userGender][prayer].withImam = true;
              activeDatePrayerData[userGender][prayer].offered = true;
              offeredCheck.checked = true;
              localStorage.setItem(prayerStorageKey, JSON.stringify(activeDatePrayerData));
              renderPrayerTrackerConsole();
              attemptRealtimeMailboxPush();
            };

            if (e.target.checked) {
              if (userGender === 'woman') {
                e.preventDefault();
                triggerWomanModal(congregationalCheck, (confirmed) => {
                  if (confirmed) runSave();
                });
              } else {
                runSave();
                if (isSoundOn) {
                  completeSound.currentTime = 0;
                  completeSound.play().catch(() => {});
                }
              }
            } else {
              activeDatePrayerData[userGender][prayer].withImam = false;
              localStorage.setItem(prayerStorageKey, JSON.stringify(activeDatePrayerData));
              if (isSoundOn) {
                selectSound.currentTime = 0;
                selectSound.play().catch(() => {});
              }
              renderPrayerTrackerConsole();
              attemptRealtimeMailboxPush();
            }
          };

          verifyInitializationAndRun(e, runAction, true);
        });
      }

      offeredLabel.appendChild(offeredCheck);
      offeredLabel.appendChild(document.createTextNode('Offered'));

      congregationalLabel.appendChild(congregationalCheck);
      congregationalLabel.appendChild(document.createTextNode('With Imam'));

      triggersCol.appendChild(offeredLabel);
      triggersCol.appendChild(congregationalLabel);

      row.innerHTML = labelCol;
      row.appendChild(triggersCol);
      prayerMatrixContainer.appendChild(row);
    });
  }

  // ==========================================================================
  // 📁 SLIDING ARCHIVE DRAWER (SLIDEBAR) SYSTEM (TOGGLE COMPLIANT)
  // ==========================================================================

  const archiveDrawer = document.getElementById('archive-drawer');
  const openDrawerBtn = document.getElementById('open-drawer-btn');
  const closeDrawerBtn = document.getElementById('close-drawer-btn');
  const archiveDrawerContent = document.getElementById('archive-drawer-content');

  function toggleArchiveDrawer() {
    if (!archiveDrawer) return;

    if (isSoundOn) {
      selectSound.currentTime = 0;
      selectSound.play().catch(() => {});
    }

    const isClosed = archiveDrawer.classList.contains('translate-x-full');
    if (isClosed) {
      archiveDrawer.classList.remove('translate-x-full');
      renderArchiveContent();
    } else {
      archiveDrawer.classList.add('translate-x-full');
    }
  }

  if (openDrawerBtn) {
    openDrawerBtn.addEventListener('click', toggleArchiveDrawer);
  }
  if (closeDrawerBtn) {
    closeDrawerBtn.addEventListener('click', toggleArchiveDrawer);
  }

  function renderArchiveContent() {
    if (!archiveDrawerContent) return;
    archiveDrawerContent.innerHTML = '';

    const todayVal = new Date();
    let hasData = false;

    for (let i = 0; i < 15; i++) {
      const scanDate = new Date();
      scanDate.setDate(todayVal.getDate() - i);
      const scanDateStr = formatLocalYMD(scanDate);

      const habitsList = JSON.parse(localStorage.getItem(`noorhub_habits_${scanDateStr}`)) || [];
      const prayerData = JSON.parse(localStorage.getItem(`noorhub_prayers_${scanDateStr}`));

      let prayerCount = 0;
      if (prayerData) {
        const genderBlock = prayerData[userGender] || {};
        Object.values(genderBlock).forEach(p => {
          if (p.offered) prayerCount++;
        });
      }

      const scoreTotal = habitsList.length + prayerCount;
      const completedPercentage = Math.round((scoreTotal / 20) * 100);

      // Map dynamic status tags
      let statusTag = "AL-GHAFIK";
      let statusDesc = "Routine missed. Strive to reconnect with the habits tomorrow.";
      let strokeColor = "border-red-500/40 text-red-305 bg-red-955/20";
      
      if (completedPercentage === 100) {
        statusTag = "AL-MUTTAQI";
        statusDesc = "Perfect routine. May Allah preserve your status.";
        strokeColor = "border-amber-400/40 text-amber-350 bg-amber-405/10";
      } else if (completedPercentage >= 80) {
        statusTag = "AL-SALIH";
        statusDesc = "Excellent progress. Strive for completeness.";
        strokeColor = "border-emerald-500/40 text-emerald-350 bg-emerald-950/20";
      } else if (completedPercentage >= 40) {
        statusTag = "AL-MUQTASID";
        statusDesc = "Moderate routine. Strive to elevate your targets.";
        strokeColor = "border-amber-600/40 text-amber-500 bg-amber-900/10";
      }

      if (habitsList.length > 0 || prayerCount > 0) {
        hasData = true;

        const archiveItem = document.createElement('div');
        archiveItem.className = `p-4 border rounded-xl space-y-3 ${strokeColor} font-sans`;
        archiveItem.innerHTML = `
          <div class="flex items-center justify-between border-b border-white/5 pb-2">
            <span class="font-mono text-xs font-bold">${formatBeautifulDate(scanDateStr)}</span>
            <span class="text-[9px] uppercase tracking-widest text-slate-400/60 font-bold font-serif text-amber-400">${statusTag} (${completedPercentage}%)</span>
          </div>
          <p class="text-[10px] text-slate-400 font-light italic leading-normal">${statusDesc}</p>
          <div class="grid grid-cols-2 gap-2 text-[10px]">
            <div>📜 Acts: <strong class="text-amber-200">${habitsList.length}/15</strong></div>
            <div>🕌 Prayers: <strong class="text-amber-200">${prayerCount}/5</strong></div>
          </div>
          <div class="flex justify-end pt-1">
            <button
              class="text-[9px] uppercase tracking-wider font-bold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded hover:bg-amber-400/20 transition-colors cursor-pointer"
              onclick="localStorage.setItem('noorhub_active_date', '${scanDateStr}'); window.location.reload();"
            >
              Sync Focus
            </button>
          </div>
        `;
        archiveDrawerContent.appendChild(archiveItem);
      }
    }

    if (!hasData) {
      archiveDrawerContent.innerHTML = `
        <div class="text-center py-12 text-slate-500 font-light text-xs font-sans">
          No historical telemetry logs discovered for the past 15 days.
        </div>
      `;
    }
  }

  // ==========================================================================
  // 🕌 QAZA PRAYER MAKEUP LEDGER SYSTEM (RECONCILED TO DYNAMIC ADJUST ENGINE)
  // ==========================================================================

  let isAdjustingDebts = false;

  function renderQazaLedger() {
    const qazaContainer = document.getElementById('qaza-ledger-container');
    const adjustToggle = document.getElementById('adjust-debts-toggle');
    if (!qazaContainer) return;

    qazaContainer.innerHTML = '';
    const prayersList = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

    let qazaCounts = JSON.parse(localStorage.getItem('noorhub_qaza_counts')) || {
      fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0
    };

    let madeUpTallies = JSON.parse(localStorage.getItem('noorhub_madeup_counts')) || {
      fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0
    };

    if (adjustToggle) {
      adjustToggle.textContent = isAdjustingDebts ? '✓ Done Adjusting' : '⚙️ Adjust Debts';
      adjustToggle.className = isAdjustingDebts 
        ? 'text-[10px] text-emerald-400 hover:text-emerald-200 uppercase tracking-widest font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors duration-300'
        : 'text-[10px] text-amber-400 hover:text-amber-200 uppercase tracking-widest font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors duration-300';
    }

    prayersList.forEach(prayer => {
      const displayTitle = prayer.charAt(0).toUpperCase() + prayer.slice(1);
      const currentCount = qazaCounts[prayer] || 0;
      const madeUpCount = madeUpTallies[prayer] || 0;

      const row = document.createElement('div');
      row.className = 'flex items-center justify-between p-3 bg-emerald-955/25 border border-amber-400/5 rounded-xl transition-all duration-300';

      if (!isAdjustingDebts) {
        row.innerHTML = `
          <div class="flex flex-col font-sans">
            <span class="text-xs font-semibold tracking-wider text-amber-200">${displayTitle}</span>
            <span class="text-[9px] text-slate-400">Makeup Debt: <strong class="font-mono text-amber-400 font-bold">${currentCount}</strong> | <span class="text-emerald-400">Made Up: ${madeUpCount}</span></span>
          </div>
          <div class="flex items-center gap-2">
            <button
              class="px-2.5 py-1.5 bg-amber-400/10 border border-amber-400/20 hover:bg-amber-400/20 rounded-lg text-[9px] font-bold tracking-wider uppercase text-amber-400 flex items-center gap-1 transition-all cursor-pointer ${currentCount === 0 ? 'opacity-35 cursor-not-allowed pointer-events-none' : ''}"
              title="Mark Offered"
              data-prayer="${prayer}"
              data-action="offered"
            >
              ✓ Offered
            </button>
          </div>
        `;

        row.querySelector('[data-action="offered"]').addEventListener('click', () => {
          if (qazaCounts[prayer] > 0) {
            qazaCounts[prayer]--;
            madeUpTallies[prayer] = (madeUpTallies[prayer] || 0) + 1;
            localStorage.setItem('noorhub_qaza_counts', JSON.stringify(qazaCounts));
            localStorage.setItem('noorhub_madeup_counts', JSON.stringify(madeUpTallies));
            renderQazaLedger();

            if (isSoundOn) {
              completeSound.currentTime = 0;
              completeSound.play().catch(() => {});
            }
            attemptRealtimeMailboxPush();
          }
        });
      } else {
        row.innerHTML = `
          <div class="flex flex-col font-sans">
            <span class="text-xs font-semibold tracking-wider text-amber-200">${displayTitle}</span>
            <span class="text-[9px] text-slate-400">Makeup Debt: <strong class="font-mono text-amber-400 font-bold">${currentCount}</strong></span>
          </div>
          <div class="flex items-center gap-2">
            <button
              class="w-7 h-7 bg-emerald-950/40 border border-amber-400/10 rounded-lg text-xs text-amber-200 hover:text-amber-400 flex items-center justify-center transition-all cursor-pointer"
              title="Decrease Debt"
              data-prayer="${prayer}"
              data-action="dec"
            >
              -
            </button>
            <input
              type="text"
              id="adjust-input-${prayer}"
              class="w-12 h-7 bg-black/40 border border-amber-400/10 rounded-lg text-center text-xs text-amber-200 focus:outline-none focus:border-amber-400/30"
              value="1"
            />
            <button
              class="w-7 h-7 bg-emerald-950/40 border border-amber-400/10 rounded-lg text-xs text-amber-200 hover:text-amber-400 flex items-center justify-center transition-all cursor-pointer"
              title="Increase Debt"
              data-prayer="${prayer}"
              data-action="inc"
            >
              +
            </button>
          </div>
        `;

        const manualInput = row.querySelector(`#adjust-input-${prayer}`);
        if (manualInput) {
          manualInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
            if (e.target.value === '') e.target.value = '1';
          });
        }

        row.querySelector('[data-action="inc"]').addEventListener('click', () => {
          const val = parseInt(manualInput.value || '1', 10);
          qazaCounts[prayer] += val;
          localStorage.setItem('noorhub_qaza_counts', JSON.stringify(qazaCounts));
          renderQazaLedger();

          if (isSoundOn) {
            selectSound.currentTime = 0;
            selectSound.play().catch(() => {});
          }
          attemptRealtimeMailboxPush();
        });

        row.querySelector('[data-action="dec"]').addEventListener('click', () => {
          const val = parseInt(manualInput.value || '1', 10);
          qazaCounts[prayer] = Math.max(0, qazaCounts[prayer] - val);
          localStorage.setItem('noorhub_qaza_counts', JSON.stringify(qazaCounts));
          renderQazaLedger();

          if (isSoundOn) {
            selectSound.currentTime = 0;
            selectSound.play().catch(() => {});
          }
          attemptRealtimeMailboxPush();
        });
      }

      qazaContainer.appendChild(row);
    });
  }

  const adjustToggle = document.getElementById('adjust-debts-toggle');
  if (adjustToggle) {
    adjustToggle.addEventListener('click', () => {
      if (isSoundOn) {
        selectSound.currentTime = 0;
        selectSound.play().catch(() => {});
      }
      isAdjustingDebts = !isAdjustingDebts;
      renderQazaLedger();
    });
  }

  // ==========================================================================
  // 📊 DYNAMIC MONTHLY DEVOTION ANALYTICS CALCULATION FORMULAS
  // ==========================================================================

  function renderMonthlyDevotionAnalytics() {
    const prayersStat = document.getElementById('monthly-prayers-stat');
    const habitsStat = document.getElementById('monthly-habits-stat');
    const rankStat = document.getElementById('monthly-rank-stat');
    if (!prayersStat || !habitsStat || !rankStat) return;

    let totalPrayersOffered = 0;
    let totalPossiblePrayers = 0;
    let totalHabitsDone = 0;
    let totalPossibleHabits = 0;

    // Days in currently viewed month (e.g. 28, 29, 30, 31)
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    // Scale possible counts dynamically based on number of days in the month
    totalPossiblePrayers = daysInMonth * 5;
    totalPossibleHabits = daysInMonth * 15;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      // Prayers Offered
      const prayerData = JSON.parse(localStorage.getItem(`noorhub_prayers_${dateStr}`));
      const isTodayFriday = isFriday(dateStr);
      const prayersList = isTodayFriday 
        ? ["fajr", "dhuhr", "jumma", "asr", "maghrib", "isha"]
        : ["fajr", "dhuhr", "asr", "maghrib", "isha"];

      if (prayerData && prayerData[userGender]) {
        const genderBlock = prayerData[userGender];
        prayersList.forEach(p => {
          if (genderBlock[p] && genderBlock[p].offered) {
            totalPrayersOffered++;
          }
        });
      }

      // Habits Done
      const habitsList = JSON.parse(localStorage.getItem(`noorhub_habits_${dateStr}`)) || [];
      totalHabitsDone += habitsList.length;
    }

    const prayersPct = totalPossiblePrayers > 0 ? Math.round((totalPrayersOffered / totalPossiblePrayers) * 100) : 0;
    const habitsPct = totalPossibleHabits > 0 ? Math.round((totalHabitsDone / totalPossibleHabits) * 100) : 0;

    prayersStat.textContent = `${totalPrayersOffered} / ${totalPossiblePrayers} (${prayersPct}%)`;
    habitsStat.textContent = `${totalHabitsDone} / ${totalPossibleHabits} (${habitsPct}%)`;

    const combinedScore = Math.round((prayersPct + habitsPct) / 2);
    let rank = "AL-GHAFIK";
    if (combinedScore === 100) rank = "AL-MUTTAQI";
    else if (combinedScore >= 80) rank = "AL-SALIH";
    else if (combinedScore >= 40) rank = "AL-MUQTASID";

    rankStat.textContent = rank;
  }

  // ==========================================================================
  // 📝 DAILY REFLECTIONS AUTO-SAVES (READ/EDIT SPLIT DESIGN)
  // ==========================================================================

  function loadNoteInput() {
    const noteInput = document.getElementById('daily-note-input');
    const noteDateLabel = document.getElementById('note-date-label');
    const editSaveBtn = document.getElementById('note-edit-save-btn');
    const readBtn = document.getElementById('note-read-btn');
    const badge = document.getElementById('note-save-badge');

    if (!noteInput || !editSaveBtn || !readBtn) return;

    if (noteDateLabel) {
      noteDateLabel.textContent = `for ${formatBeautifulDate(activeDate)}`;
    }

    const noteKey = `noorhub_notes_${activeDate}`;
    noteInput.value = localStorage.getItem(noteKey) || '';

    // Lock Note Modifications on days older than yesterday relative to Today
    if (isReadOnly) {
      noteInput.setAttribute('readonly', 'true');
      noteInput.classList.add('cursor-not-allowed', 'opacity-75');
      editSaveBtn.textContent = '✏️ Edit';
      editSaveBtn.classList.add('opacity-30', 'pointer-events-none');
      editSaveBtn.setAttribute('disabled', 'true');
    } else {
      noteInput.setAttribute('readonly', 'true');
      noteInput.classList.add('cursor-not-allowed', 'opacity-75');
      editSaveBtn.textContent = '✏️ Edit';
      editSaveBtn.classList.remove('opacity-30', 'pointer-events-none');
      editSaveBtn.removeAttribute('disabled');
    }

    const clonedEditSave = editSaveBtn.cloneNode(true);
    editSaveBtn.parentNode.replaceChild(clonedEditSave, editSaveBtn);

    if (!isReadOnly) {
      clonedEditSave.addEventListener('click', () => {
        if (isSoundOn) {
          selectSound.currentTime = 0;
          selectSound.play().catch(() => {});
        }

        const isCurrentlyEdit = clonedEditSave.textContent.includes('Save');

        if (!isCurrentlyEdit) {
          noteInput.removeAttribute('readonly');
          noteInput.classList.remove('cursor-not-allowed', 'opacity-75');
          noteInput.focus();
          clonedEditSave.textContent = '💾 Save';
        } else {
          if (badge) badge.classList.remove('hidden');
          localStorage.setItem(noteKey, noteInput.value);

          if (isSoundOn) {
            completeSound.currentTime = 0;
            completeSound.play().catch(() => {});
          }

          setTimeout(() => {
            if (badge) badge.classList.add('hidden');
            noteInput.setAttribute('readonly', 'true');
            noteInput.classList.add('cursor-not-allowed', 'opacity-75');
            clonedEditSave.textContent = '✏️ Edit';
            attemptRealtimeMailboxPush(); // Auto-push updated reflections note to cloud mailbox
          }, 600);
        }
      });
    }

    const clonedRead = readBtn.cloneNode(true);
    readBtn.parentNode.replaceChild(clonedRead, readBtn);

    clonedRead.addEventListener('click', () => {
      if (isSoundOn) {
        selectSound.currentTime = 0;
        selectSound.play().catch(() => {});
      }

      const noteContent = localStorage.getItem(noteKey) || 'No reflection logged for this date.';
      const overlay = document.createElement('div');
      overlay.className = 'fixed inset-0 z-[101] flex items-center justify-center bg-black/80 backdrop-blur-md transition-all duration-300 font-sans';
      overlay.innerHTML = `
        <div class="glass-card p-8 max-w-lg w-full border border-amber-400/20 shadow-2xl relative">
          <button id="modal-close-ref" class="absolute top-4 right-4 text-slate-400 hover:text-amber-300 font-bold animate-pulse">✕</button>
          <h3 class="luxury-serif text-amber-400 text-sm font-bold tracking-widest uppercase mb-4">View Reflections</h3>
          <p class="text-[10px] text-slate-500 font-mono mb-2">${formatBeautifulDate(activeDate)}</p>
          <div class="max-h-60 overflow-y-auto p-4 bg-emerald-955/20 border border-amber-400/5 rounded-xl text-slate-300 text-xs font-light leading-relaxed whitespace-pre-wrap">
            ${noteContent}
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      overlay.querySelector('#modal-close-ref').addEventListener('click', () => {
        if (isSoundOn) {
          selectSound.currentTime = 0;
          selectSound.play().catch(() => {});
        }
        document.body.removeChild(overlay);
      });
    });
  }

  // ==========================================================================
  // 📁 MONTHLY DEVOTION RANKS INTERACTIVE DETAILS MODAL
  // ==========================================================================

  const analyticsCard = document.getElementById('analytics-card');
  const analyticsModal = document.getElementById('analytics-modal');
  const analyticsClose = document.getElementById('analytics-modal-close');
  const analyticsOk = document.getElementById('analytics-modal-ok');

  if (analyticsCard && analyticsModal) {
    analyticsCard.addEventListener('click', () => {
      if (isSoundOn) {
        selectSound.currentTime = 0;
        selectSound.play().catch(() => {});
      }
      analyticsModal.classList.remove('hidden');
    });
  }

  function closeAnalyticsModal() {
    if (isSoundOn) {
      selectSound.currentTime = 0;
      selectSound.play().catch(() => {});
    }
    if (analyticsModal) {
      analyticsModal.classList.add('hidden');
    }
  }

  if (analyticsClose) analyticsClose.addEventListener('click', closeAnalyticsModal);
  if (analyticsOk) analyticsOk.addEventListener('click', closeAnalyticsModal);

  // ==========================================================================
  // 👤 DYNAMIC ARCHIVE SLIDEBAR DRAWER TITLE
  // ==========================================================================

  function updateArchiveDrawerTitle() {
    const drawerTitle = document.getElementById('archive-drawer-title');
    const username = localStorage.getItem('noorhub_username');
    if (drawerTitle && username) {
      drawerTitle.textContent = `Spiritual Archives of ${username}`;
    }
  }

  // ==========================================================================
  // 📁 REAL-TIME BACKGROUND SYNC ORESTESTRATION
  // ==========================================================================

  function attemptRealtimeMailboxPush() {
    if (typeof NoorSyncEngine !== 'undefined' && localStorage.getItem('noorhub_sync_key')) {
      NoorSyncEngine.pushToMailbox();
    }
  }

  function startRealtimeSyncInterval() {
    if (typeof NoorSyncEngine !== 'undefined' && localStorage.getItem('noorhub_sync_key')) {
      // Attempt a fetch and self-delete every 10 seconds in the background
      setInterval(() => {
        NoorSyncEngine.fetchFromMailbox().then(updated => {
          if (updated) {
            // If new data was downloaded and applied, reload the calendar grid, tracker console, and reflections note
            generateCalendarGrid();
            renderPrayerTrackerConsole();
            loadNoteInput();
          }
        });
      }, 10000);
    }
  }

  // ==========================================================================
  // 🚨 STATE-TRACKED LIVE QAZA SYNC ALGORITHM (LAHORE BOUNDARIES)
  // ==========================================================================

  function checkAndRegisterLiveQazaTodayAndYesterday() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const qazaTimes = {
      fajr: { h: 5, m: 0 },
      dhuhr: { h: 15, m: 45 },
      asr: { h: 19, m: 5 },
      maghrib: { h: 20, m: 35 },
      isha: { h: 23, m: 59 }
    };

    let qazaCounts = JSON.parse(localStorage.getItem('noorhub_qaza_counts')) || {
      fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0
    };

    let autoRegistered = JSON.parse(localStorage.getItem('noorhub_auto_qaza_registered')) || [];

    // 1. Evaluate Today's Passed Boundaries
    const todayPrayerKey = `noorhub_prayers_${todayStr}`;
    let todayPrayerData = JSON.parse(localStorage.getItem(todayPrayerKey));
    if (!todayPrayerData) {
      todayPrayerData = JSON.parse(JSON.stringify(defaultPrayerData));
      localStorage.setItem(todayPrayerKey, JSON.stringify(todayPrayerData));
    }

    const prayersToCheck = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

    prayersToCheck.forEach(prayer => {
      const qTime = qazaTimes[prayer];
      const isPastQazaTime = (currentHour > qTime.h) || (currentHour === qTime.h && currentMinute >= qTime.m);

      const prayerState = todayPrayerData[userGender] && todayPrayerData[userGender][prayer];
      const isOffered = prayerState ? prayerState.offered : false;
      const regKey = `${todayStr}_${prayer}`;

      if (isPastQazaTime && !isOffered) {
        if (!autoRegistered.includes(regKey)) {
          qazaCounts[prayer] = (qazaCounts[prayer] || 0) + 1;
          autoRegistered.push(regKey);
        }
      } else if (isOffered) {
        if (autoRegistered.includes(regKey)) {
          qazaCounts[prayer] = Math.max(0, (qazaCounts[prayer] || 1) - 1);
          const idx = autoRegistered.indexOf(regKey);
          if (idx > -1) autoRegistered.splice(idx, 1);
        }
      }
    });

    // 2. Evaluate Yesterday's Passed Boundaries (Since Yesterday has fully passed,
    // any unchecked prayer must already count as a registered Qaza debt)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatLocalYMD(yesterday);

    const yesterdayPrayerKey = `noorhub_prayers_${yesterdayStr}`;
    let yesterdayPrayerData = JSON.parse(localStorage.getItem(yesterdayPrayerKey));
    if (!yesterdayPrayerData) {
      yesterdayPrayerData = JSON.parse(JSON.stringify(defaultPrayerData));
      localStorage.setItem(yesterdayPrayerKey, JSON.stringify(yesterdayPrayerData));
    }

    prayersToCheck.forEach(prayer => {
      const prayerState = yesterdayPrayerData[userGender] && yesterdayPrayerData[userGender][prayer];
      const isOffered = prayerState ? prayerState.offered : false;
      const regKey = `${yesterdayStr}_${prayer}`;

      if (!isOffered) {
        if (!autoRegistered.includes(regKey)) {
          qazaCounts[prayer] = (qazaCounts[prayer] || 0) + 1;
          autoRegistered.push(regKey);
        }
      } else {
        if (autoRegistered.includes(regKey)) {
          qazaCounts[prayer] = Math.max(0, (qazaCounts[prayer] || 1) - 1);
          const idx = autoRegistered.indexOf(regKey);
          if (idx > -1) autoRegistered.splice(idx, 1);
        }
      }
    });

    localStorage.setItem('noorhub_qaza_counts', JSON.stringify(qazaCounts));
    localStorage.setItem('noorhub_auto_qaza_registered', JSON.stringify(autoRegistered));
  }

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
    checkAndRegisterLiveQazaTodayAndYesterday(); // Execute dynamic live Qaza checks for Today & Yesterday
    updateHistoricalBanner();
    generateCalendarGrid();
    renderPrayerTrackerConsole();
    renderQazaLedger();
    loadNoteInput();
    updateNavAudioDisplay();
    updateArchiveDrawerTitle(); // Execute dynamic drawer heading update
    startRealtimeSyncInterval(); // Start real-time background sync polling
  });

})();