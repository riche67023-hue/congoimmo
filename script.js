(() => {
  const STORAGE_ANNOUNCEMENTS = 'immocongo_announcements';
  const STORAGE_MESSAGES = 'immocongo_contact_messages';
  const STORAGE_MODAL_VIEWS = 'immocongo_modal_views';
  const STORAGE_FAVORIS = 'immocongo_favoris';

  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const escapeHtml = (str) =>
    String(str ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '<')
      .replaceAll('>', '>')
      .replaceAll('"', '"')
      .replaceAll("'", '&#039;');

  const readJSON = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  };

  const writeJSON = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
  };

  const normalizePrice = (v) => {
    const n = Number(String(v || '').replace(/[^0-9.]/g, ''));
    return Number.isFinite(n) ? n : null;
  };

  const getStatus = (ann) => {
    const st = String(ann.status || 'Disponible').toLowerCase();
    if (st.includes('réserv') || st.includes('reserve')) return { key: 'reserved', label: 'Réservé' };
    if (st.includes('vend') || st.includes('sold')) return { key: 'sold', label: 'Vendu' };
    return { key: 'available', label: 'Disponible' };
  };

  // Smooth scroll + close mobile menu
  qsa('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (!href || href === '#') return;
      const id = href.slice(1);
      const target = qs('#' + CSS.escape(id));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });

      const mobileMenu = qs('#mobileMenu');
      const burger = qs('.burger');
      if (mobileMenu && mobileMenu.classList.contains('open')) {
        mobileMenu.classList.remove('open');
        burger?.setAttribute('aria-expanded', 'false');
      }
    });
  });

  // Mobile burger toggle
  const burger = qs('.burger');
  const mobileMenu = qs('#mobileMenu');
  if (burger && mobileMenu) {
    burger.addEventListener('click', () => {
      const open = mobileMenu.classList.toggle('open');
      burger.setAttribute('aria-expanded', String(open));
      mobileMenu.setAttribute('aria-hidden', String(!open));
    });
    qsa('.mobile-links a', mobileMenu).forEach((link) => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Navbar on scroll
  const header = qs('.site-header');
  if (header) {
    const onScroll = () => {
      if (window.scrollY > 80) header.classList.add('scrolled');
      else header.classList.remove('scrolled');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Stats counters
  function animateCounter(el, to, durationMs = 1200) {
    const start = performance.now();
    const from = 0;
    const fmt = (v) => Math.round(v).toString();
    function tick(now) {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = from + (to - from) * eased;
      el.textContent = fmt(current);
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  (function initCounters() {
    const counters = qsa('[data-counter]');
    if (!counters.length) return;
    if (!('IntersectionObserver' in window)) {
      counters.forEach((el) => animateCounter(el, Number(el.getAttribute('data-to')) || 0));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const to = Number(el.getAttribute('data-to')) || 0;
          animateCounter(el, to);
          io.unobserve(el);
        });
      },
      { threshold: 0.35 }
    );
    counters.forEach((el) => io.observe(el));
  })();

  // Elements
  const els = {
    grid: qs('[data-announcements-grid]'),
    annCounter: qs('#annCounter'),
    filterArea: qs('#filterArea'),
    filterMinPrice: qs('#filterMinPrice'),
    filterMaxPrice: qs('#filterMaxPrice'),
    filterTypeButtons: qsa('[data-filter-type]'),
    btnSearchGold: qs('#btnSearchGold'),
    heroSearchInput: qs('#heroSearchInput'),
    heroSearchBtn: qs('#heroSearchBtn'),
  };

  // Favorites
  function readFavoris() {
    const raw = readJSON(STORAGE_FAVORIS, []);
    if (!Array.isArray(raw)) return [];
    return raw.map(String);
  }

  function writeFavoris(arr) {
    writeJSON(STORAGE_FAVORIS, Array.from(new Set(arr.map(String))));
  }

  function isFavori(id) {
    const f = readFavoris();
    return f.includes(String(id));
  }

  function toggleFavori(id) {
    const current = readFavoris();
    const sid = String(id);
    const next = current.includes(sid) ? current.filter((x) => String(x) !== sid) : current.concat([sid]);
    writeFavoris(next);
    return next;
  }

  function updateFavoriBadge() {
    // Optional badge element: if it exists, update it
    const badge = qs('#favoritesBadge');
    if (!badge) return;
    badge.textContent = String(readFavoris().length);
    badge.style.display = readFavoris().length ? 'inline-flex' : 'none';
  }

  updateFavoriBadge();

  // Share helpers
  function copyLink() {
    const url = window.location.href;
    const doToast = (msg) => {
      const toast = qs('#shareCopyToast');
      if (!toast) {
        alert(msg);
        return;
      }
      toast.textContent = msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 1800);
    };

    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(url)
        .then(() => doToast('Lien copié !'))
        .catch(() => doToast('Impossible de copier le lien'));
      return;
    }

    try {
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      doToast('Lien copié !');
    } catch {
      doToast('Impossible de copier le lien');
    }
  }

  function shareWhatsApp(titre, prix) {
    const text = encodeURIComponent(`${titre} — ${prix} XAF`);
window.open(`https://wa.me/242056145113?text=${text}`, '_blank', 'noopener');
  }

  // Modal tabs + gallery
  const modal = {
    overlay: qs('#annModalOverlay'),
    title: qs('#modalTitle'),
    desc: qs('#modalDesc'),
    meta: qs('#modalMeta'),
    statusBadge: qs('#modalStatusBadge'),
    whatsappBtn: qs('#modalWhatsappBtn'),
    closeTop: qs('#modalCloseTop'),
    closeBtn: qs('#modalCloseBtn'),
    prev: qs('#modalPrev'),
    next: qs('#modalNext'),
    galleryImg: qs('#modalGalleryImg'),
    galleryThumbs: qs('#modalPhotoThumbs'),
    thumbsContainer: qs('#modalPhotoThumbs'),
    photoCounter: qs('#modalPhotoCounter'),
    tabs: {
      desc: qs('#tabBtnDesc'),
      equip: qs('#tabBtnEquip'),
      loc: qs('#tabBtnLoc'),
      reviews: qs('#tabBtnReviews'),
    },
    panes: {
      desc: qs('#tabPaneDesc'),
      equip: qs('#tabPaneEquip'),
      loc: qs('#tabPaneLoc'),
      reviews: qs('#tabPaneReviews'),
    },
    equipGrid: qs('#equipmentsGrid'),
    locationAddr: qs('#locationAddress'),
    mapsLink: qs('#mapsLink'),
    reviewsStars: qs('#reviewsStars'),
    reviewsCount: qs('#reviewsCount'),
    reviewsEmpty: qs('#reviewsEmpty'),
    shareBtn: qs('#modalShareBtn'),
    shareMenu: qs('#modalShareMenu'),
    shareCopy: qs('#modalShareCopy'),
    shareWa: qs('#modalShareWa'),
    favBtn: qs('#modalFavBtn'),
    quickInfos: qs('#modalQuickInfos'),
  };

  function switchTab(tabName) {
    const names = ['desc', 'equip', 'loc', 'reviews'];
    names.forEach((k) => {
      if (!modal.tabs[k]) return;
      modal.tabs[k].classList.toggle('active', k === tabName);
    });

    names.forEach((k) => {
      if (!modal.panes[k]) return;
      modal.panes[k].style.display = k === tabName ? 'block' : 'none';
    });
  }

  function setModalShareMenu(open) {
    if (!modal.shareMenu) return;
    modal.shareMenu.classList.toggle('open', !!open);
  }

  // Gallery thumbnails navigation
  function goToPhoto(index) {
    if (!modalState.photos.length) return;
    const max = modalState.photos.length;
    modalState.index = (index + max) % max;
    modal.galleryImg.src = modalState.photos[modalState.index] || '';

    if (modal.photoCounter) modal.photoCounter.textContent = `${modalState.index + 1}/${modalState.photos.length}`;

    if (modal.galleryThumbs) {
      const thumbs = qsa('[data-modal-thumb]', modal.galleryThumbs);
      thumbs.forEach((t) => {
        t.classList.toggle('active', Number(t.getAttribute('data-index')) === modalState.index);
      });
    }
  }

  let modalState = { id: null, photos: [], index: 0, equipped: [], addr: '', titre: '', prix: '', status: null };

  function incModalView(annId) {
    const all = readJSON(STORAGE_MODAL_VIEWS, {});
    const k = String(annId);
    all[k] = (Number(all[k] || 0) + 1);
    writeJSON(STORAGE_MODAL_VIEWS, all);
  }

  function getAnnouncementById(id) {
    return allAnnouncements.find((x) => String(x.id) === String(id)) || null;
  }

  function getPhotos(ann) {
    if (Array.isArray(ann.images) && ann.images.length) return ann.images;
    const single = ann.imageDataUrl || ann.imageUrl || '';
    return single ? [single] : [];
  }

  function renderThumbs() {
    if (!modal.thumbsContainer || !modal.galleryThumbs) return;
    modal.galleryThumbs.innerHTML = '';

    const thumbs = modalState.photos.slice(0, 5);
    thumbs.forEach((src, idx) => {
      const index = idx; // thumbnails correspond to first 5 photos
      const img = document.createElement('img');
      img.src = src;
      img.alt = 'Miniature';
      img.className = 'modal-photo-thumb';
      img.setAttribute('data-modal-thumb', '1');
      img.setAttribute('data-index', String(index));
      if (index === modalState.index) img.classList.add('active');
      img.addEventListener('click', () => goToPhoto(index));
      modal.galleryThumbs.appendChild(img);
    });
  }

  function renderEquipments(equipements) {
    if (!modal.equipGrid) return;
    modal.equipGrid.innerHTML = '';

    const defs = [
      { key: 'wifi', icon: 'fa-wifi', label: 'WiFi / Internet' },
      { key: 'climatisation', icon: 'fa-snowflake', label: 'Climatisation' },
      { key: 'parking', icon: 'fa-square-parking', label: 'Parking' },
      { key: 'cuisine', icon: 'fa-utensils', label: 'Cuisine équipée' },
      { key: 'tv', icon: 'fa-tv', label: 'Télévision' },
      { key: 'piscine', icon: 'fa-person-swimming', label: 'Piscine' },
      { key: 'secheCheveux', icon: 'fa-wind', label: 'Sèche-cheveux' },
      { key: 'electrogene', icon: 'fa-bolt', label: 'Groupe électrogène' },
      { key: 'eauChaude', icon: 'fa-temperature-high', label: 'Eau chaude' },
      { key: 'balcon', icon: 'fa-house-chimney', label: 'Balcon/Terrasse' },
    ];

    const has = (k) => Array.isArray(equipements) && equipements.includes(k);

    defs.forEach((d) => {
      const available = has(d.key);
      const item = document.createElement('div');
      item.className = `equipment-item ${available ? 'available' : 'not-available'}`;
      item.innerHTML = `<i class="fa-solid ${d.icon}"></i><span style="display:block; margin-top:6px">${escapeHtml(d.label)}</span>`;
      modal.equipGrid.appendChild(item);
    });
  }

  function renderReviews(ann) {
    const note = Number(ann.note || ann.rating || 0);
    const nb = Number(ann.nombreAvis || ann.reviewsCount || 0);

    const starsEl = modal.reviewsStars;
    const countEl = modal.reviewsCount;
    const emptyEl = modal.reviewsEmpty;

    if (emptyEl) emptyEl.style.display = note <= 0 || nb <= 0 ? 'block' : 'none';

    if (note <= 0 || nb <= 0) {
      if (starsEl) starsEl.innerHTML = '';
      if (countEl) countEl.textContent = '';
      return;
    }

    const full = Math.round(note);
    if (starsEl) {
      starsEl.innerHTML = '';
      for (let i = 1; i <= 5; i++) {
        const on = i <= Math.round((full / 10) * 5);
        const star = document.createElement('i');
        star.className = `fa-solid fa-star${on ? '' : ''}`;
        star.style.marginRight = '4px';
        star.style.color = on ? '#C9A84C' : 'rgba(255,255,255,.25)';
        starsEl.appendChild(star);
      }
    }
    if (countEl) countEl.textContent = `${nb} avis`;
  }

  function renderQuickInfos(ann) {
    if (!modal.quickInfos) return;
    const chambres = Number(ann.chambres ?? 0);
    const sdb = Number(ann.sallesDeBain ?? ann.sallesDeBain ?? 0);
    const cap = Number(ann.capacite ?? ann.capacity ?? 0);
    const surface = Number(ann.surface ?? ann.m2 ?? 0);

    modal.quickInfos.innerHTML = `
      <div class="ann-quick-item"><i class="fa-solid fa-bed"></i><span>${escapeHtml(chambres)} chambres</span></div>
      <div class="ann-quick-item"><i class="fa-solid fa-bath"></i><span>${escapeHtml(sdb)} salles de bain</span></div>
      <div class="ann-quick-item"><i class="fa-solid fa-user-group"></i><span>${escapeHtml(cap)} personnes</span></div>
      <div class="ann-quick-item"><i class="fa-solid fa-ruler-combined"></i><span>${escapeHtml(surface)} m²</span></div>
    `;
  }

  // Open / close modal
  function openModal(id) {
    const ann = getAnnouncementById(id);
    if (!ann) return;

    modalState.id = id;
    modalState.photos = getPhotos(ann);
    modalState.index = 0;
    modalState.equipements = Array.isArray(ann.equipements) ? ann.equipements : [];
    modalState.addr = ann.adresse || '';
    modalState.titre = ann.title || '';
    modalState.prix = ann.price || '';
    modalState.status = ann.status || 'Disponible';

    incModalView(id);

    if (modal.title) modal.title.textContent = ann.title || '';
    if (modal.desc) modal.desc.textContent = ann.description || '';

    if (modal.meta) modal.meta.textContent = `${ann.type === 'location' ? 'Location' : 'Vente'} • ${ann.area || ''} • ${ann.price || ''} XAF`;

    const status = getStatus(ann);
    if (modal.statusBadge) {
      modal.statusBadge.classList.remove('available', 'reserved', 'sold');
      modal.statusBadge.classList.add(status.key);
      modal.statusBadge.textContent = status.label;
    }

    const waText = encodeURIComponent(`Bonjour, je souhaite plus d’informations sur : ${ann.title || ''}. (${status.label} • ${ann.area || ''})`);
if (modal.whatsappBtn) modal.whatsappBtn.href = `https://wa.me/242056145113?text=${waText}`;

    // Favorites button in modal
    if (modal.favBtn) {
      modal.favBtn.classList.toggle('active', isFavori(id));
      modal.favBtn.setAttribute('aria-pressed', String(isFavori(id)));
    }

    // Build tabs/panes content
    if (modal.panes.desc) {
      modal.panes.desc.style.display = 'block';
    }
    switchTab('desc');

    if (modal.panes.desc && modal.panes.desc.innerHTML !== undefined) {
      // Fill description tab content
      if (modal.panes.desc) {
        modal.panes.desc.innerHTML = `
          <div style="margin-top:6px">
            <div class="ann-quick-infos" style="margin: 8px 0 12px">${modal.quickInfos ? '' : ''}</div>
            <div id="modalQuickInfos" class="ann-quick-infos">${''}</div>
            <div style="margin-top:12px" class="modal-desc">${escapeHtml(ann.description || '')}</div>
          </div>
        `;
      }
    }

    // Re-render quick infos into actual quickInfos element (if present)
    const quick = qs('#modalQuickInfos');
    if (quick) {
      modal.quickInfos = quick;
    }
    renderQuickInfos(ann);

    if (modal.equipGrid) {
      renderEquipments(modalState.equipements);
    }

    if (modal.panes.loc) {
      if (modal.locationAddr) modal.locationAddr.textContent = ann.adresse || '—';
      const addrEncoded = encodeURIComponent(`${ann.adresse || ''} Brazzaville Congo`);
      if (modal.mapsLink) {
        modal.mapsLink.href = `https://www.google.com/maps/search/${addrEncoded}`;
      }
    }

    renderReviews(ann);

    // WhatsApp share menu callbacks
    setModalShareMenu(false);

    // Gallery
    if (modal.galleryImg) modal.galleryImg.src = modalState.photos[0] || '';
    if (modal.photoCounter) modal.photoCounter.textContent = modalState.photos.length ? `1/${modalState.photos.length}` : '0/0';
    renderThumbs();

    modal.overlay?.classList.add('open');
    modal.overlay?.setAttribute('aria-hidden', 'false');
  }

  function closeModal() {
    modalState = { id: null, photos: [], index: 0, equipped: [], addr: '', titre: '', prix: '', status: null };
    modal.overlay?.classList.remove('open');
    modal.overlay?.setAttribute('aria-hidden', 'true');
    setModalShareMenu(false);
  }

  modal.prev?.addEventListener('click', () => {
    if (!modalState.photos.length) return;
    goToPhoto(modalState.index - 1);
  });

  modal.next?.addEventListener('click', () => {
    if (!modalState.photos.length) return;
    goToPhoto(modalState.index + 1);
  });

  modal.closeTop?.addEventListener('click', closeModal);
  modal.closeBtn?.addEventListener('click', closeModal);

  modal.overlay?.addEventListener('click', (e) => {
    if (e.target === modal.overlay) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    const open = modal.overlay?.classList.contains('open');
    if (!open) return;
    if (e.key === 'Escape') closeModal();
    if (e.key === 'ArrowLeft') modal.prev?.click();
    if (e.key === 'ArrowRight') modal.next?.click();
  });

  // Filters logic
  let allAnnouncements = [];
  const currentFilters = { type: 'all', area: '', minPrice: '', maxPrice: '', search: '' };

  function filterAnnonces(list) {
    const type = currentFilters.type;
    const area = (currentFilters.area || '').trim();
    const minPrice = normalizePrice(currentFilters.minPrice);
    const maxPrice = normalizePrice(currentFilters.maxPrice);
    const search = (currentFilters.search || '').trim().toLowerCase();

    return list.filter((ann) => {
      const annType = String(ann.type || 'vente');
      if (type !== 'all') {
        if (type === 'vente' && annType !== 'vente') return false;
        if (type === 'location' && annType !== 'location') return false;
      }

      if (area && String(ann.area || '') !== area) return false;

      if (minPrice !== null) {
        const p = normalizePrice(ann.price);
        if (p === null || p < minPrice) return false;
      }
      if (maxPrice !== null) {
        const p = normalizePrice(ann.price);
        if (p === null || p > maxPrice) return false;
      }

      if (search) {
        const hay = `${ann.title || ''} ${ann.description || ''} ${ann.area || ''}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }

      return true;
    });
  }

  function updateCounter(n) {
    if (!els.annCounter) return;
    els.annCounter.style.display = 'block';
    els.annCounter.textContent = `${n} biens trouvés`;
  }

  function renderAnnouncements(list) {
    if (!els.grid) return;
    els.grid.innerHTML = '';

    if (!list.length) {
      els.annCounter && (els.annCounter.style.display = 'none');
      const msg = document.createElement('div');
      msg.className = 'fineprint';
      msg.textContent = 'Aucun bien ne correspond à votre recherche';
      els.grid.appendChild(msg);
      return;
    }

    updateCounter(list.length);

    list.forEach((ann) => {
      const status = getStatus(ann);
      const typeLabel = ann.type === 'location' ? 'Location' : 'Vente';
      const pillClass = ann.type === 'location' ? 'location' : 'vente';
      const photos = getPhotos(ann);
      const img = photos[0] || '';

      const note = Number(ann.note || 0);
      const nbAvis = Number(ann.nombreAvis || 0);
      const hasNote = note > 0;

      const fav = isFavori(ann.id);

      const card = document.createElement('article');
      card.className = 'ann-card';

      card.innerHTML = `
        <div class="ann-thumb" style="position:relative;">
          ${img ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(ann.title || '')}" />` : '<div class="ann-thumb-missing">Image indisponible</div>'}

          ${hasNote ? `<div class="ann-note-badge">⭐ ${note}/10 · ${nbAvis} avis</div>` : ''}

          <div class="ann-photo-actions">
            <button class="ann-action-btn fav ${fav ? 'active' : ''}" type="button" data-fav-id="${escapeHtml(ann.id)}" aria-label="Favori">
              <i class="fa-solid fa-heart"></i>
            </button>
            <div style="position:relative">
              <button class="ann-action-btn share" type="button" data-share-id="${escapeHtml(ann.id)}" aria-label="Partager">
                <i class="fa-solid fa-share-nodes"></i>
              </button>
              <div class="share-menu" id="shareMenu-${escapeHtml(ann.id)}">
                <button type="button" data-share-copy="${escapeHtml(ann.id)}"><i class="fa-solid fa-link"></i> Copier le lien</button>
                <button type="button" data-share-wa="${escapeHtml(ann.id)}"><i class="fa-brands fa-whatsapp"></i> Partager sur WhatsApp</button>
              </div>
            </div>
          </div>
        </div>

        <div class="ann-body">
          <div class="ann-meta">
            <span class="ann-pill ${pillClass}">${escapeHtml(typeLabel)}</span>
            <span class="ann-pill pill-quiet">${escapeHtml(ann.area || '')}</span>
          </div>

          <h3 class="ann-title">${escapeHtml(ann.title || '')}</h3>

          <div class="ann-quick-infos">
            <div class="ann-quick-item"><i class="fa-solid fa-bed"></i><span>${escapeHtml(ann.chambres ?? 0)} chambres</span></div>
            <div class="ann-quick-item"><i class="fa-solid fa-bath"></i><span>${escapeHtml(ann.sallesDeBain ?? 0)} salles de bain</span></div>
            <div class="ann-quick-item"><i class="fa-solid fa-user-group"></i><span>${escapeHtml(ann.capacite ?? 0)} personnes</span></div>
            <div class="ann-quick-item"><i class="fa-solid fa-ruler-combined"></i><span>${escapeHtml(ann.surface ?? 0)} m²</span></div>
          </div>

          <p class="ann-price">${escapeHtml(ann.price || '')} XAF</p>
          <p class="ann-desc">${escapeHtml(String(ann.description || '').replaceAll('\n', ' ')).slice(0, 140)}${String(ann.description || '').length > 140 ? '…' : ''}</p>

          <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center; justify-content:space-between; margin-top:6px">
            <span class="ann-pill" style="background:${status.key === 'available' ? 'rgba(37,211,102,.14)' : status.key === 'reserved' ? 'rgba(253,126,20,.14)' : 'rgba(220,53,69,.14)'}; border-color:${status.key === 'available' ? 'rgba(37,211,102,.35)' : status.key === 'reserved' ? 'rgba(253,126,20,.35)' : 'rgba(220,53,69,.35)'}; color:#fff;">${escapeHtml(status.label)}</span>
            <a href="#" class="btn btn-primary btn-sm" data-open-modal="${escapeHtml(ann.id)}">
              Voir détails
              <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
            </a>
          </div>
        </div>
      `;

      els.grid.appendChild(card);
    });

    qsa('[data-open-modal]', els.grid).forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        openModal(btn.getAttribute('data-open-modal'));
      });
    });

    // Favorites click
    qsa('.ann-action-btn.fav', els.grid).forEach((b) => {
      b.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = b.getAttribute('data-fav-id');
        if (!id) return;
        const next = toggleFavori(id);
        b.classList.toggle('active', next.map(String).includes(String(id)));
        updateFavoriBadge();
      });
    });

    // Share menu click
    qsa('.ann-action-btn.share', els.grid).forEach((b) => {
      b.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = b.getAttribute('data-share-id');
        const menu = qs(`#shareMenu-${CSS.escape(id)}`);
        if (!menu) return;
        const anyOpen = qsa('.share-menu.open');
        anyOpen.forEach((m) => m.classList.remove('open'));
        menu.classList.toggle('open');
      });
    });

    document.addEventListener('click', (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      if (t.closest('.share-menu')) return;
      qsa('.share-menu.open').forEach((m) => m.classList.remove('open'));
    });

    // Share menu actions
    qsa('[data-share-copy]', els.grid).forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        copyLink();
      });
    });

    qsa('[data-share-wa]', els.grid).forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = btn.getAttribute('data-share-wa');
        const ann = getAnnouncementById(id);
        if (!ann) return;
        shareWhatsApp(ann.title || '', ann.price || '');
      });
    });
  }

  function applyFilters() {
    const filtered = filterAnnonces(allAnnouncements);
    renderAnnouncements(filtered);
  }

  // Init UI state filters (type)
  function syncFiltersFromUI() {
    currentFilters.type = els.filterTypeButtons.find((b) => b.classList.contains('active'))?.getAttribute('data-filter-type') || 'all';
    currentFilters.area = els.filterArea?.value || '';
    currentFilters.minPrice = els.filterMinPrice?.value || '';
    currentFilters.maxPrice = els.filterMaxPrice?.value || '';
  }

  els.filterTypeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      els.filterTypeButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      syncFiltersFromUI();
      applyFilters();
    });
  });

  ['input', 'change'].forEach((evt) => {
    els.filterArea?.addEventListener(evt, () => {
      syncFiltersFromUI();
      applyFilters();
    });
    els.filterMinPrice?.addEventListener(evt, () => {
      syncFiltersFromUI();
      applyFilters();
    });
    els.filterMaxPrice?.addEventListener(evt, () => {
      syncFiltersFromUI();
      applyFilters();
    });
  });

  els.btnSearchGold?.addEventListener('click', () => {
    syncFiltersFromUI();
    applyFilters();
  });

  // Hero search
  function searchAnnonces(q) {
    currentFilters.search = (q || '').trim();
    applyFilters();
  }

  els.heroSearchBtn?.addEventListener('click', () => {
    searchAnnonces(els.heroSearchInput?.value || '');
    qs('#biens')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  els.heroSearchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') els.heroSearchBtn?.click();
  });

  // Load data
  allAnnouncements = readJSON(STORAGE_ANNOUNCEMENTS, []);
  renderAnnouncements(allAnnouncements);

  // Contact form save
  const contactForm = qs('#contactForm');
  const contactStatus = qs('#contactFormStatus');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();

      if (contactStatus) {
        contactStatus.textContent = '';
        contactStatus.classList.remove('is-error', 'is-success');
      }

      const fd = new FormData(contactForm);
      const payload = Object.fromEntries(fd.entries());

      const required = ['name', 'email', 'phone', 'message'];
      for (const k of required) {
        if (!String(payload[k] || '').trim()) {
          if (contactStatus) {
            contactStatus.textContent = 'Veuillez remplir tous les champs requis.';
            contactStatus.classList.add('is-error');
          }
          return;
        }
      }

      const list = readJSON(STORAGE_MESSAGES, []);
      list.push({
        name: String(payload.name),
        email: String(payload.email),
        phone: String(payload.phone),
        message: String(payload.message),
        area: String(payload.area || ''),
        createdAt: Date.now(),
      });
      writeJSON(STORAGE_MESSAGES, list);

      if (contactStatus) {
        contactStatus.textContent = 'Message envoyé avec succès. Merci !';
        contactStatus.classList.remove('is-error');
        contactStatus.classList.add('is-success');
      }
      contactForm.reset();
    });
  }
})();

