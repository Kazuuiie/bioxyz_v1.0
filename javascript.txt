/* ============ BIẾN CƠ BẢN ============ */
const gate = document.getElementById('gate');
const main = document.getElementById('main');
const bgVideo = document.getElementById('bg-video');
const music = document.getElementById('bg-music');

const disc = document.getElementById('disc-player');            // nút Play/Pause
const discCover = document.getElementById('disc-player-cover'); // ảnh đĩa

const discLabel = document.getElementById('disc-label');
const discTip = document.getElementById('disc-tip');
const musicBox = document.getElementById('music-box');
const musicTitle = document.getElementById('music-title');
const albumCover = document.getElementById('album-cover');
const musicPrev = document.getElementById('music-prev');
const musicNext = document.getElementById('music-next');

const trackMenuBtn = document.getElementById('track-menu-btn');
const trackListPanel = document.getElementById('track-list-panel');
const trackListClose = document.getElementById('track-list-close');
const trackListEl = document.getElementById('track-list');

const card = document.querySelector('.card');
const dock = document.getElementById('dock');
const dash = document.getElementById('dash');
const bioConfig = window.bioConfig || {};

/* ============ FIX: khai báo sớm để tránh lỗi TDZ (ReferenceError) ============
 * Các biến này trước đây được khai báo ở section VISUALIZER (bên dưới),
 * nhưng lại được dùng sớm hơn qua cacheTrackMiniBars() -> renderTrackList()
 * (được gọi ngay lúc khởi tạo trackMenuBtn ở trên). Vì dùng "let/const" có
 * temporal dead zone, việc gọi hàm dùng biến trước dòng khai báo gốc sẽ làm
 * toàn bộ script phía sau (gate, tooltip, discord...) không chạy được.
 * => Khai báo chúng NGAY TỪ ĐẦU, và đã xoá phần khai báo trùng ở dưới.
 */
const mainBarsCache = document.querySelectorAll('.music-bars .bar');
let miniBarsPerTrack = [];
let allMiniBarsFlat = [];
let visualizerDataArray = null;
let barsAreReset = true;

/* ============ CATEGORY ============ */
const CATEGORY_LABELS = {
  bth: 'Bình thường',
  fonk: 'Phonk',
  remix: 'Remix',
  rap: 'Rap',
  lofi: 'Lo-fi',
  drill: 'Drill',
  edm: 'EDM',
  ballad: 'Ballad',
  chill: 'Chill',
  nhactrung: 'Nhạc Trung',
  nhactrungremix: 'Nhạc Trung Remix',
  nhacnhat: 'Nhạc Nhật'
};

function getCategoryLabel(cat) {
  if (!cat) return 'Khác';
  return CATEGORY_LABELS[cat] ||
    (cat.charAt(0).toUpperCase() + cat.slice(1));
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

let currentCategory = 'all';
const trackCategoryFiltersEl =
  document.getElementById('track-category-filters');

function renderCategoryFilters() {
  if (!trackCategoryFiltersEl) return;

  const cats = Array.from(
    new Set(
      tracks
        .map(t => t.category)
        .filter(Boolean)
    )
  );

  if (!cats.length) {
    trackCategoryFiltersEl.innerHTML = '';
    return;
  }

  const chips = ['all', ...cats];

  trackCategoryFiltersEl.innerHTML = chips.map(c => `
    <button
      type="button"
      class="category-chip${c === currentCategory ? ' active' : ''}"
      data-category="${escapeHtml(c)}"
      data-tooltip="${c === 'all'
        ? 'Tất cả bài hát'
        : escapeHtml(getCategoryLabel(c))}"
      role="tab"
      aria-selected="${c === currentCategory}">
      ${c === 'all'
        ? 'Tất cả'
        : escapeHtml(getCategoryLabel(c))}
    </button>
  `).join('');
}

if (albumCover && bioConfig.avatar) {
  albumCover.src = bioConfig.avatar;
}

/* ============ MUSIC ============ */

const tracks =
  Array.isArray(bioConfig.tracks) && bioConfig.tracks.length
    ? bioConfig.tracks
    : [{
        title: 'Tên bài hát — nghệ sĩ',
        file: 'song1.mp3',
        disc: 'images1.png'
      }];

let currentTrackIndex = Number.isInteger(bioConfig.defaultIndex)
  ? bioConfig.defaultIndex
  : 0;

function getTrackTitle(track) {
  return String(track?.title || 'Không tên').trim() || 'Không tên';
}

/*
 * FIX QUAN TRỌNG:
 * Tooltip của music-title lấy trực tiếp từ data-tooltip.
 * Mỗi lần bài hát đổi, hàm này đổi cả:
 *   1. textContent
 *   2. data-tooltip
 * Global MutationObserver phía dưới sẽ cập nhật tooltip
 * NGAY LẬP TỨC, kể cả khi con trỏ đang hover sẵn.
 */
function updateMusicTooltip(track) {
  if (!musicTitle) return;

  const title = getTrackTitle(track);
  const parts = title.split(/\s+-\s+/);
  const song = parts.shift()?.trim() || title;
  const artist = parts.join(' - ').trim();

  let mainEl = musicTitle.querySelector('.music-title-main');
  let sepEl = musicTitle.querySelector('.music-title-sep');
  let artistEl = musicTitle.querySelector('.music-title-artist');

  if (!mainEl || !sepEl || !artistEl) {
    musicTitle.textContent = '';

    mainEl = document.createElement('span');
    mainEl.className = 'music-title-main';

    sepEl = document.createElement('span');
    sepEl.className = 'music-title-sep';

    artistEl = document.createElement('span');
    artistEl.className = 'music-title-artist';

    musicTitle.append(mainEl, sepEl, artistEl);
  }

  mainEl.textContent = song;
  sepEl.textContent = artist ? '—' : '';
  artistEl.textContent = artist;
  artistEl.style.display = artist ? '' : 'none';
  musicTitle.setAttribute('data-tooltip', title);
}

function applyTrack(index, autoplay) {
  if (!tracks.length || !music) return;

  const wasPlaying =
    autoplay !== undefined
      ? autoplay
      : !music.paused;

  currentTrackIndex =
    (index + tracks.length) % tracks.length;

  const track = tracks[currentTrackIndex];
  const title = getTrackTitle(track);

  updateMusicTooltip(track);

  if (discLabel) {
    const discUrl = track.disc
      ? String(track.disc).replace(/'/g, "\\'")
      : '';

    discLabel.style.backgroundImage =
      discUrl ? `url('${discUrl}')` : '';
  }

  if (discCover) {
    discCover.setAttribute(
      'data-tooltip',
      title
    );
  }

  if (track.file) {
    const source = music.querySelector('source');

    if (source) {
      source.src = track.file;
      music.load();

      if (wasPlaying) {
        music.play().catch(() => {});
      }
    }
  }

  updateTrackListActiveState();
}

function renderTrackList() {
  if (!trackListEl) return;

  const filtered = tracks
    .map((t, i) => ({ t, i }))
    .filter(({ t }) =>
      currentCategory === 'all' ||
      t.category === currentCategory
    );

  if (!filtered.length) {
    trackListEl.innerHTML =
      '<li class="track-list-empty">Không có bài hát nào trong mục này</li>';
    cacheTrackMiniBars();
    return;
  }

  trackListEl.innerHTML = filtered.map(({ t, i }) => {
    const title = getTrackTitle(t);

    return `
      <li
        class="track-item${i === currentTrackIndex ? ' active' : ''}"
        data-index="${i}"
        data-tooltip="${escapeHtml(title)}">
        <span class="t-index">${i + 1}</span>
        <img
          class="t-cover"
          src="${escapeHtml(t.disc || '')}"
          alt=""
          loading="lazy">
        <div class="t-info">
          <p class="t-title">${escapeHtml(title)}</p>
          ${t.category
            ? `<span class="t-category">${escapeHtml(
                getCategoryLabel(t.category)
              )}</span>`
            : ''}
        </div>
        <div class="mini-bars">
          <span class="m-bar"></span>
          <span class="m-bar"></span>
          <span class="m-bar"></span>
        </div>
      </li>
    `;
  }).join('');

  cacheTrackMiniBars();
}

function updateTrackListActiveState() {
  if (!trackListEl) return;

  trackListEl
    .querySelectorAll('.track-item')
    .forEach(item => {
      item.classList.toggle(
        'active',
        Number(item.dataset.index) ===
          currentTrackIndex
      );
    });
}

function openTrackList() {
  if (!trackListPanel) return;

  trackListPanel.classList.add('open');

  if (trackMenuBtn) {
    trackMenuBtn.setAttribute(
      'aria-expanded',
      'true'
    );
  }
}

function closeTrackList() {
  if (!trackListPanel) return;

  trackListPanel.classList.remove('open');

  if (trackMenuBtn) {
    trackMenuBtn.setAttribute(
      'aria-expanded',
      'false'
    );
  }
}

if (trackCategoryFiltersEl) {
  trackCategoryFiltersEl.addEventListener(
    'click',
    e => {
      e.stopPropagation();

      const chip =
        e.target.closest('.category-chip');

      if (!chip) return;

      currentCategory =
        chip.dataset.category || 'all';

      renderCategoryFilters();
      renderTrackList();
    }
  );
}

if (trackMenuBtn && trackListPanel) {
  renderCategoryFilters();
  renderTrackList();

  trackMenuBtn.addEventListener(
    'click',
    e => {
      e.stopPropagation();

      trackListPanel.classList.contains('open')
        ? closeTrackList()
        : openTrackList();
    }
  );

  if (trackListClose) {
    trackListClose.addEventListener(
      'click',
      e => {
        e.stopPropagation();
        closeTrackList();
      }
    );
  }

  if (trackListEl) {
    trackListEl.addEventListener(
      'click',
      e => {
        const item =
          e.target.closest('.track-item');

        if (!item) return;

        applyTrack(
          Number(item.dataset.index),
          true
        );

        closeTrackList();
      }
    );
  }
}

if (tracks.length) {
  if (
    currentTrackIndex < 0 ||
    currentTrackIndex >= tracks.length
  ) {
    currentTrackIndex = 0;
  }

  applyTrack(currentTrackIndex);
}

function setMusicState(isPlaying) {
  if (musicBox) {
    musicBox.classList.toggle(
      'is-playing',
      isPlaying
    );
  }

  if (disc) {
    disc.setAttribute(
      'aria-pressed',
      isPlaying ? 'true' : 'false'
    );

    disc.setAttribute(
      'data-tooltip',
      isPlaying
        ? 'Tạm dừng nhạc'
        : 'Phát nhạc'
    );
  }

  if (discTip) {
    const tip = isPlaying
      ? 'đang phát — bấm để tắt'
      : 'bấm để phát nhạc';

    discTip.textContent = tip;
    discTip.setAttribute(
      'data-tooltip',
      tip
    );
  }
}

/* ============ GATE ============ */
const prefersReducedMotion =
  window.matchMedia &&
  window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

function spawnGateBurst(x, y) {
  if (prefersReducedMotion) return;

  const burst =
    document.createElement('div');

  burst.className = 'gate-burst';

  const size = 220;

  burst.style.left = x + 'px';
  burst.style.top = y + 'px';
  burst.style.width = size + 'px';
  burst.style.height = size + 'px';

  document.body.appendChild(burst);

  burst.addEventListener(
    'animationend',
    () => burst.remove(),
    { once: true }
  );
}

if (gate) {
  gate.addEventListener(
    'click',
    e => {
      const cx =
        e.clientX ||
        window.innerWidth / 2;

      const cy =
        e.clientY ||
        window.innerHeight / 2;

      spawnGateBurst(cx, cy);

      gate.classList.add('hidden');

      setTimeout(() => {
        gate.hidden = true;

        if (main) {
          main.hidden = false;
        }

        requestAnimationFrame(() => {
          if (card) card.classList.add('in');
          if (dock) dock.classList.add('in');
          if (dash) dash.classList.add('in');
        });

        if (bgVideo) {
          bgVideo.play().catch(() => {});
        }

        if (music) {
          music.play()
            .then(() => setMusicState(true))
            .catch(() => setMusicState(false));
        }
      }, 600);
    }
  );
}

/* ============ CARD TILT ============ */
if (
  card &&
  window.matchMedia &&
  window.matchMedia(
    '(hover:hover) and (pointer:fine)'
  ).matches &&
  !prefersReducedMotion
) {
  let tiltRAF = null;
  let lastPx = 0;
  let lastPy = 0;

  card.addEventListener(
    'mouseenter',
    () => card.classList.add('tilt-ready')
  );

  card.addEventListener(
    'mousemove',
    e => {
      if (!card.classList.contains('in')) return;

      const rect =
        card.getBoundingClientRect();

      const px =
        (e.clientX - rect.left) /
          rect.width -
        0.5;

      const py =
        (e.clientY - rect.top) /
          rect.height -
        0.5;

      if (
        Math.abs(px - lastPx) < 0.01 &&
        Math.abs(py - lastPy) < 0.01
      ) return;

      lastPx = px;
      lastPy = py;

      if (tiltRAF) {
        cancelAnimationFrame(tiltRAF);
      }

      tiltRAF =
        requestAnimationFrame(() => {
          card.style.transform =
            `translateY(0) scale(1) rotateX(${(-py * 3).toFixed(2)}deg) rotateY(${(px * 4).toFixed(2)}deg)`;
        });
    }
  );

  card.addEventListener(
    'mouseleave',
    () => {
      if (tiltRAF) {
        cancelAnimationFrame(tiltRAF);
      }

      card.style.transform =
        'translateY(0) scale(1) rotateX(0deg) rotateY(0deg)';
    }
  );
}

/* ============ MEDIA EVENTS ============ */
if (music) {
  music.addEventListener(
    'play',
    () => setMusicState(true)
  );

  music.addEventListener(
    'pause',
    () => setMusicState(false)
  );

  music.addEventListener(
    'ended',
    () => applyTrack(
      currentTrackIndex + 1,
      true
    )
  );
}

if (disc) {
  disc.addEventListener(
    'click',
    () => {
      if (!music) return;

      if (music.paused) {
        music.play().catch(() => {});
      } else {
        music.pause();
      }
    }
  );
}

if (musicPrev) {
  musicPrev.addEventListener(
    'click',
    () => applyTrack(
      currentTrackIndex - 1,
      true
    )
  );
}

if (musicNext) {
  musicNext.addEventListener(
    'click',
    () => applyTrack(
      currentTrackIndex + 1,
      true
    )
  );
}

/* ============ PROGRESS ============ */
const progressContainer =
  document.getElementById(
    'progress-container'
  );

const progressFill =
  document.getElementById(
    'progress-fill'
  );

const currentTimeEl =
  document.getElementById(
    'current-time'
  );

const durationTimeEl =
  document.getElementById(
    'duration-time'
  );

function formatTime(seconds) {
  if (isNaN(seconds)) return '0:00';

  const mins =
    Math.floor(seconds / 60);

  const secs =
    Math.floor(seconds % 60);

  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

if (music) {
  music.addEventListener(
    'loadedmetadata',
    () => {
      if (durationTimeEl) {
        durationTimeEl.textContent =
          formatTime(music.duration);
      }
    }
  );

  music.addEventListener(
    'timeupdate',
    () => {
      if (!music.duration) return;

      const percent =
        music.currentTime /
        music.duration;

      if (progressFill) {
        progressFill.style.transform =
          `scaleX(${percent})`;
      }

      if (currentTimeEl) {
        currentTimeEl.textContent =
          formatTime(music.currentTime);
      }
    }
  );
}

if (progressContainer) {
  progressContainer.addEventListener(
    'click',
    e => {
      const rect =
        progressContainer.getBoundingClientRect();

      const percent =
        (e.clientX - rect.left) /
        rect.width;

      if (music && music.duration) {
        music.currentTime =
          Math.max(
            0,
            Math.min(1, percent)
          ) * music.duration;
      }
    }
  );
}

/* ============ VOLUME ============ */
const volumeBtn =
  document.getElementById(
    'volume-btn'
  );

const volumeSliderContainer =
  document.getElementById(
    'volume-slider-container'
  );

const volumeSliderFill =
  document.getElementById(
    'volume-slider-fill'
  );

const volWave =
  document.querySelector('.vol-wave');

const VOLUME_STORAGE_KEY =
  'bio-music-volume';

const LAST_VOLUME_STORAGE_KEY =
  'bio-music-last-volume';

function loadStoredVolume() {
  try {
    const raw =
      localStorage.getItem(
        VOLUME_STORAGE_KEY
      );

    const val = parseFloat(raw);

    if (
      !isNaN(val) &&
      val >= 0 &&
      val <= 1
    ) {
      return val;
    }
  } catch (e) {}

  return 1;
}

function loadStoredLastVolume(fallback) {
  try {
    const raw =
      localStorage.getItem(
        LAST_VOLUME_STORAGE_KEY
      );

    const val = parseFloat(raw);

    if (
      !isNaN(val) &&
      val > 0 &&
      val <= 1
    ) {
      return val;
    }
  } catch (e) {}

  return fallback;
}

function saveVolume(val) {
  try {
    localStorage.setItem(
      VOLUME_STORAGE_KEY,
      String(val)
    );
  } catch (e) {}
}

function saveLastVolume(val) {
  try {
    localStorage.setItem(
      LAST_VOLUME_STORAGE_KEY,
      String(val)
    );
  } catch (e) {}
}

const initialVolume =
  loadStoredVolume();

let lastVolume =
  loadStoredLastVolume(
    initialVolume > 0
      ? initialVolume
      : 1
  );

function updateVolume(
  val,
  persist = true
) {
  val =
    Math.max(
      0,
      Math.min(1, val)
    );

  if (music) {
    music.volume = val;
  }

  if (volumeSliderFill) {
    volumeSliderFill.style.transform =
      `scaleX(${val})`;
  }

  if (volWave) {
    volWave.style.display =
      val === 0
        ? 'none'
        : 'block';
  }

  if (persist) {
    saveVolume(val);
  }
}

updateVolume(
  initialVolume,
  false
);

let isDraggingVol = false;

function handleVolMove(e) {
  if (!volumeSliderContainer) return;

  const rect =
    volumeSliderContainer.getBoundingClientRect();

  if (!rect.width) return;

  const percent =
    (e.clientX - rect.left) /
    rect.width;

  updateVolume(percent);
}

if (volumeSliderContainer) {
  volumeSliderContainer.addEventListener(
    'mousedown',
    e => {
      isDraggingVol = true;
      handleVolMove(e);
    }
  );
}

document.addEventListener(
  'mousemove',
  e => {
    if (!isDraggingVol) return;

    e.preventDefault();
    handleVolMove(e);
  }
);

document.addEventListener(
  'mouseup',
  () => {
    isDraggingVol = false;
  }
);

if (volumeBtn) {
  volumeBtn.addEventListener(
    'click',
    () => {
      const currentVol =
        music ? music.volume : 1;

      if (currentVol > 0) {
        lastVolume = currentVol;
        saveLastVolume(lastVolume);
        updateVolume(0);
      } else {
        updateVolume(
          lastVolume || 1
        );
      }
    }
  );
}

/* ============ VISUALIZER ============ */
let audioCtx = null;
let analyser = null;
let source = null;
let isAudioContextInit = false;

/* FIX: mainBarsCache / miniBarsPerTrack / allMiniBarsFlat /
   visualizerDataArray / barsAreReset đã được khai báo sớm ở đầu file
   (xem section "BIẾN CƠ BẢN") để tránh lỗi TDZ ReferenceError. */

function cacheTrackMiniBars() {
  if (!trackListEl) return;

  const items =
    trackListEl.querySelectorAll(
      '.track-item'
    );

  miniBarsPerTrack =
    Array.from(items).map(item =>
      Array.from(
        item.querySelectorAll(
          '.m-bar'
        )
      )
    );

  allMiniBarsFlat =
    miniBarsPerTrack.flat();
}

cacheTrackMiniBars();

let rafId = null;

function initVisualizer() {
  if (
    isAudioContextInit ||
    !music
  ) {
    return;
  }

  const AudioContext =
    window.AudioContext ||
    window.webkitAudioContext;

  if (!AudioContext) return;

  audioCtx =
    new AudioContext();

  analyser =
    audioCtx.createAnalyser();

  analyser.fftSize = 256;

  visualizerDataArray =
    new Uint8Array(
      analyser.frequencyBinCount
    );

  source =
    audioCtx.createMediaElementSource(
      music
    );

  source.connect(analyser);
  analyser.connect(
    audioCtx.destination
  );

  isAudioContextInit = true;
}

const SAMPLE_INDICES = [
  1, 2, 4, 6, 8, 10,
  12, 14, 16, 18, 20, 22
];

const MINI_INDICES = [1, 4, 8];

function resetBarsOnce() {
  if (barsAreReset) return;

  mainBarsCache.forEach(
    bar => {
      bar.style.transform =
        'scaleY(0.08)';
    }
  );

  allMiniBarsFlat.forEach(
    bar => {
      bar.style.transform =
        'scaleY(0.1)';
    }
  );

  barsAreReset = true;
}

function renderFrame() {
  if (
    !analyser ||
    !visualizerDataArray ||
    music.paused
  ) {
    resetBarsOnce();
    rafId = null;
    return;
  }

  barsAreReset = false;

  analyser.getByteFrequencyData(
    visualizerDataArray
  );

  mainBarsCache.forEach(
    (bar, index) => {
      const value =
        visualizerDataArray[
          SAMPLE_INDICES[index]
        ] || 0;

      let scale =
        (value / 255) * 0.85;

      scale =
        Math.max(
          0.08,
          Math.min(1.0, scale)
        );

      bar.style.transform =
        `scaleY(${scale})`;
    }
  );

  if (
    trackListPanel &&
    trackListPanel.classList.contains(
      'open'
    )
  ) {
    const activeMiniBars =
      miniBarsPerTrack[
        currentTrackIndex
      ];

    if (
      activeMiniBars &&
      activeMiniBars.length
    ) {
      activeMiniBars.forEach(
        (mBar, index) => {
          const val =
            visualizerDataArray[
              MINI_INDICES[index]
            ] || 0;

          let miniScale =
            (val / 255) * 0.9;

          miniScale =
            Math.max(
              0.1,
              Math.min(
                1.0,
                miniScale
              )
            );

          mBar.style.transform =
            `scaleY(${miniScale})`;
        }
      );
    }
  }

  rafId =
    requestAnimationFrame(
      renderFrame
    );
}

if (music) {
  music.addEventListener(
    'play',
    () => {
      if (!isAudioContextInit) {
        initVisualizer();
      }

      if (
        audioCtx &&
        audioCtx.state ===
          'suspended'
      ) {
        audioCtx.resume().catch(
          () => {}
        );
      }

      if (rafId === null) {
        rafId =
          requestAnimationFrame(
            renderFrame
          );
      }
    }
  );

  music.addEventListener(
    'pause',
    () => {
      if (rafId !== null) {
        cancelAnimationFrame(
          rafId
        );

        rafId = null;
      }

      resetBarsOnce();
    }
  );
}

/* ============ DISCORD / LANYARD ============ */
(function initDiscord() {
  const dmpRoot =
    document.getElementById(
      'discord-mini-profile'
    );

  const dmpZone =
    document.getElementById(
      'dmp-nameplate-zone'
    ) || dmpRoot;

  const DMP_PALETTE_COLORS = {
    crimson: '#c53434',
    berry: '#c2266d',
    sky: '#3b82c4',
    teal: '#1f9a8e',
    forest: '#2f7d4f',
    bubble_gum: '#e85fa0',
    violet: '#8b5cf6',
    cobalt: '#3654c9',
    clover: '#4ca94c',
    lemon: '#d9b23c',
    white: '#e8e8e8'
  };

  function applyDmpNameplate({
    videoUrl,
    staticUrl,
    palette
  } = {}) {
    if (
      !dmpRoot ||
      (!videoUrl && !staticUrl)
    ) {
      return;
    }

    if (
      palette &&
      DMP_PALETTE_COLORS[palette]
    ) {
      dmpRoot.style.setProperty(
        '--dmp-nameplate-color',
        DMP_PALETTE_COLORS[palette]
      );
    }

    if (staticUrl) {
      dmpRoot.style.setProperty(
        '--dmp-nameplate',
        `url('${staticUrl}')`
      );
    }

    const reduced =
      window.matchMedia &&
      window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;

    if (
      videoUrl &&
      !reduced
    ) {
      const video =
        document.createElement(
          'video'
        );

      video.className =
        'dmp-nameplate-video';

      video.src = videoUrl;
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;

      video.setAttribute(
        'aria-hidden',
        'true'
      );

      video.onerror = () =>
        video.remove();

      dmpZone.prepend(video);

      video.play().catch(
        () => {}
      );
    }

    dmpRoot.classList.add(
      'has-nameplate'
    );
  }

  if (
    dmpRoot &&
    bioConfig.discordNameplateWorkerUrl
  ) {
    fetch(
      bioConfig.discordNameplateWorkerUrl
    )
      .then(res => res.json())
      .then(data => {
        if (
          data &&
          (
            data.nameplateUrl ||
            data.nameplateStaticUrl
          )
        ) {
          applyDmpNameplate({
            videoUrl:
              data.nameplateUrl,
            staticUrl:
              data.nameplateStaticUrl,
            palette:
              data.nameplatePalette
          });
        } else if (
          bioConfig.discordNameplateStaticUrl
        ) {
          applyDmpNameplate({
            staticUrl:
              bioConfig.discordNameplateStaticUrl
          });
        }
      })
      .catch(() => {
        if (
          bioConfig.discordNameplateStaticUrl
        ) {
          applyDmpNameplate({
            staticUrl:
              bioConfig.discordNameplateStaticUrl
          });
        }
      });
  } else if (
    dmpRoot &&
    bioConfig.discordNameplateStaticUrl
  ) {
    applyDmpNameplate({
      staticUrl:
        bioConfig.discordNameplateStaticUrl
    });
  }

  const discordId =
    bioConfig.discordId;

  if (!discordId) return;

  const dmpAvatar =
    document.getElementById(
      'dmp-avatar'
    );

  const dmpDecoration =
    document.getElementById(
      'dmp-decoration'
    );

  const dmpUsername =
    document.getElementById(
      'dmp-username'
    );

  const dmpBadges =
    document.getElementById(
      'dmp-badges'
    );

  const dmpActivity =
    document.getElementById(
      'dmp-activity'
    );

  const STATUS_LABEL = {
    online: ' Trực tuyến',
    idle: ' Đang chờ',
    dnd: ' Không làm phiền',
    offline: 'Ngoại tuyến'
  };

  const ACTIVITY_TYPE_LABEL = {
    0: 'Đang chơi',
    1: 'Đang livestream',
    2: 'Đang nghe',
    3: 'Đang xem',
    5: 'Đang thi đấu'
  };

  function activityImageUrl(
    activity,
    key
  ) {
    if (
      !activity ||
      !activity.assets
    ) {
      return null;
    }

    const img =
      activity.assets[key];

    if (!img) return null;

    if (
      img.startsWith(
        'mp:external/'
      )
    ) {
      return `https://media.discordapp.net/external/${img.slice('mp:external/'.length)}`;
    }

    if (
      img.startsWith('spotify:')
    ) {
      return `https://i.scdn.co/image/${img.slice('spotify:'.length)}`;
    }

    if (
      img.startsWith('mp:')
    ) {
      return `https://media.discordapp.net/${img.slice(3)}`;
    }

    if (activity.application_id) {
      return `https://cdn.discordapp.com/app-assets/${activity.application_id}/${img}.png`;
    }

    return null;
  }

  function pickActivityCard(data) {
    if (
      data.listening_to_spotify &&
      data.spotify
    ) {
      const sp =
        data.spotify;

      return {
        name:
          '🎧 Đang nghe Spotify',
        details:
          sp.song || '',
        state:
          sp.artist
            ? `của ${sp.artist}`
            : '',
        image:
          sp.album_art_url || null,
        smallImage: null,
        start:
          sp.timestamps &&
          sp.timestamps.start
      };
    }

    const act =
      (data.activities || [])
        .find(a => a.type !== 4);

    if (!act) return null;

    return {
      name:
        `${ACTIVITY_TYPE_LABEL[act.type] || 'Đang hoạt động'} ${act.name || ''}`.trim(),
      details:
        act.details || '',
      state:
        act.state || '',
      image:
        activityImageUrl(
          act,
          'large_image'
        ),
      smallImage:
        activityImageUrl(
          act,
          'small_image'
        ),
      start:
        act.timestamps &&
        act.timestamps.start
    };
  }

  let activityTimerInterval = null;

  function startActivityTimer(
    startMs
  ) {
    clearInterval(
      activityTimerInterval
    );

    const el =
      document.getElementById(
        'dmp-act-time'
      );

    if (!el) return;

    if (!startMs) {
      el.textContent = '';
      return;
    }

    function tick() {
      const diff =
        Date.now() - startMs;

      if (diff < 0) {
        el.textContent = '';
        return;
      }

      const totalSec =
        Math.floor(
          diff / 1000
        );

      const h =
        Math.floor(
          totalSec / 3600
        );

      const m =
        Math.floor(
          (totalSec % 3600) / 60
        );

      const s =
        totalSec % 60;

      const mm =
        h > 0
          ? String(m).padStart(2, '0')
          : String(m);

      el.textContent =
        `⏱ ${h > 0 ? h + ':' : ''}${mm}:${String(s).padStart(2, '0')} đã trôi qua`;
    }

    tick();

    activityTimerInterval =
      setInterval(
        tick,
        1000
      );
  }

  let isActivityEnabledByUser = true;
  let currentCardData = null;

  const toggleBtn =
    document.getElementById(
      'toggle-activity-btn'
    );

  function setActivityPanel(
    cardData
  ) {
    currentCardData =
      cardData;

    const panel =
      document.getElementById(
        'dmp-activity-panel'
      );

    if (!panel) return;

    if (
      !isActivityEnabledByUser
    ) {
      panel.classList.add(
        'user-collapsed'
      );

      panel.classList.remove(
        'open'
      );

      panel.style.maxHeight =
        '0px';

      clearInterval(
        activityTimerInterval
      );

      return;
    }

    if (!cardData) {
      panel.classList.remove(
        'open'
      );

      panel.style.maxHeight =
        '0px';

      clearInterval(
        activityTimerInterval
      );

      return;
    }

    const imgEl =
      document.getElementById(
        'dmp-act-img'
      );

    const imgSmallEl =
      document.getElementById(
        'dmp-act-img-small'
      );

    const nameEl =
      document.getElementById(
        'dmp-act-name'
      );

    const detailsEl =
      document.getElementById(
        'dmp-act-details'
      );

    const stateEl =
      document.getElementById(
        'dmp-act-state'
      );

    if (imgEl) {
      if (cardData.image) {
        imgEl.src =
          cardData.image;

        imgEl.style.display =
          'block';
      } else {
        imgEl.style.display =
          'none';
      }
    }

    if (imgSmallEl) {
      if (cardData.smallImage) {
        imgSmallEl.src =
          cardData.smallImage;

        imgSmallEl.style.display =
          'block';
      } else {
        imgSmallEl.style.display =
          'none';
      }
    }

    if (nameEl) {
      nameEl.textContent =
        cardData.name || '';
    }

    if (detailsEl) {
      detailsEl.textContent =
        cardData.details || '';

      detailsEl.style.display =
        cardData.details
          ? 'block'
          : 'none';
    }

    if (stateEl) {
      stateEl.textContent =
        cardData.state || '';

      stateEl.style.display =
        cardData.state
          ? 'block'
          : 'none';
    }

    startActivityTimer(
      cardData.start
    );

    panel.classList.remove(
      'user-collapsed'
    );

    panel.classList.add(
      'open'
    );

    requestAnimationFrame(
      () => {
        panel.style.maxHeight =
          panel.scrollHeight +
          'px';
      }
    );
  }

  if (toggleBtn) {
    toggleBtn.addEventListener(
      'click',
      e => {
        e.stopPropagation();

        isActivityEnabledByUser =
          !isActivityEnabledByUser;

        const panel =
          document.getElementById(
            'dmp-activity-panel'
          );

        toggleBtn.classList.toggle(
          'is-disabled',
          !isActivityEnabledByUser
        );

        toggleBtn.setAttribute(
          'data-tooltip',
          isActivityEnabledByUser
            ? 'Ẩn hoạt động'
            : 'Hiện hoạt động'
        );

        if (
          !isActivityEnabledByUser
        ) {
          if (panel) {
            panel.classList.add(
              'user-collapsed'
            );

            panel.classList.remove(
              'open'
            );

            panel.style.maxHeight =
              '0px';
          }

          clearInterval(
            activityTimerInterval
          );
        } else {
          if (panel) {
            panel.classList.remove(
              'user-collapsed'
            );
          }

          if (currentCardData) {
            setActivityPanel(
              currentCardData
            );
          }
        }
      }
    );
  }

  const BADGE_FLAGS = [
    { bit: 1 << 0, icon: '👷', label: 'Discord Staff' },
    { bit: 1 << 1, icon: '🤝', label: 'Partnered Server Owner' },
    { bit: 1 << 2, icon: '🎉', label: 'HypeSquad Events' },
    { bit: 1 << 3, icon: '🐛', label: 'Bug Hunter Level 1' },
    { bit: 1 << 6, icon: '💪', label: 'HypeSquad Bravery' },
    { bit: 1 << 7, icon: '💎', label: 'HypeSquad Brilliance' },
    { bit: 1 << 8, icon: '⚖️', label: 'HypeSquad Balance' },
    { bit: 1 << 9, icon: '🌱', label: 'Early Supporter' },
    { bit: 1 << 14, icon: '🐞', label: 'Bug Hunter Level 2' },
    { bit: 1 << 17, icon: '⭐', label: 'Early Verified Bot Developer' },
    { bit: 1 << 18, icon: '🛡️', label: 'Certified Moderator' },
    { bit: 1 << 22, icon: '💻', label: 'Active Developer' }
  ];

  function avatarUrl(data) {
    if (!data.discord_user) return '';

    const {
      id,
      avatar,
      discriminator
    } = data.discord_user;

    if (avatar) {
      const ext =
        avatar.startsWith('a_')
          ? 'gif'
          : 'png';

      return `https://cdn.discordapp.com/avatars/${id}/${avatar}.${ext}?size=128`;
    }

    const fallbackIndex =
      discriminator &&
      discriminator !== '0'
        ? Number(discriminator) % 5
        : Number(
            (BigInt(id) >> 22n) % 6n
          );

    return `https://cdn.discordapp.com/embed/avatars/${fallbackIndex}.png`;
  }

  function decorationUrl(data) {
    const deco =
      data.discord_user &&
      data.discord_user
        .avatar_decoration_data;

    if (!deco || !deco.asset) {
      return null;
    }

    return `https://cdn.discordapp.com/avatar-decoration-presets/${deco.asset}.png?size=128`;
  }

  function renderBadges(data) {
    if (!dmpBadges) return;

    const flags =
      (data.discord_user &&
        data.discord_user.public_flags) ||
      0;

    dmpBadges.innerHTML =
      BADGE_FLAGS
        .filter(
          b =>
            (flags & b.bit) !== 0
        )
        .map(
          b =>
            `<span class="dmp-badge" data-tooltip="${escapeHtml(b.label)}">${b.icon}</span>`
        )
        .join('');
  }

  function activityText(data) {
    const custom =
      (data.activities || [])
        .find(a => a.type === 4);

    if (
      custom &&
      (custom.state || custom.emoji)
    ) {
      const emoji =
        custom.emoji
          ? (
              custom.emoji.name
                ? custom.emoji.name + ' '
                : ''
            )
          : '';

      return (
        `${emoji}${custom.state || ''}`
      ).trim();
    }

    if (
      data.listening_to_spotify &&
      data.spotify
    ) {
      return `🎧 ${data.spotify.song} — ${data.spotify.artist}`;
    }

    const game =
      (data.activities || [])
        .find(a => a.type === 0);

    if (game && game.name) {
      return `🎮 Đang chơi ${game.name}`;
    }

    return (
      STATUS_LABEL[
        data.discord_status
      ] ||
      STATUS_LABEL.offline
    );
  }

  function applyStatus(data) {
    if (
      !data ||
      !data.discord_user
    ) {
      return;
    }

    const username =
      data.discord_user.global_name ||
      data.discord_user.username ||
      'Unknown';

    const avatar =
      avatarUrl(data);

    const decoration =
      decorationUrl(data);

    const activity =
      activityText(data);

    if (dmpAvatar) {
      dmpAvatar.src = avatar;
    }

    if (dmpUsername) {
      dmpUsername.textContent =
        username;
    }

    if (dmpActivity) {
      dmpActivity.textContent =
        activity;
    }

    if (dmpRoot) {
      dmpRoot.classList.add('in');
    }

    const statusDot =
      document.getElementById(
        'dmp-status-dot'
      );

    if (statusDot) {
      const status =
        [
          'online',
          'idle',
          'dnd',
          'offline'
        ].includes(
          data.discord_status
        )
          ? data.discord_status
          : 'offline';

      statusDot.className =
        'dmp-status-dot ' +
        status;
    }

    if (dmpDecoration) {
      if (decoration) {
        dmpDecoration.src =
          decoration;

        dmpDecoration.style.display =
          'block';
      } else {
        dmpDecoration.style.display =
          'none';
      }
    }

    renderBadges(data);

    setActivityPanel(
      pickActivityCard(data)
    );
  }

  fetch(
    `https://api.lanyard.rest/v1/users/${discordId}`
  )
    .then(res => res.json())
    .then(json => {
      if (json.success) {
        applyStatus(json.data);
      }
    })
    .catch(() => {
      if (dmpActivity) {
        dmpActivity.textContent =
          'không tải được trạng thái';
      }
    });

  let ws = null;
  let heartbeatInterval = null;

  function connectLanyardSocket() {
    ws =
      new WebSocket(
        'wss://api.lanyard.rest/socket'
      );

    ws.onmessage = event => {
      let msg;

      try {
        msg = JSON.parse(
          event.data
        );
      } catch {
        return;
      }

      switch (msg.op) {
        case 1:
          heartbeatInterval =
            setInterval(() => {
              if (
                ws.readyState ===
                WebSocket.OPEN
              ) {
                ws.send(
                  JSON.stringify({
                    op: 3
                  })
                );
              }
            }, msg.d.heartbeat_interval);

          ws.send(
            JSON.stringify({
              op: 2,
              d: {
                subscribe_to_id:
                  discordId
              }
            })
          );
          break;

        case 0:
          if (
            msg.t === 'INIT_STATE' ||
            msg.t === 'PRESENCE_UPDATE'
          ) {
            applyStatus(msg.d);
          }
          break;
      }
    };

    ws.onclose = () => {
      clearInterval(
        heartbeatInterval
      );

      setTimeout(
        connectLanyardSocket,
        5000
      );
    };

    ws.onerror = () => {
      try {
        ws.close();
      } catch {}
    };
  }

  connectLanyardSocket();
})();

/* ============ FOOTER ============ */
(function initFooterTerminal() {
  const footEl =
    document.getElementById(
      'footer-bar'
    );

  const typedEl =
    document.getElementById(
      'foot-typed'
    );

  if (!footEl || !typedEl) return;

  const REDUCED_MOTION =
    window.matchMedia &&
    window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

  const lines = [
    'cập nhật lần cuối · tháng 8, 2026',
    'hmm ✦',
    'hmm ✦'
  ];

  let currentIndex = 0;
  let generation = 0;
  let running = false;

  const sleep = ms =>
    new Promise(
      resolve =>
        setTimeout(resolve, ms)
    );

  async function typeText(
    text,
    gen,
    erase
  ) {
    const chars =
      Array.from(text);

    if (REDUCED_MOTION) {
      typedEl.textContent =
        erase ? '' : text;
      return;
    }

    let i =
      erase
        ? chars.length
        : 0;

    while (true) {
      if (
        gen !== generation
      ) {
        return;
      }

      typedEl.textContent =
        chars
          .slice(0, i)
          .join('');

      if (!erase) {
        i++;
        if (i > chars.length) {
          return;
        }
      } else {
        i--;
        if (i < 0) {
          return;
        }
      }

      await sleep(
        erase ? 16 : 40
      );
    }
  }

  async function goToNextLine() {
    if (running) return;

    running = true;
    generation++;

    const gen =
      generation;

    const nextIndex =
      (currentIndex + 1) %
      lines.length;

    await typeText(
      lines[currentIndex],
      gen,
      true
    );

    if (
      gen !== generation
    ) {
      running = false;
      return;
    }

    await typeText(
      lines[nextIndex],
      gen,
      false
    );

    if (
      gen === generation
    ) {
      currentIndex =
        nextIndex;

      running = false;
    }
  }

  footEl.addEventListener(
    'click',
    goToNextLine
  );

  footEl.addEventListener(
    'keydown',
    e => {
      if (
        e.key === 'Enter' ||
        e.key === ' '
      ) {
        e.preventDefault();
        goToNextLine();
      }
    }
  );

  typedEl.textContent =
    lines[currentIndex];
})();

/* ============ VIEW COUNTER ============ */
(function () {
  const VIEW_API =
    'https://views.ten870865.workers.dev';

  const OWNER_STORAGE_KEY =
    'bio_is_owner';

  const OWNER_URLKEY_STORAGE =
    'bio_owner_key';

  function checkOwnerFromUrl() {
    const params =
      new URLSearchParams(
        location.search
      );

    const key =
      params.get('key');

    if (key) {
      try {
        localStorage.setItem(
          OWNER_STORAGE_KEY,
          '1'
        );

        localStorage.setItem(
          OWNER_URLKEY_STORAGE,
          key
        );
      } catch (e) {}

      params.delete('key');

      const clean =
        location.pathname +
        (
          params.toString()
            ? '?' + params.toString()
            : ''
        );

      history.replaceState(
        {},
        '',
        clean
      );
    }
  }

  function isOwner() {
    try {
      return (
        localStorage.getItem(
          OWNER_STORAGE_KEY
        ) === '1'
      );
    } catch (e) {
      return false;
    }
  }

  function getStoredKey() {
    try {
      return (
        localStorage.getItem(
          OWNER_URLKEY_STORAGE
        ) || ''
      );
    } catch (e) {
      return '';
    }
  }

  function showViewCount(count) {
    let el =
      document.getElementById(
        'owner-view-count'
      );

    if (!el) {
      el =
        document.createElement(
          'div'
        );

      el.id =
        'owner-view-count';

      el.style.cssText =
        'position:fixed;bottom:12px;right:12px;z-index:200;' +
        'font-family:"IBM Plex Mono",monospace;font-size:11px;letter-spacing:.04em;' +
        'background:rgba(20,16,15,.72);color:#fff8ee;padding:6px 12px;border-radius:20px;' +
        'backdrop-filter:blur(6px);pointer-events:none;';

      document.body.appendChild(el);
    }

    el.textContent =
      '👁 ' +
      count.toLocaleString('vi-VN') +
      ' views';
  }

  checkOwnerFromUrl();

  const ownerNow =
    isOwner();

  if (!ownerNow) {
    fetch(
      VIEW_API + '/hit',
      { method: 'POST' }
    ).catch(() => {});
  }

  if (ownerNow) {
    const key =
      getStoredKey();

    fetch(
      VIEW_API +
      '/count?key=' +
      encodeURIComponent(key)
    )
      .then(r => r.json())
      .then(data => {
        if (
          typeof data.count ===
          'number'
        ) {
          showViewCount(
            data.count
          );
        }
      })
      .catch(() => {});
  }
})();

/* ============ ĐỒNG HỒ VIỆT NAM ============ */
(function () {
  const clockEl =
    document.getElementById(
      'vn-clock'
    );

  if (!clockEl) return;

  const timeFormatter =
    new Intl.DateTimeFormat(
      'vi-VN',
      {
        timeZone:
          'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }
    );

  const dateFormatter =
    new Intl.DateTimeFormat(
      'vi-VN',
      {
        timeZone:
          'Asia/Ho_Chi_Minh',
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }
    );

  function capitalize(str) {
    return (
      str.charAt(0).toUpperCase() +
      str.slice(1)
    );
  }

  function tick() {
    const now =
      new Date();

    clockEl.textContent =
      `Việt Nam (UTC+7) · ${capitalize(dateFormatter.format(now))} · ${timeFormatter.format(now)}`;
  }

  tick();

  setInterval(
    tick,
    1000
  );
})();

/* ============ META ROW: NGÀY THÁNG + THỜI TIẾT ============ */
(function initDateWeather() {
  'use strict';

  const weekdayEl = document.getElementById('date-weekday');
  const fullEl = document.getElementById('date-full');
  const tempEl = document.getElementById('weather-temp');
  const descEl = document.getElementById('weather-desc');
  const iconEl = document.getElementById('weather-icon');

  if (!weekdayEl && !fullEl && !tempEl) return;

  // Toạ độ Đà Nẵng, Việt Nam — đổi nếu cần vị trí khác.
  const LAT = 16.0544;
  const LON = 108.2022;

  const weekdayFormatter = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'long'
  });
  const fullDateFormatter = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function updateDate() {
    const now = new Date();
    if (weekdayEl) weekdayEl.textContent = capitalize(weekdayFormatter.format(now));
    if (fullEl) fullEl.textContent = fullDateFormatter.format(now).replace(/\//g, '/');
  }

  // WMO weather codes -> icon + mô tả tiếng Việt.
  const WEATHER_CODES = {
    0: ['☀️', 'Trời quang'],
    1: ['🌤️', 'Ít mây'],
    2: ['⛅', 'Có mây'],
    3: ['☁️', 'Nhiều mây'],
    45: ['🌫️', 'Sương mù'],
    48: ['🌫️', 'Sương mù'],
    51: ['🌦️', 'Mưa phùn nhẹ'],
    53: ['🌦️', 'Mưa phùn'],
    55: ['🌧️', 'Mưa phùn dày'],
    61: ['🌧️', 'Mưa nhỏ'],
    63: ['🌧️', 'Mưa vừa'],
    65: ['🌧️', 'Mưa to'],
    80: ['🌦️', 'Mưa rào nhẹ'],
    81: ['🌧️', 'Mưa rào'],
    82: ['⛈️', 'Mưa rào lớn'],
    95: ['⛈️', 'Dông'],
    96: ['⛈️', 'Dông kèm mưa đá'],
    99: ['⛈️', 'Dông kèm mưa đá']
  };

  async function updateWeather() {
    if (!tempEl) return;
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,weather_code&timezone=Asia%2FHo_Chi_Minh`;
      const response = await fetch(url, {cache: 'no-store'});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const temp = data?.current?.temperature_2m;
      const code = data?.current?.weather_code;
      if (typeof temp === 'number') tempEl.textContent = `${Math.round(temp)}°C`;
      const [icon, desc] = WEATHER_CODES[code] || ['🌡️', 'Đà Nẵng'];
      if (iconEl) iconEl.textContent = icon;
      if (descEl) descEl.textContent = desc;
    } catch (error) {
      console.warn('[WEATHER] Không lấy được dữ liệu thời tiết:', error);
      if (descEl) descEl.textContent = 'Đà Nẵng';
    }
  }

  updateDate();
  updateWeather();

  setInterval(updateDate, 60 * 1000);
  setInterval(updateWeather, 15 * 60 * 1000);
})();


/* ============================================================
 * LỊCH SỰ KIỆN VIỆT NAM + QUỐC TẾ (BẢN SỬA)
 * ============================================================
 * Thay thế toàn bộ IIFE initVietnamCalendar() cũ bằng bản này.
 * ============================================================ */
(function initVietnamCalendar() {
  'use strict';

  const TIME_ZONE = 'Asia/Ho_Chi_Minh';
  const AM_LICH_API = 'https://huyenminh.com.vn/api/amlich';
  const CACHE_KEY = 'vn-calendar-amlich-cache-v4';
  const CACHE_TTL = 30 * 24 * 60 * 60 * 1000;

  const btn = document.getElementById('vn-calendar-btn');
  const popover = document.getElementById('vn-calendar-popover');
  const closeBtn = document.getElementById('vn-calendar-close');
  const nextCard = document.getElementById('vn-calendar-next');
  const nextName = document.getElementById('vn-calendar-next-name');
  const nextDates = document.getElementById('vn-calendar-next-dates');
  const nextCount = document.getElementById('vn-calendar-next-count');
  const listEl = document.getElementById('vn-calendar-events');
  const listCountEl = document.getElementById('vn-calendar-list-count');
  const yearLabelEl = document.getElementById('vn-calendar-year-label');
  const subEl = document.getElementById('vn-calendar-sub');
  const syncEl = document.getElementById('vn-calendar-sync');
  const filterEl = document.getElementById('vn-calendar-filter');
  const detail = document.getElementById('vn-calendar-detail');
  const detailPanel = detail?.querySelector('.vn-calendar-detail-panel');
  const detailCloseBtn = document.getElementById('vn-calendar-detail-close');
  const detailTitle = document.getElementById('vn-calendar-detail-title');
  const detailMeta = document.getElementById('vn-calendar-detail-meta');
  const detailType = document.getElementById('vn-calendar-detail-type');
  const detailCountdownLabel = document.querySelector('.vn-calendar-detail-countdown-label');
  const detailDays = document.getElementById('detail-days');
  const detailHours = document.getElementById('detail-hours');
  const detailMinutes = document.getElementById('detail-minutes');
  const detailSeconds = document.getElementById('detail-seconds');
  const detailNow = document.getElementById('vn-calendar-detail-now');
  const backdrop = document.getElementById('vn-calendar-backdrop');
  const bioCard = document.querySelector('.card');

  if (!btn || !popover || !closeBtn || !nextCard || !nextName || !nextDates || !nextCount || !listEl) return;

  if (detail && detail.parentElement !== nextCard) {
    nextCard.appendChild(detail);
  }

  let selectedEvent = null;
  // true khi popover đang ở chế độ góc (đặt cạnh bio card, desktop)
  // false khi đang ở chế độ giữa màn hình (mobile / không đủ chỗ)
  let isCornerMode = false;

  /* ================= ICON SỰ KIỆN — ĐA DẠNG, ĐẶC SẮC HƠN ================= */
  // Mỗi sự kiện dùng emoji/icon riêng biệt, tránh trùng lặp, gợi hình rõ.
  const EVENTS = [
    // ===== VIỆT NAM — CHÍNH THỨC =====
    { id:'tet-duong-lich', title:'Tết Dương lịch', icon:'🎆', kind:'official', solar:{day:1,month:1} },
    { id:'thanh-lap-dang', title:'Ngày thành lập Đảng Cộng sản Việt Nam', icon:'🚩', kind:'official', solar:{day:3,month:2} },
    { id:'hung-vuong', title:'Giỗ Tổ Hùng Vương', icon:'⛩️', kind:'official', lunar:{day:10,month:3,leap:false}, lunarLabel:'10/03 Âm lịch' },
    { id:'giai-phong-mien-nam', title:'Ngày Chiến thắng 30/4', icon:'🕊️', kind:'official', solar:{day:30,month:4} },
    { id:'quoc-khanh', title:'Quốc Khánh Việt Nam', icon:'🎇', kind:'official', solar:{day:2,month:9} },
    { id:'thuong-binh-liet-si', title:'Ngày Thương binh - Liệt sĩ', icon:'🕯️', kind:'official', solar:{day:27,month:7} },

    // ===== VIỆT NAM — NGÀY KỶ NIỆM =====
    { id:'hoc-sinh-sinh-vien', title:'Ngày truyền thống Học sinh, Sinh viên Việt Nam', icon:'🎒', kind:'vietnam', solar:{day:9,month:1} },
    { id:'thay-thuoc', title:'Ngày Thầy thuốc Việt Nam', icon:'⚕️', kind:'vietnam', solar:{day:27,month:2} },
    { id:'thanh-lap-doan', title:'Ngày thành lập Đoàn TNCS Hồ Chí Minh', icon:'🌾', kind:'vietnam', solar:{day:26,month:3} },
    { id:'sach-doc', title:'Ngày Sách và Văn hóa đọc Việt Nam', icon:'📖', kind:'vietnam', solar:{day:21,month:4} },
    { id:'dien-bien-phu', title:'Ngày Chiến thắng Điện Biên Phủ', icon:'🏔️', kind:'vietnam', solar:{day:7,month:5} },
    { id:'ho-chi-minh', title:'Ngày sinh Chủ tịch Hồ Chí Minh', icon:'🌸', kind:'vietnam', solar:{day:19,month:5} },
    { id:'thieu-nhi', title:'Ngày Quốc tế Thiếu nhi', icon:'🎈', kind:'vietnam', solar:{day:1,month:6} },
    { id:'bao-chi', title:'Ngày Báo chí Cách mạng Việt Nam', icon:'🗞️', kind:'vietnam', solar:{day:21,month:6} },
    { id:'cach-mang-thang-tam', title:'Ngày Cách mạng Tháng Tám', icon:'✨', kind:'vietnam', solar:{day:19,month:8} },
    { id:'doanh-nhan', title:'Ngày Doanh nhân Việt Nam', icon:'📈', kind:'vietnam', solar:{day:13,month:10} },
    { id:'phu-nu', title:'Ngày Phụ nữ Việt Nam', icon:'🌺', kind:'vietnam', solar:{day:20,month:10} },
    { id:'nha-giao', title:'Ngày Nhà giáo Việt Nam', icon:'🍎', kind:'vietnam', solar:{day:20,month:11} },
    { id:'di-san', title:'Ngày Di sản Văn hóa Việt Nam', icon:'🏛️', kind:'vietnam', solar:{day:23,month:11} },
    { id:'quan-doi', title:'Ngày thành lập Quân đội Nhân dân Việt Nam', icon:'⭐', kind:'vietnam', solar:{day:22,month:12} },

    // ===== SỰ KIỆN ÂM LỊCH / VĂN HÓA =====
    { id:'tet-nguyen-dan', title:'Tết Nguyên Đán', icon:'🧧', kind:'lunar', lunar:{day:1,month:1,leap:false}, lunarLabel:'01/01 Âm lịch' },
    { id:'ram-thang-gieng', title:'Rằm tháng Giêng', icon:'🏮', kind:'lunar', lunar:{day:15,month:1,leap:false}, lunarLabel:'15/01 Âm lịch' },
    { id:'han-thuc', title:'Tết Hàn Thực', icon:'🥟', kind:'lunar', lunar:{day:3,month:3,leap:false}, lunarLabel:'03/03 Âm lịch' },
    { id:'doan-ngo', title:'Tết Đoan Ngọ', icon:'🍑', kind:'lunar', lunar:{day:5,month:5,leap:false}, lunarLabel:'05/05 Âm lịch' },
    { id:'that-tich', title:'Thất Tịch', icon:'🌌', kind:'lunar', lunar:{day:7,month:7,leap:false}, lunarLabel:'07/07 Âm lịch' },
    { id:'vu-lan', title:'Lễ Vu Lan', icon:'🪷', kind:'lunar', lunar:{day:15,month:7,leap:false}, lunarLabel:'15/07 Âm lịch' },
    { id:'trung-thu', title:'Tết Trung Thu', icon:'🥮', kind:'lunar', lunar:{day:15,month:8,leap:false}, lunarLabel:'15/08 Âm lịch' },
    { id:'ong-tao', title:'Ông Công Ông Táo', icon:'🐟', kind:'lunar', lunar:{day:23,month:12,leap:false}, lunarLabel:'23/12 Âm lịch' },

    // ===== QUỐC TẾ =====
    { id:'education-day', title:'Ngày Quốc tế Giáo dục', icon:'🎓', kind:'international', solar:{day:24,month:1} },
    { id:'cancer-day', title:'Ngày Thế giới Phòng chống Ung thư', icon:'🎗️', kind:'international', solar:{day:4,month:2} },
    { id:'valentines', title:'Valentine', icon:'💘', kind:'international', solar:{day:14,month:2} },
    { id:'womens-day', title:'Ngày Quốc tế Phụ nữ', icon:'🌷', kind:'international', solar:{day:8,month:3} },
    { id:'happiness-day', title:'Ngày Quốc tế Hạnh phúc', icon:'☀️', kind:'international', solar:{day:20,month:3} },
    { id:'world-water', title:'Ngày Nước Thế giới', icon:'💧', kind:'international', solar:{day:22,month:3} },
    { id:'earth-day', title:'Ngày Trái Đất', icon:'🌍', kind:'international', solar:{day:22,month:4} },
    { id:'book-day', title:'Ngày Sách và Bản quyền Thế giới', icon:'📚', kind:'international', solar:{day:23,month:4} },
    { id:'environment-day', title:'Ngày Môi trường Thế giới', icon:'🌱', kind:'international', solar:{day:5,month:6} },
    { id:'oceans-day', title:'Ngày Đại dương Thế giới', icon:'🐋', kind:'international', solar:{day:8,month:6} },
    { id:'youth-day', title:'Ngày Quốc tế Thanh niên', icon:'🚀', kind:'international', solar:{day:12,month:8} },
    { id:'peace-day', title:'Ngày Quốc tế Hòa bình', icon:'🕊️', kind:'international', solar:{day:21,month:9} },
    { id:'tourism-day', title:'Ngày Du lịch Thế giới', icon:'🧳', kind:'international', solar:{day:27,month:9} },
    { id:'food-day', title:'Ngày Lương thực Thế giới', icon:'🌾', kind:'international', solar:{day:16,month:10} },
    { id:'un-day', title:'Ngày Liên Hợp Quốc', icon:'🌐', kind:'international', solar:{day:24,month:10} },
    { id:'halloween', title:'Halloween', icon:'🎃', kind:'special', solar:{day:31,month:10} },
    { id:'aids-day', title:'Ngày Thế giới Phòng chống AIDS', icon:'🎗️', kind:'international', solar:{day:1,month:12} },
    { id:'human-rights-day', title:'Ngày Nhân quyền Thế giới', icon:'⚖️', kind:'international', solar:{day:10,month:12} },
    { id:'christmas', title:'Giáng sinh', icon:'🎄', kind:'special', solar:{day:25,month:12} },
  ];

  const KIND_LABELS = {
    all:'Tất cả', official:'Chính thức', lunar:'Âm lịch', international:'Quốc tế', vietnam:'Việt Nam', special:'Đặc biệt'
  };

  let cache = {};
  try { cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch { cache = {}; }

  function saveCache() {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch {}
  }

  function cacheKey(day, month, lunarYear, leap) {
    return [lunarYear, month, day, leap ? 1 : 0].join('-');
  }

  function vnParts(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone:TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false
    }).formatToParts(date);
    const out = {};
    for (const p of parts) if (p.type !== 'literal') out[p.type] = Number(p.value);
    return out;
  }

  function vnYear(date = new Date()) { return vnParts(date).year; }

  function vnDate(year, month, day, hour=0, minute=0, second=0, ms=0) {
    return new Date(Date.UTC(year, month - 1, day, hour - 7, minute, second, ms));
  }

  const dateFormatter = new Intl.DateTimeFormat('vi-VN', {timeZone:TIME_ZONE,day:'2-digit',month:'2-digit',year:'numeric'});
  function formatSolarDate(date) { return dateFormatter.format(date); }

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  function formatMeta(event) {
    if (event.lunar && event.lunarLabel) {
      return `${escapeHTML(formatSolarDate(event.start))} <span class="vn-lunar-highlight">· ${escapeHTML(event.lunarLabel)}</span>`;
    }
    return escapeHTML(formatSolarDate(event.start));
  }

  async function lunarToSolar(lunar, lunarYear) {
    const key = cacheKey(lunar.day, lunar.month, lunarYear, Boolean(lunar.leap));
    const cached = cache[key];
    if (cached && cached.iso && Date.now() - Number(cached.timestamp || 0) < CACHE_TTL) return cached.iso;

    const url = new URL(AM_LICH_API);
    url.searchParams.set('d', String(lunar.day));
    url.searchParams.set('m', String(lunar.month));
    url.searchParams.set('y', String(lunarYear));
    if (lunar.leap) url.searchParams.set('nhuan', '1');

    try {
      const response = await fetch(url.toString(), {method:'GET',cache:'no-store'});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!data || typeof data.iso !== 'string') throw new Error('API không trả về iso.');
      cache[key] = {iso:data.iso,timestamp:Date.now()};
      saveCache();
      return data.iso;
    } catch (error) {
      console.warn('[VN CALENDAR] Không đổi được âm lịch:', error);
      return null;
    }
  }

  async function resolveEvent(event, year) {
    let iso = null;
    if (event.solar) {
      iso = `${year}-${String(event.solar.month).padStart(2,'0')}-${String(event.solar.day).padStart(2,'0')}`;
    } else if (event.lunar) {
      iso = await lunarToSolar(event.lunar, year);
    }
    if (!iso) return null;

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!match) return null;

    const resolvedYear = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const start = vnDate(resolvedYear, month, day);
    const end = vnDate(resolvedYear, month, day + 1);

    return {...event,year:resolvedYear,month,day,iso,start,end};
  }

  let resolvedEvents = [];
  let building = false;

  async function rebuildEvents() {
    if (building) return;
    building = true;
    try {
      const currentYear = vnYear();
      const years = [currentYear,currentYear + 1];
      const jobs = [];
      for (const event of EVENTS) {
        for (const year of years) jobs.push([event, year]);
      }

      const settled = await Promise.all(
        jobs.map(async ([event, year]) => {
          try { return await resolveEvent(event, year); }
          catch { return null; }
        })
      );

      const results = [];
      const seen = new Set();
      for (const item of settled) {
        if (!item) continue;
        const key = `${item.id}|${item.iso}`;
        if (seen.has(key)) continue;
        seen.add(key);
        results.push(item);
      }

      resolvedEvents = results.sort((a,b) => a.start.getTime() - b.start.getTime());
      updateSubtitle();
    } finally { building = false; }
  }

  function eventStatus(event, now = new Date()) {
    const time = now.getTime();
    if (time >= event.start.getTime() && time < event.end.getTime()) return 'ongoing';
    if (time < event.start.getTime()) return 'upcoming';
    return 'ended';
  }

  function removeEnded(now = new Date()) {
    resolvedEvents = resolvedEvents.filter(event => eventStatus(event, now) !== 'ended');
  }

  let currentFilter = 'all';

  function visibleEvents(now = new Date()) {
    const currentYear = vnYear(now);
    let active = resolvedEvents.filter(event => eventStatus(event, now) !== 'ended');
    if (currentFilter !== 'all') active = active.filter(event => event.kind === currentFilter);
    const currentYearEvents = active.filter(event => event.year === currentYear);
    if (currentYearEvents.length) return currentYearEvents;
    return active.filter(event => event.year > currentYear);
  }

  function countdown(target, now) {
    const diff = Math.max(0, target.getTime() - now.getTime());
    const totalSeconds = Math.floor(diff / 1000);
    return {
      days:Math.floor(totalSeconds / 86400),
      hours:Math.floor((totalSeconds % 86400) / 3600),
      minutes:Math.floor((totalSeconds % 3600) / 60),
      seconds:totalSeconds % 60
    };
  }

  function pad2(value) { return String(value).padStart(2,'0'); }

  function applyKindClass(el, kind) {
    ['official','lunar','international','vietnam','special'].forEach(k => el.classList.remove(`kind-${k}`));
    if (kind) el.classList.add(`kind-${kind}`);
  }

  /* FIX: đảm bảo 4 ô đếm ngược luôn tồn tại trong DOM trước khi set giá trị.
     Trước đây nextCountMarkup() bị gọi lại (innerHTML) mỗi lần "upcoming",
     nhưng nếu render() chạy nhanh liên tiếp trong lúc setInterval 1s đang
     thao tác trên các #vn-days/#vn-hours cũ (đã bị destroy bởi lần
     innerHTML trước đó nhưng biến DOM cache ở nơi khác vẫn giữ tham chiếu),
     giá trị set vào sẽ rơi vào node đã rời DOM -> hiển thị "mất" đếm ngược.
     Giải pháp: chỉ ghi lại innerHTML khi thực sự cần (đổi từ ongoing sang
     upcoming hoặc ngược lại), còn lại luôn truy vấn lại phần tử bằng
     document.getElementById ngay tại thời điểm set số. */
  function setCountdown(target, now) {
    const value = countdown(target, now);
    const days = document.getElementById('vn-days');
    const hours = document.getElementById('vn-hours');
    const minutes = document.getElementById('vn-minutes');
    const seconds = document.getElementById('vn-seconds');
    if (days) days.textContent = String(value.days).padStart(2,'0');
    if (hours) hours.textContent = pad2(value.hours);
    if (minutes) minutes.textContent = pad2(value.minutes);
    if (seconds) seconds.textContent = pad2(value.seconds);
  }

  function nextCountMarkup() {
    return `<div class="vn-calendar-count-grid">
      <div class="vn-count-box"><div class="vn-count-value" id="vn-days">00</div><div class="vn-count-unit">Ngày</div></div>
      <div class="vn-count-box"><div class="vn-count-value" id="vn-hours">00</div><div class="vn-count-unit">Giờ</div></div>
      <div class="vn-count-box"><div class="vn-count-value" id="vn-minutes">00</div><div class="vn-count-unit">Phút</div></div>
      <div class="vn-count-box"><div class="vn-count-value" id="vn-seconds">00</div><div class="vn-count-unit">Giây</div></div>
    </div>`;
  }

  function resetDetail() {
    selectedEvent = null;
    if (!detail) return;
    detail.classList.remove('open');
    detail.setAttribute('aria-hidden', 'true');
  }

  function detailTypeLabel(event) {
    return KIND_LABELS[event?.kind] || 'Sự kiện';
  }

  const detailNowFormatter = new Intl.DateTimeFormat('vi-VN', {
    timeZone: TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  function formatDetailNow(now) {
    return `Giờ Việt Nam (UTC+7): ${detailNowFormatter.format(now)}`;
  }

  function updateDetail(now = new Date()) {
    if (!detail || !detail.classList.contains('open') || !selectedEvent) return;

    const event = selectedEvent;
    const status = eventStatus(event, now);

    if (detailTitle) detailTitle.textContent = `${event.icon} ${event.title}`;
    if (detailMeta) detailMeta.innerHTML = formatMeta(event);
    if (detailType) {
      detailType.textContent = detailTypeLabel(event);
      applyKindClass(detailType, event.kind);
    }

    if (detailCountdownLabel) {
      detailCountdownLabel.textContent =
        status === 'ongoing'
          ? 'ĐANG DIỄN RA · THỜI GIAN THỰC'
          : 'ĐẾM NGƯỢC TỚI SỰ KIỆN';
    }

    const value = countdown(event.start, now);
    if (detailDays) detailDays.textContent = String(value.days).padStart(2,'0');
    if (detailHours) detailHours.textContent = pad2(value.hours);
    if (detailMinutes) detailMinutes.textContent = pad2(value.minutes);
    if (detailSeconds) detailSeconds.textContent = pad2(value.seconds);
    if (detailNow) detailNow.textContent = formatDetailNow(now);
  }

  function openDetail(event) {
    if (!detail || !event) return;
    selectedEvent = event;
    applyKindClass(nextCard, event.kind);

    if (detailTitle) detailTitle.textContent = `${event.icon} ${event.title}`;
    if (detailMeta) detailMeta.innerHTML = formatMeta(event);
    if (detailType) {
      detailType.textContent = detailTypeLabel(event);
      applyKindClass(detailType, event.kind);
    }

    detail.classList.add('open');
    detail.setAttribute('aria-hidden', 'false');
    updateDetail(new Date());
  }

  /* FIX ĐẾM NGƯỢC BỊ MẤT:
     Trước đây renderNext() ghi đè nextCount.innerHTML mỗi khi trạng thái
     là "upcoming", kể cả khi trước đó nó đã là "upcoming" rồi — điều này
     phá huỷ #vn-days/#vn-hours/... liên tục 1 lần/giây một cách không cần
     thiết và có thể đụng độ với setCountdown() đang chạy cùng lúc trong
     interval khác, khiến số bị "đứng hình" hoặc trắng. Giờ chỉ ghi lại
     markup khi trạng thái THỰC SỰ đổi (ongoing <-> upcoming) hoặc khi
     sự kiện tiếp theo đổi (next.id đổi), còn lại chỉ update số qua
     setCountdown(). */
  let lastNextId = null;
  let lastNextStatus = null;

  function renderNext(now) {
    if (selectedEvent && detail?.classList.contains('open')) {
      updateDetail(now);
      return;
    }

    const events = visibleEvents(now);
    const next = events[0];

    if (!next) {
      if (lastNextId !== null) {
        applyKindClass(nextCard, 'special');
        nextName.textContent = 'Không còn sự kiện';
        nextDates.textContent = 'Hẹn gặp lại vào năm mới.';
        nextCount.innerHTML = '<div class="vn-calendar-ongoing">đã hoàn tất</div>';
        lastNextId = null;
        lastNextStatus = null;
      }
      return;
    }

    const status = eventStatus(next, now);
    const idOrStatusChanged = next.id !== lastNextId || status !== lastNextStatus;

    if (idOrStatusChanged) {
      applyKindClass(nextCard, next.kind);
      nextName.textContent = `${next.icon} ${next.title}`;
      nextDates.innerHTML = formatMeta(next);
      nextCard.classList.toggle('is-ongoing', status === 'ongoing');
      nextCount.innerHTML = status === 'ongoing' ? '<div class="vn-calendar-ongoing">đang diễn ra</div>' : nextCountMarkup();
      lastNextId = next.id;
      lastNextStatus = status;
    }

    if (status !== 'ongoing') setCountdown(next.start, now);
  }

  function renderList(now) {
    const events = visibleEvents(now);
    if (listCountEl) listCountEl.textContent = String(events.length);
    if (yearLabelEl) yearLabelEl.textContent = String(events[0]?.year || vnYear(now));

    if (!events.length) {
      listEl.innerHTML = '<div class="vn-calendar-empty">Không có sự kiện phù hợp trong khoảng thời gian này.</div>';
      return;
    }

    listEl.innerHTML = events.map(event => {
      const status = eventStatus(event, now);
      const right = status === 'ongoing'
        ? '<span class="vn-calendar-live">đang diễn ra</span>'
        : `còn ${Math.max(0, Math.ceil((event.start.getTime() - now.getTime()) / 86400000))} ngày`;
      return `<div class="vn-calendar-event ${status} kind-${escapeHTML(event.kind)}" data-event-id="${escapeHTML(event.id)}" tabindex="0" role="button" aria-label="Xem chi tiết ${escapeHTML(event.title)}">
        <div class="vn-calendar-event-icon" aria-hidden="true">${escapeHTML(event.icon)}</div>
        <div class="vn-calendar-event-date">${pad2(event.day)}/${pad2(event.month)}</div>
        <div class="vn-calendar-event-info">
          <p class="vn-calendar-event-name">${escapeHTML(event.title)}</p>
          <p class="vn-calendar-event-meta">${formatMeta(event)}</p>
        </div>
        <div class="vn-calendar-event-left">${right}</div>
      </div>`;
    }).join('');
  }

  function updateSubtitle() {
    if (subEl) subEl.textContent = currentFilter === 'all'
      ? 'Lịch dương + âm · Việt Nam + quốc tế · UTC+7'
      : `${KIND_LABELS[currentFilter]} · cập nhật realtime · UTC+7`;
  }

  let lastRenderedListDay = '';

  function render(now = new Date(), forceList = true) {
    removeEnded(now);
    updateSubtitle();
    renderNext(now);
    const parts = vnParts(now);
    const dayKey = `${parts.year}-${parts.month}-${parts.day}`;
    if (forceList || dayKey !== lastRenderedListDay) {
      lastRenderedListDay = dayKey;
      renderList(now);
    }
    renderSidebarEvents(now);
  }

  /* ================= EVENTS CARD (SIDEBAR TRÁI) ================= */
  const sidebarListEl = document.getElementById('events-list');
  const sidebarViewAllBtn = document.getElementById('events-viewall');

  function renderSidebarEvents(now = new Date()) {
    if (!sidebarListEl) return;
    const events = visibleEvents(now).slice(0, 3);

    if (!events.length) {
      sidebarListEl.innerHTML = '<li class="event-row">Không có sự kiện sắp tới.</li>';
      return;
    }

    sidebarListEl.innerHTML = events.map(event => {
      const status = eventStatus(event, now);
      const daysLeft = Math.max(0, Math.ceil((event.start.getTime() - now.getTime()) / 86400000));
      const countMarkup = status === 'ongoing'
        ? '<b>•</b><span>diễn ra</span>'
        : `<b>${daysLeft}</b><span>days</span>`;
      return `<li class="event-row" data-event-id="${escapeHTML(event.id)}" tabindex="0" role="button" aria-label="Xem chi tiết ${escapeHTML(event.title)}">
        <span class="ev-icon" aria-hidden="true">${escapeHTML(event.icon)}</span>
        <span class="ev-info">
          <span class="ev-title">${escapeHTML(event.title)}</span>
          <span class="ev-date">${pad2(event.day)}/${pad2(event.month)}/${event.year}</span>
        </span>
        <span class="ev-count">${countMarkup}</span>
      </li>`;
    }).join('');
  }

  function openEventFromSidebar(id) {
    const event = resolvedEvents.find(item => item.id === id);
    openCalendar();
    if (event) {
      requestAnimationFrame(() => {
        const target = listEl?.querySelector(`[data-event-id="${CSS.escape(id)}"]`);
        target?.click();
      });
    }
  }

  sidebarListEl?.addEventListener('click', event => {
    const row = event.target.closest('.event-row[data-event-id]');
    if (!row) return;
    openEventFromSidebar(row.getAttribute('data-event-id'));
  });

  sidebarListEl?.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const row = event.target.closest('.event-row[data-event-id]');
    if (!row) return;
    event.preventDefault();
    openEventFromSidebar(row.getAttribute('data-event-id'));
  });

  sidebarViewAllBtn?.addEventListener('click', () => openCalendar());

  /* ================= VỊ TRÍ POPOVER — SMART DESKTOP / MOBILE ================= */
  /* Desktop rộng: đặt lịch bên trái bio card, canh theo music-box.
     Bio card là ranh giới; thiếu chỗ thì chuyển về giữa.
     Mobile / màn hình hẹp: luôn giữa. */
  function resetToCenteredFallback() {
    isCornerMode = false;
    popover.classList.remove('corner');
    popover.classList.add('centered');

    // Không để inline style của chế độ corner giữ lại vị trí cũ.
    // Dùng !important để việc đổi kích thước cửa sổ có hiệu lực NGAY,
    // không cần reload trang.
    popover.style.setProperty('left', '50%', 'important');
    popover.style.setProperty('top', '50%', 'important');
    popover.style.setProperty('right', 'auto', 'important');
    popover.style.setProperty('bottom', 'auto', 'important');
    popover.style.setProperty('transform', 'translate(-50%, -50%) scale(1)', 'important');
  }

  function positionPopover() {
    if (!popover) return;

    try {
      const margin = 18;
      const mobileBreakpoint = 820;
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Điện thoại / màn hình hẹp: luôn ở giữa.
      if (width <= mobileBreakpoint) {
        resetToCenteredFallback();
        return;
      }

      const rect = popover.getBoundingClientRect();
      const popupWidth = rect.width || Math.min(400, width - margin * 2);
      const popupHeight = rect.height || Math.min(height * 0.7, 560);
      const cardRect = bioCard?.getBoundingClientRect();

      if (!cardRect || popupWidth <= 0 || popupHeight <= 0) {
        resetToCenteredFallback();
        return;
      }

      // Chỉ dùng vùng TRÁI bio card. Popup không được đè lên card.
      const availableLeft = cardRect.left - margin;
      const fitsLeft = availableLeft >= popupWidth + margin;
      const fitsHeight = height >= popupHeight + margin * 2;

      if (!fitsLeft || !fitsHeight) {
        resetToCenteredFallback();
        return;
      }

      const musicBox = document.getElementById('music-box');
      const musicRect = musicBox?.getBoundingClientRect();

      // Canh trên với music box để hai khu vực nằm cùng hàng.
      let top = musicRect?.top ?? cardRect.top;
      const maxTop = height - popupHeight - margin;
      top = Math.max(margin, Math.min(top, Math.max(margin, maxTop)));

      const left = Math.max(margin, Math.min(
        cardRect.left - popupWidth - margin,
        width - popupWidth - margin
      ));

      isCornerMode = true;
      popover.classList.remove('centered');
      popover.classList.add('corner');

      // Gỡ !important của centered trước khi chuyển lại sang corner.
      popover.style.removeProperty('left');
      popover.style.removeProperty('top');
      popover.style.removeProperty('right');
      popover.style.removeProperty('bottom');
      popover.style.removeProperty('transform');

      popover.style.left = Math.round(left) + 'px';
      popover.style.top = Math.round(top) + 'px';
      popover.style.right = 'auto';
      popover.style.bottom = 'auto';
      popover.style.transform = popover.classList.contains('open')
        ? 'translateY(0) scale(1)'
        : 'translateY(-8px) scale(.96)';
    } catch (err) {
      console.warn('[VN CALENDAR] positionPopover lỗi, dùng chế độ giữa màn hình:', err);
      resetToCenteredFallback();
    }
  }

  function openCalendar() {
    render();

    popover.style.visibility = 'hidden';
    popover.classList.add('open');

    // FIX: dùng try/finally để dù positionPopover() có lỗi bất ngờ,
    // inline visibility:hidden VẪN được gỡ bỏ ngay sau đó — tránh trường
    // hợp popover kẹt ở trạng thái ẩn vĩnh viễn (chỉ thấy nền tối).
    const reveal = () => {
      try {
        positionPopover();
      } finally {
        popover.style.visibility = '';
      }
    };

    // Đo kích thước thật trước, chọn vị trí, rồi mới hiện.
    requestAnimationFrame(reveal);
    // Lưới an toàn: nếu vì lý do gì đó rAF không chạy (tab ẩn, trình
    // duyệt lạ...), vẫn đảm bảo popover hiện ra sau tối đa 120ms.
    setTimeout(() => {
      if (popover.style.visibility === 'hidden') reveal();
    }, 120);

    backdrop?.classList.add('open');
    btn.classList.add('is-open');
    btn.setAttribute('aria-expanded','true');
  }

  function closeCalendar() {
    resetDetail();
    popover.classList.remove('open');
    backdrop?.classList.remove('open');
    btn.classList.remove('is-open');
    btn.setAttribute('aria-expanded','false');
  }

  btn.addEventListener('click', event => {
    event.stopPropagation();
    popover.classList.contains('open') ? closeCalendar() : openCalendar();
  });

  closeBtn.addEventListener('click', event => { event.stopPropagation(); closeCalendar(); });
  popover.addEventListener('click', event => event.stopPropagation());
  backdrop?.addEventListener('click', closeCalendar);

  /* FIX: TẮT "bấm ra ngoài để đóng" khi đang ở chế độ góc (isCornerMode).
     Ở chế độ góc, popover đứng cạnh bio card như một panel phụ — bấm ra
     ngoài (vào phần nền/orb/video) không nên đóng nó, người dùng vẫn có
     thể tương tác với trang phía sau. Chỉ khi ở chế độ giữa màn hình
     (mobile / không đủ chỗ) mới giữ hành vi bấm ra ngoài để đóng, vì lúc
     đó backdrop đóng vai trò modal thực sự. */
  document.addEventListener('click', event => {
    if (!popover.classList.contains('open')) return;
    if (isCornerMode) return; // đã tắt bấm ra ngoài ở chế độ góc
    if (!popover.contains(event.target) && !btn.contains(event.target)) {
      closeCalendar();
    }
  });

  document.addEventListener('keydown', event => { if (event.key === 'Escape' && popover.classList.contains('open')) closeCalendar(); });

  function repositionCalendarSoon() {
    if (!popover.classList.contains('open')) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(positionPopover);
    });
  }

  window.addEventListener('resize', repositionCalendarSoon);
  window.addEventListener('orientationchange', repositionCalendarSoon);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', repositionCalendarSoon);
  }

  if (filterEl) {
    filterEl.addEventListener('change', () => {
      currentFilter = filterEl.value || 'all';
      lastNextId = null;
      lastNextStatus = null;
      render();
    });
  }

  if (listEl) {
    listEl.addEventListener('click', event => {
      const item = event.target.closest('.vn-calendar-event');
      if (!item) return;
      const id = item.getAttribute('data-event-id');
      const selected = resolvedEvents.find(e => e.id === id);
      if (selected) openDetail(selected);
    });

    listEl.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const item = event.target.closest('.vn-calendar-event');
      if (!item) return;
      event.preventDefault();
      const id = item.getAttribute('data-event-id');
      const selected = resolvedEvents.find(e => e.id === id);
      if (selected) openDetail(selected);
    });
  }

  if (detailCloseBtn) {
    detailCloseBtn.addEventListener('click', event => {
      event.stopPropagation();
      resetDetail();
      lastNextId = null;
      lastNextStatus = null;
      render(new Date());
    });
  }

  if (detailPanel) {
    detailPanel.addEventListener('click', event => event.stopPropagation());
  }

  if (nextCard) {
    nextCard.addEventListener('click', event => {
      if (detail?.classList.contains('open')) return;
      if (event.target.closest('.vn-calendar-ongoing')) return;
      const events = visibleEvents(new Date());
      if (events[0]) openDetail(events[0]);
    });
  }

  let lastSecond = -1;
  let lastDayKey = '';
  let lastYear = vnYear();

  setInterval(() => {
    const now = new Date();
    const parts = vnParts(now);
    const dayKey = `${parts.year}-${parts.month}-${parts.day}`;

    if (parts.year !== lastYear) {
      lastYear = parts.year;
      rebuildEvents().then(() => {
        if (popover.classList.contains('open')) {
          render(now);
        }
      });
      return;
    }

    if (parts.second === lastSecond) return;
    lastSecond = parts.second;

    if (!popover.classList.contains('open')) return;

    // Cập nhật đếm ngược mỗi giây — luôn chạy, không phụ thuộc render list.
    renderNext(now);

    if (dayKey !== lastDayKey) {
      lastDayKey = dayKey;
      removeEnded(now);
      renderList(now);
    }

    if (syncEl) syncEl.textContent = 'Cập nhật theo thời gian thực (UTC+7)';
  }, 1000);

  rebuildEvents().then(() => render());
})();

/* ============ GLOBAL DATA-TOOLTIP ============ */
(function initGlobalTooltips() {
  'use strict';

  const tooltip =
    document.getElementById(
      'global-tooltip'
    );

  if (!tooltip) return;

  let currentTarget = null;
  let hideTimer = null;
  let raf = null;

  const OFFSET = 10;
  const EDGE = 8;

  function getText(el) {
    return (
      el?.getAttribute(
        'data-tooltip'
      )?.trim() || ''
    );
  }

  function position(el) {
    if (
      !el ||
      !tooltip.classList.contains(
        'is-visible'
      )
    ) {
      return;
    }

    const rect =
      el.getBoundingClientRect();

    const tip =
      tooltip.getBoundingClientRect();

    const width =
      tip.width;

    const height =
      tip.height;

    let left =
      rect.left +
      rect.width / 2 -
      width / 2;

    let top =
      rect.top -
      height -
      OFFSET;

    let bottom = false;

    if (top < EDGE) {
      top =
        rect.bottom +
        OFFSET;

      bottom = true;
    }

    left =
      Math.max(
        EDGE,
        Math.min(
          left,
          window.innerWidth -
            width -
            EDGE
        )
      );

    top =
      Math.max(
        EDGE,
        Math.min(
          top,
          window.innerHeight -
            height -
            EDGE
        )
      );

    tooltip.style.left =
      Math.round(left) +
      'px';

    tooltip.style.top =
      Math.round(top) +
      'px';

    tooltip.classList.toggle(
      'tooltip-bottom',
      bottom
    );
  }

  /* FIX: tooltip đuổi theo con trỏ chuột thay vì cố định
     theo vị trí phần tử. Dùng cho các sự kiện mouseenter/mousemove. */
  function positionAtMouse(x, y) {
    if (
      !tooltip.classList.contains(
        'is-visible'
      )
    ) {
      return;
    }

    const tip =
      tooltip.getBoundingClientRect();

    const width = tip.width;
    const height = tip.height;

    let left = x - width / 2;
    let top = y - height - OFFSET - 6;
    let bottom = false;

    if (top < EDGE) {
      top = y + OFFSET + 14;
      bottom = true;
    }

    left =
      Math.max(
        EDGE,
        Math.min(
          left,
          window.innerWidth - width - EDGE
        )
      );

    top =
      Math.max(
        EDGE,
        Math.min(
          top,
          window.innerHeight - height - EDGE
        )
      );

    tooltip.style.left = Math.round(left) + 'px';
    tooltip.style.top = Math.round(top) + 'px';

    tooltip.classList.toggle(
      'tooltip-bottom',
      bottom
    );
  }

  function schedulePosition() {
    if (!currentTarget) return;

    if (raf) {
      cancelAnimationFrame(
        raf
      );
    }

    raf =
      requestAnimationFrame(
        () => {
          raf = null;

          if (currentTarget) {
            position(
              currentTarget
            );
          }
        }
      );
  }

  /* FIX: show() giờ nhận thêm mouseEvt (tuỳ chọn) để định vị theo
     con trỏ chuột khi tooltip được mở bằng hover chuột. */
  function show(el, mouseEvt) {
    const text =
      getText(el);

    if (!text) return;

    clearTimeout(
      hideTimer
    );

    currentTarget = el;

    tooltip.textContent =
      text;

    tooltip.setAttribute(
      'aria-hidden',
      'false'
    );

    tooltip.classList.remove(
      'tooltip-bottom'
    );

    tooltip.classList.add(
      'is-visible'
    );

    requestAnimationFrame(
      () => {
        if (
          currentTarget !==
          el
        ) {
          return;
        }

        if (mouseEvt) {
          positionAtMouse(
            mouseEvt.clientX,
            mouseEvt.clientY
          );
        } else {
          position(el);
        }
      }
    );
  }

  function hide(
    immediate = false
  ) {
    clearTimeout(
      hideTimer
    );

    const run = () => {
      tooltip.classList.remove(
        'is-visible'
      );

      tooltip.setAttribute(
        'aria-hidden',
        'true'
      );

      tooltip.classList.remove(
        'tooltip-bottom'
      );

      currentTarget = null;
    };

    if (immediate) {
      run();
    } else {
      hideTimer =
        setTimeout(
          run,
          70
        );
    }
  }

  function init(el) {
    if (
      !el ||
      el.dataset.tooltipBound ===
        '1'
    ) {
      return;
    }

    el.dataset.tooltipBound =
      '1';

    /* FIX: mouseenter truyền kèm sự kiện chuột để tooltip xuất hiện
       ngay tại vị trí con trỏ; mousemove giúp tooltip "đuổi" theo
       chuột trong lúc hover. */
    /* data-tooltip-fixed="true" -> tooltip đứng yên theo vị trí
       phần tử (dùng position()), không đuổi theo chuột */
    const isFixed =
      el.getAttribute('data-tooltip-fixed') === 'true';

    el.addEventListener(
      'mouseenter',
      e => show(el, isFixed ? null : e)
    );

    if (!isFixed) {
      el.addEventListener(
        'mousemove',
        e => {
          if (
            currentTarget === el
          ) {
            positionAtMouse(
              e.clientX,
              e.clientY
            );
          }
        }
      );
    }

    el.addEventListener(
      'mouseleave',
      () => hide()
    );

    el.addEventListener(
      'focus',
      () => show(el)
    );

    el.addEventListener(
      'blur',
      () => hide(true)
    );

    el.addEventListener(
      'touchstart',
      e => {
        const text =
          getText(el);

        if (!text) return;

        e.stopPropagation();

        if (
          currentTarget ===
          el
        ) {
          hide(true);
        } else {
          show(el);
        }
      },
      { passive: true }
    );
  }

  function scan(
    root = document
  ) {
    if (
      root.matches?.(
        '[data-tooltip]'
      )
    ) {
      init(root);
    }

    root
      .querySelectorAll?.(
        '[data-tooltip]'
      )
      .forEach(init);
  }

  document.addEventListener(
    'click',
    e => {
      if (
        currentTarget &&
        !currentTarget.contains(
          e.target
        )
      ) {
        hide(true);
      }
    }
  );

  document.addEventListener(
    'keydown',
    e => {
      if (
        e.key === 'Escape'
      ) {
        hide(true);
      }
    }
  );

  window.addEventListener(
    'scroll',
    schedulePosition,
    { passive: true }
  );

  window.addEventListener(
    'resize',
    schedulePosition,
    { passive: true }
  );

  /*
   * THEO DÕI REALTIME:
   * - node mới có data-tooltip
   * - data-tooltip bị đổi giá trị
   *
   * Trường hợp music-title đang hover:
   * applyTrack() -> setAttribute('data-tooltip', ...)
   * -> MutationObserver chạy
   * -> tooltip.textContent được thay ngay.
   */
  const observer =
    new MutationObserver(
      mutations => {
        for (const mutation of mutations) {
          if (
            mutation.type ===
            'childList'
          ) {
            mutation.addedNodes
              .forEach(node => {
                if (
                  node.nodeType ===
                  1
                ) {
                  scan(node);
                }
              });
          }

          if (
            mutation.type ===
              'attributes' &&
            mutation.target
          ) {
            init(
              mutation.target
            );

            if (
              mutation.target ===
              currentTarget
            ) {
              const text =
                getText(
                  currentTarget
                );

              if (text) {
                tooltip.textContent =
                  text;

                tooltip.classList.add(
                  'is-visible'
                );
              } else {
                hide(true);
                continue;
              }

              schedulePosition();
            }
          }
        }
      }
    );

  scan();

  observer.observe(
    document.body,
    {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        'data-tooltip'
      ]
    }
  );
})();

/* ============ CALENDAR MINI DASHBOARD V3 ============ */
(function initCalendarMiniDashboard(){
  'use strict';
  const popover=document.getElementById('vn-calendar-popover');
  const body=document.getElementById('vn-calendar-body');
  const eventsEl=document.getElementById('vn-calendar-events');
  if(!popover||!body||!eventsEl) return;
  if(document.getElementById('vn-mini-month-grid')) return;

  const wrap=document.createElement('section');
  wrap.id='vn-mini-month-grid';
  wrap.innerHTML=`
    <div class="vn-mini-month-head">
      <div><span class="vn-mini-eyebrow">CALENDAR OVERVIEW</span><h3 id="vn-mini-month-title">Tháng hiện tại</h3></div>
      <div class="vn-mini-today" id="vn-mini-today">HÔM NAY</div>
    </div>
    <div class="vn-mini-week"><span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span>CN</span></div>
    <div class="vn-mini-grid" id="vn-mini-grid"></div>`;
  const first=body.querySelector('.vn-calendar-main-grid');
  if(first) body.insertBefore(wrap,first); else body.prepend(wrap);

  const style=document.createElement('style');
  style.textContent=`
    #vn-mini-month-grid{margin-bottom:14px;padding:17px 18px 15px;border-radius:24px;background:linear-gradient(145deg,rgba(255,255,255,.075),rgba(255,255,255,.028));border:1px solid rgba(255,255,255,.085);box-shadow:inset 0 1px rgba(255,255,255,.06)}
    .vn-mini-month-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:13px}.vn-mini-eyebrow{font:700 8px/1 'IBM Plex Mono',monospace;letter-spacing:.16em;opacity:.45}.vn-mini-month-head h3{margin:5px 0 0;font-size:17px;letter-spacing:-.02em}.vn-mini-today{font:700 8px 'IBM Plex Mono',monospace;letter-spacing:.12em;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);opacity:.7}.vn-mini-week,.vn-mini-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}.vn-mini-week span{text-align:center;font:700 8px 'IBM Plex Mono',monospace;opacity:.36;padding-bottom:3px}.vn-mini-day{position:relative;min-height:38px;border-radius:12px;background:rgba(255,255,255,.027);border:1px solid transparent;padding:7px 7px 5px;box-sizing:border-box;transition:.2s}.vn-mini-day.muted{opacity:.2}.vn-mini-day.today{background:linear-gradient(145deg,rgba(255,105,145,.2),rgba(255,255,255,.045));border-color:rgba(255,120,155,.35);box-shadow:0 0 20px rgba(255,80,130,.1)}.vn-mini-num{font-size:11px;font-weight:750}.vn-mini-dots{display:flex;gap:3px;position:absolute;left:7px;bottom:6px}.vn-mini-dot{width:4px;height:4px;border-radius:50%;background:var(--c,#b98cff);box-shadow:0 0 6px color-mix(in srgb,var(--c,#b98cff) 55%,transparent)}.vn-mini-day.has-event:hover{transform:translateY(-2px);background:rgba(255,255,255,.07)}
    @media(max-width:480px){#vn-mini-month-grid{padding:14px}.vn-mini-week,.vn-mini-grid{gap:4px}.vn-mini-day{min-height:34px;padding:6px}.vn-mini-dots{left:6px;bottom:5px}}
  `;
  document.head.appendChild(style);

  function vnNowParts(){const now=new Date();const f=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'});const [y,m,d]=f.format(now).split('-').map(Number);return {y,m,d};}
  function renderGrid(){
    const grid=document.getElementById('vn-mini-grid'), title=document.getElementById('vn-mini-month-title'); if(!grid) return;
    const now=vnNowParts();
    const monthStart=new Date(Date.UTC(now.y,now.m-1,1));
    const start=(monthStart.getUTCDay()+6)%7;
    const days=new Date(Date.UTC(now.y,now.m,0)).getUTCDate();
    const prevDays=new Date(Date.UTC(now.y,now.m-1,0)).getUTCDate();
    const names=['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
    if(title) title.textContent=names[now.m-1]+' '+now.y;
    const map={};
    eventsEl.querySelectorAll('.vn-calendar-event[data-event-id]').forEach(el=>{
      const date=el.querySelector('.vn-calendar-event-date')?.textContent?.trim(); const kind=(el.className.match(/kind-([\w-]+)/)||[])[1]||'special';
      const m=date?.match(/(\d{1,2})\/(\d{1,2})/); if(m){const key=String(+m[2]).padStart(2,'0')+'-'+String(+m[1]).padStart(2,'0');(map[key]??=[]).push(kind);}
    });
    const cells=[];
    for(let i=0;i<42;i++){
      const n=i-start+1; let day=n, mon=now.m, yr=now.y, muted=false;
      if(n<1){day=prevDays+n;mon--;muted=true;if(mon<1){mon=12;yr--}} else if(n>days){day=n-days;mon++;muted=true;if(mon>12){mon=1;yr++}}
      const key=String(mon).padStart(2,'0')+'-'+String(day).padStart(2,'0'); const kinds=map[key]||[]; const today=!muted&&mon===now.m&&day===now.d;
      cells.push(`<div class="vn-mini-day ${muted?'muted ':''}${today?'today ':''}${kinds.length?'has-event':''}"><span class="vn-mini-num">${day}</span>${kinds.length?`<span class="vn-mini-dots">${kinds.slice(0,3).map(k=>`<i class="vn-mini-dot" style="--c:var(--${k}-color,#b98cff)"></i>`).join('')}</span>`:''}</div>`);
    }
    grid.innerHTML=cells.join('');
  }
  const observer=new MutationObserver(()=>requestAnimationFrame(renderGrid)); observer.observe(eventsEl,{childList:true});
  const observer2=new MutationObserver(()=>requestAnimationFrame(renderGrid)); observer2.observe(popover,{attributes:true,attributeFilter:['class']});
  renderGrid(); setInterval(renderGrid,60000);
})();


/* ============ CALENDAR COMPACT V5 FINAL OVERRIDES ============ */
(function(){
  'use strict';
  const style=document.createElement('style');
  style.id='calendar-compact-v5-runtime';
  style.textContent=`
    #vn-calendar-body{display:grid!important;grid-template-columns:minmax(0,.78fr) minmax(0,1.22fr)!important;grid-template-rows:auto auto!important;gap:9px!important;}
    #vn-mini-month-grid{grid-column:1!important;grid-row:1/span 2!important;}
    .vn-calendar-main-grid{display:contents!important;}
    .vn-calendar-next{grid-column:2!important;grid-row:1!important;}
    .vn-calendar-right{grid-column:2!important;grid-row:2!important;}
    @media(max-width:700px){#vn-calendar-body{grid-template-columns:1fr!important;grid-template-rows:auto!important;}#vn-mini-month-grid,.vn-calendar-next,.vn-calendar-right{grid-column:1!important;grid-row:auto!important;}}
  `;
  document.head.appendChild(style);
})();
