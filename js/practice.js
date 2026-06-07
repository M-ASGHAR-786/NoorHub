/**
 * NoorHub - Prophetic Routine Matrix & Chrono Filter Engine
 * Core Logic File: js/practice.js
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

  const todayStr = formatLocalYMD(new Date());
  
  var activeDate = localStorage.getItem('noorhub_active_date');
  if (!activeDate) {
    activeDate = todayStr;
    localStorage.setItem('noorhub_active_date', todayStr);
  }

  const isReadOnly = checkIsReadOnly(activeDate, todayStr);

  const warningBanner = document.getElementById('historical-date-banner');
  const warningValue = document.getElementById('historical-date-value');
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
  // 🕌 PROPHECTIC 15-ACT HABIT DATABASE MATRIX
  // ==========================================================================

  const PRACTICES_DB = [
    {
      id: "1",
      phase: "waking",
      title: "The Dua of Awakening",
      arabicText: "اَلْحَمْدُ لِلّٰهِ الَّذِيْٓ أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُوْرُ",
      transliteration: "Alhamdu lillahil-ladhi ahyana ba'da ma amatana wa ilayhin-nushur.",
      translation: "Praise is to Allah Who gave us life after He had caused us to die, and to Him is the ultimate resurrection.",
      virtue: "Fulfills the Sunnah of expressing immediate gratitude to Allah upon awakening for restoring life after sleep, realigning the believer's consciousness with the reality of the ultimate Resurrection.",
      source: "Sahih al-Bukhari 6312",
      grade: "Authentic / Sahih"
    },
    {
      id: "2",
      phase: "waking",
      title: "The Siwak Clearing Ritual",
      arabicText: "كَانَ النَّبِيُّ صلى الله عليه وسلم إِذَا قَامَ مِنَ اللَّيْلِ يَشُوصُ فَاهُ بِالسِّوَاكِ",
      transliteration: "Kanan-Nabiyyu sallallahu 'alayhi wa sallama idha qama minal-layli yashusu fahu bis-siwak.",
      translation: "Whenever the Prophet (peace and blessings be upon him) rose from sleep at night, he would clean his mouth using the miswak.",
      virtue: "Purifying the mouth with the Miswak is highly pleasing to the Lord. It dispels sleepiness, refreshes the breath, and prepares the believer for morning worship.",
      source: "Sahih Muslim 255",
      grade: "Authentic / Sahih"
    },
    {
      id: "3",
      phase: "morning",
      title: "Morning Ayat al-Kursi Shield (After Fajr)",
      arabicText: "اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ مَنْ ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلَّا بِإِذْنِهِ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ وَلَا يُحِيطُونَ بِشَيْءٍ مِنْ عِلْمِهِ إِلَّا بِمَا شَاءَ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ وَلَا يَئُودُهُ حِفْظُهُمَا وَهُوَ الْعَلِيُّ الْعَظِيمُ",
      transliteration: "Allahu la ilaha illa Huwal-Hayyul-Qayyum, la ta'khudhuhu sinatun wa la nawm...",
      translation: "Allah! There is no deity except Him, the Ever-Living, the Sustainer of all existence. Neither drowsiness overtakes Him nor sleep...",
      virtue: "Reciting Ayat al-Kursi after the Fajr prayer secures divine protection. An appointed guardian from Allah will remain over the believer, and no devil can approach them until the evening.",
      source: "Sahih al-Bukhari 2311",
      grade: "Authentic / Sahih"
    },
    {
      id: "4",
      phase: "morning",
      title: "The Prayer of the Awakening / Duha",
      arabicText: "يُصْبِحُ عَلَى كُلِّ سُلَامَى مِنْ أَحَدِكُمْ صَدَقَةٌ... وَيُجْزِئُ مِنْ ذَلِكَ رَكْعَتَانِ يَرْكَعُهُمَا مِنَ الضُّحَى",
      transliteration: "Yusbihu 'ala kulli sulama min ahadikum sadaqatun... wa yujzi'u min dhalika rak'atani yarka'uhuma minad-duha.",
      translation: "Every morning, charity is due on every single joint of your body. Two units of voluntary prayer offered in the forenoon (Duha) fulfills all of this charity.",
      virtue: "Every morning, charity is due on each of the believer's 360 joints. Offering the two rak'ahs of Duha prayer fulfills all of this biological gratitude and acts as complete charity on their behalf.",
      source: "Sahih Muslim 720",
      grade: "Authentic / Sahih"
    },
    {
      id: "5",
      phase: "morning",
      title: "Step-out Outward Bond",
      arabicText: "بِسْمِ اللَّهِ تَوَكَّلْتُ عَلَى اللَّهِ لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ",
      transliteration: "Bismillahi, tawakkaltu 'alallah, wa la hawla wa la quwwata illa billah.",
      translation: "In the name of Allah, I place my trust in Allah, and there is no might and no power except with Allah.",
      virtue: "Upon leaving the home, it is proclaimed to the believer: 'You are guided, sufficed, and protected.' Devils stay away, and one devil says to another, 'How can you overcome a person who has been guided, sufficed, and protected?'",
      source: "Sunan Abi Dawud 5095",
      grade: "Authentic / Sahih"
    },
    {
      id: "6",
      phase: "morning",
      title: "Market / Workspace Shield Directive",
      arabicText: "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ يُحْيِي وَيُمِيتُ وَهُوَ حَيٌّ لَا يَمُوتُ بِيَدِهِ الْخَيْرُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
      transliteration: "La ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamdu, yuhyi wa yumitu...",
      translation: "None has the right to be worshipped except Allah alone, without partner. His is the sovereignty, His is the praise, He gives life and causes death, and He is the Living Who never dies. In His Hand is all goodness, and He is Able to do all things.",
      virtue: "Reciting this upon entering markets or busy workspaces triggers the recording of one million good deeds, erases one million sins, and elevates the believer one million ranks in Paradise.",
      source: "Sunan At-Tirmidhi 3428",
      grade: "Hasan / Sound"
    },
    {
      id: "7",
      phase: "afternoon",
      title: "The Afternoon Repentance Cycle / Sayyidul Istighfar",
      arabicText: "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ خَلَقْتَنِي وَأَنَا عَبْدُكَ وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ وَأَبُوءُ لَكَ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ",
      transliteration: "Allahumma anta Rabbi la ilaha illa anta, khalaqtani wa ana 'abduka wa ana 'ala 'ahdika wa wa'dika mastata'tu...",
      translation: "O Allah! You are my Lord, there is no deity except You. You created me, and I am Your slave. I remain faithful to my covenant and my promise to the best of my ability. I seek refuge in You from the evil of what I have done...",
      virtue: "The Master of Forgiveness (Sayyidul Istighfar). Reciting this with firm conviction during the day ensures entry into Paradise if the believer passes away before evening; and reciting it at night ensures entry into Paradise if they pass away before morning.",
      source: "Sahih al-Bukhari 6306",
      grade: "Authentic / Sahih"
    },
    {
      id: "8",
      phase: "afternoon",
      title: "The Evening Azkar Protective Shield",
      arabicText: "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ",
      transliteration: "Bismillahil-ladhi la yadurru ma'as-mihi shay'un fil-ardi wa la fis-sama'i wa huwas-Sami'ul-'Alim.",
      translation: "In the name of Allah, with Whose name nothing on earth or in heaven can cause any harm, and He is the All-Hearing, the All-Knowing.",
      virtue: "Recited three times in the morning and evening. It serves as an absolute shield, ensuring that no sudden affliction, harm, or calamity on earth or in heaven can touch the believer.",
      source: "Sunan Abi Dawud 5088",
      grade: "Authentic / Sahih"
    },
    {
      id: "9",
      phase: "afternoon",
      title: "The Venom & Evil Protection Seal",
      arabicText: "أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ",
      transliteration: "A'udhu bi-kalimatillahit-tammati min sharri ma khalaq.",
      translation: "I seek refuge in the perfect words of Allah from the evil of what He has created.",
      virtue: "Recited three times in the evening. It establishes safety from unexpected harm, ensuring that no scorpion sting, venomous bite, or harmful creature can injure the believer during the night.",
      source: "Sahih Muslim 2709a",
      grade: "Authentic / Sahih"
    },
    {
      id: "10",
      phase: "sleep",
      title: "The Pre-Sleep Wudu Cleanse",
      arabicText: "إِذَا أَتَيْتَ مَضْجَعَكَ فَتَوَضَّأْ وُضُوءَكَ لِلصَّلَاةِ",
      transliteration: "Idha atayta madj'aka fatawadda' wudu'aka lis-salat.",
      translation: "When you go to bed, perform ablution (wudu) like the one you perform for prayer.",
      virtue: "Spending the night in a state of ritual purity (Wudu) prompts an angel to reside in the believer's inner garment. Every time they turn over during the night, the angel supplicates: 'O Allah, forgive Your servant, for they slept in purity.'",
      source: "Sahih al-Bukhari 247",
      grade: "Authentic / Sahih"
    },
    {
      id: "11",
      phase: "sleep",
      title: "The Three Quls Cupped Hand Blow",
      arabicText: "قُلْ هُوَ اللَّهُ أَحَدٌ ۞ قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ ۞ قُل أَعُوذُ بِرَبِّ النَّاسِ",
      transliteration: "Qul Huwal-lahu Ahad, Qul A'udhu bi Rabbil-Falaq, Qul A'udhu bi Rabbin-Nas...",
      translation: "Say, 'He is Allah, [Who is] One'... Say, 'I seek refuge in the Lord of daybreak'... Say, 'I seek refuge in the Lord of mankind'...",
      virtue: "The ultimate nightly protective Sunnah. Cupping the hands, reciting the three Quls, blowing over them, and wiping them over the entire body three times before sleep shields the believer's body and soul from spiritual hostility and nightmares.",
      source: "Sahih al-Bukhari 5017",
      grade: "Authentic / Sahih"
    },
    {
      id: "12",
      phase: "sleep",
      title: "The Kingdom Release Guard / Surah Al-Mulk",
      arabicText: "تَبَارَكَ الَّذِي بِيَدِهِ الْمُلْكُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
      transliteration: "Tabarakal-ladhi biyadihil-mulku wa huwa 'ala qullu shay'in qadir...",
      translation: "Blessed is He in Whose Hand is the sovereignty, and He is Able to do all things...",
      virtue: "Reciting the thirty verses of Surah Al-Mulk nightly serves as an active advocate in the grave, interceding continuously on behalf of the believer until their sins are completely forgiven.",
      source: "Sunan At-Tirmidhi 2891",
      grade: "Hasan / Sound"
    },
    {
      id: "13",
      phase: "prayer",
      title: "The 33 Tasbeeh Matrix",
      arabicText: "سُبْحَانَ اللهِ (٣٣) ، الْحَمْدُ لِلَّهِ (٣٣) ، اللهُ أَكْبَرُ (٣٣) تَمَامُ الْمِائَةِ: لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
      transliteration: "SubhanAllah (33x), Alhamdulillah (33x), Allahu Akbar (33x)...",
      translation: "Glory be to Allah, Praise be to Allah, Allah is Greatest... and completing the hundred with: There is no deity worthy of worship except Allah alone...",
      virtue: "Recited after each obligatory prayer. Completing this hundred-count remembrance wipes away all of the believer's minor sins, even if they are as vast and abundant as the foam of the sea.",
      source: "Sahih Muslim 597a",
      grade: "Authentic / Sahih"
    },
    {
      id: "14",
      phase: "prayer",
      title: "The Post-Prayer Eternity Vault / Ayat al-Kursi",
      arabicText: "اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ",
      transliteration: "Allahu la ilaha illa Huwal-Hayyul-Qayyum...",
      translation: "Allah! There is no deity except Him, the Ever-Living, the Sustainer of all existence...",
      virtue: "Reciting Ayat al-Kursi immediately following the conclusion of each obligatory prayer ensures that nothing stands between the believer and their entry into Paradise except death.",
      source: "Mishkat al-Masabih 974",
      grade: "Authentic / Sahih"
    },
    {
      id: "15",
      phase: "prayer",
      title: "Morning 3 Quls Protection Shield",
      arabicText: "قُلْ هُوَ اللَّهُ أَحَدٌ ۞ قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ ۞ قُل أَعُوذُ بِرَبِّ النَّاسِ",
      transliteration: "Qul Huwal-lahu Ahad, Qul A'udhu bi Rabbil-Falaq, Qul A'udhu bi Rabbin-Nas...",
      translation: "Say, 'He is Allah, [Who is] One'... Say, 'I seek refuge in the Lord of daybreak'... Say, 'I seek refuge in the Lord of mankind'...",
      virtue: "Reciting the three Quls three times in the morning and evening establishes complete spiritual sufficiency, guarding the believer against all forms of harm and distress throughout the entire day.",
      source: "Sunan Abi Dawud 5082",
      grade: "Authentic / Sahih"
    }
  ];

  // ==========================================================================
  // ⚙️ COMPONENT RENDERING & TAB FILTER INTERFACE
  // ==========================================================================

  // Declare with var to avoid block-scoping TDZ ReferenceErrors in Deferred evaluation
  var currentFilterPhase = localStorage.getItem('noorhub_active_phase') || "all";
  
  const habitsStorageKey = `noorhub_habits_${activeDate}`;
  let completedHabits = [];
  try {
    completedHabits = JSON.parse(localStorage.getItem(habitsStorageKey)) || [];
  } catch (e) {
    completedHabits = [];
  }

  const practicesContainer = document.getElementById('practices-grid-container');
  const tabButtons = document.querySelectorAll('.phase-tab-btn');
  const completionText = document.getElementById('completion-text');
  const completionBarFill = document.getElementById('completion-bar-fill');

  function refreshProgressMetrics() {
    if (!completionText || !completionBarFill) return;
    const totalActsCount = PRACTICES_DB.length;
    const completedCount = completedHabits.length;
    const percentage = Math.round((completedCount / totalActsCount) * 100);

    completionText.textContent = `${percentage}% (${completedCount} / ${totalActsCount} Completed)`;
    completionBarFill.style.width = `${percentage}%`;
  }

  function renderPracticesGrid() {
    if (!practicesContainer) return;
    practicesContainer.innerHTML = '';

    const filteredList = currentFilterPhase === "all" 
      ? PRACTICES_DB 
      : PRACTICES_DB.filter(act => act.phase === currentFilterPhase);

    if (filteredList.length === 0) {
      practicesContainer.innerHTML = `
        <div class="col-span-full py-12 text-center text-slate-500 font-light text-sm font-sans">
          No records discovered matching this specific chronological phase.
        </div>
      `;
      return;
    }

    filteredList.forEach(act => {
      const isCompleted = completedHabits.includes(act.id);
      const card = document.createElement('article');
      card.className = `glass-card glow-gold relative p-6 flex flex-col justify-between transition-all duration-300 ${isCompleted ? 'border-amber-400/25 bg-amber-955/10' : ''}`;

      const sourceBadge = `
        <div class="flex items-center justify-between text-[10px] text-slate-500 mb-3 font-mono">
          <span class="uppercase tracking-widest text-[#94a3b8]/60 font-semibold bg-emerald-955/40 px-2 py-0.5 rounded-md border border-amber-400/5">${act.phase}</span>
          <span>${act.source}</span>
        </div>
      `;

      const cardBody = `
        <div>
          ${sourceBadge}
          <h3 class="luxury-serif text-amber-200 text-sm tracking-wide mb-1 font-bold">${act.title}</h3>
          
          <div class="my-4 text-right">
            <span class="arabic-script text-gold-gradient text-xl leading-relaxed block tracking-wide select-all" dir="rtl">${act.arabicText}</span>
          </div>

          <p class="text-slate-400/80 text-xs italic mb-2 leading-relaxed font-sans">${act.transliteration}</p>
          <p class="text-slate-300 text-xs leading-relaxed mb-4 font-light">${act.translation}</p>
          
          <div class="bg-black/25 border border-amber-400/5 p-3 rounded-lg text-[#94a3b8] text-[11px] leading-relaxed italic mb-5">
            ${act.virtue}
          </div>
        </div>
      `;

      const isBtnDisabled = isReadOnly ? 'disabled cursor-not-allowed opacity-50' : 'cursor-pointer';
      const completeBtnClass = isCompleted 
        ? 'bg-amber-400/15 border border-amber-400/40 text-amber-400 font-semibold'
        : 'bg-emerald-955/20 border border-amber-400/10 text-slate-400 hover:border-amber-400/30 hover:text-amber-300';

      const cardFooter = document.createElement('div');
      cardFooter.className = 'flex items-center justify-between gap-3 mt-auto pt-2 border-t border-amber-400/5';
      
      const viewBtn = document.createElement('button');
      viewBtn.className = 'px-3 py-2 bg-emerald-955/30 border border-amber-400/5 rounded-xl text-[10px] font-semibold tracking-wider uppercase text-slate-400 hover:text-amber-200 hover:border-amber-400/20 transition-all duration-300 cursor-pointer flex items-center gap-1';
      viewBtn.innerHTML = `<span>📜</span> Details`;
      
      viewBtn.addEventListener('click', (e) => {
        if (isSoundOn) {
          e.preventDefault();
          const targetUrl = `act-detail.html?id=${act.id}`;
          selectSound.currentTime = 0;
          selectSound.play().catch(() => {});
          document.body.classList.remove('fade-in');
          setTimeout(() => {
            window.location.href = targetUrl;
          }, 220);
        } else {
          window.location.href = `act-detail.html?id=${act.id}`;
        }
      });

      const completeBtn = document.createElement('button');
      completeBtn.className = `px-4 py-2 rounded-xl text-[10px] font-bold tracking-wider uppercase transition-all duration-300 flex items-center gap-1.5 ${completeBtnClass} ${isBtnDisabled}`;
      completeBtn.innerHTML = isCompleted ? `<span>✓</span> Completed` : `<span>🟢</span> Complete`;

      if (!isReadOnly) {
        completeBtn.addEventListener('click', () => {
          toggleHabitCompletion(act.id);
        });
      }

      cardFooter.appendChild(viewBtn);
      cardFooter.appendChild(completeBtn);

      card.innerHTML = cardBody;
      card.appendChild(cardFooter);
      practicesContainer.appendChild(card);
    });
  }

  function toggleHabitCompletion(id) {
    const idx = completedHabits.indexOf(id);
    let isChecking = false;
    if (idx > -1) {
      completedHabits.splice(idx, 1);
    } else {
      completedHabits.push(id);
      isChecking = true;
    }
    localStorage.setItem(habitsStorageKey, JSON.stringify(completedHabits));
    renderPracticesGrid();
    refreshProgressMetrics();
    
    if (isSoundOn) {
      if (isChecking) {
        completeSound.currentTime = 0;
        completeSound.play().catch(() => {});
      } else {
        selectSound.currentTime = 0;
        selectSound.play().catch(() => {});
      }
    }
  }

  function activateTab(phase) {
    tabButtons.forEach(btn => {
      const btnPhase = btn.getAttribute('data-phase');
      if (btnPhase === phase) {
        btn.className = 'phase-tab-btn px-4 py-2 rounded-xl text-[10px] md:text-xs font-semibold uppercase tracking-wider transition-all duration-300 cursor-pointer bg-amber-400/10 border border-amber-400/40 text-amber-400 shadow-lg';
      } else {
        btn.className = 'phase-tab-btn px-4 py-2 rounded-xl text-[10px] md:text-xs font-semibold uppercase tracking-wider transition-all duration-300 cursor-pointer bg-emerald-955/20 border border-amber-400/5 text-slate-400 hover:text-amber-300 hover:border-amber-400/20';
      }
    });
  }

  if (tabButtons) {
    tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        currentFilterPhase = e.currentTarget.getAttribute('data-phase');
        localStorage.setItem('noorhub_active_phase', currentFilterPhase);
        
        activateTab(currentFilterPhase);
        renderPracticesGrid();

        if (isSoundOn) {
          selectSound.currentTime = 0;
          selectSound.play().catch(() => {});
        }
      });
    });
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
    activateTab(currentFilterPhase);
    renderPracticesGrid();
    refreshProgressMetrics();
    updateNavAudioDisplay();
  });

})();