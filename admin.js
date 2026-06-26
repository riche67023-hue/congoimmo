(() => {
  const STORAGE_ANNOUNCEMENTS = 'immocongo_announcements';
  const STORAGE_MESSAGES      = 'immocongo_contact_messages';
  const STORAGE_FAVORIS       = 'immocongo_favoris';
  const ADMIN_SESSION_KEY     = 'immocongo_admin_session';
  const PASSWORD              = 'immocongo2025';

  // Pagination
  const PAGE_SIZE = 6;
  let currentPage = 1;
  let currentSort = 'recent';

  /* ── Utilitaires ── */
  const qs  = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const escapeHtml = (str) =>
    String(str ?? '')
      .replaceAll('&',  '&amp;')
      .replaceAll('<',  '&lt;')
      .replaceAll('>',  '&gt;')
      .replaceAll('"',  '&quot;')
      .replaceAll("'",  '&#039;');

  const escapeAttr = (str) => escapeHtml(str).replaceAll('`', '');

  const readJSON  = (key, fallback) => { try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; } catch { return fallback; } };
  const writeJSON = (key, value)    => localStorage.setItem(key, JSON.stringify(value));
  const uid       = () => 'a_' + Math.random().toString(16).slice(2) + '_' + Date.now();

  const normalizePrice = (v) => { const n = Number(String(v ?? '').replace(/[^0-9.]/g, '')); return Number.isFinite(n) ? n : 0; };
  const formatXAF      = (v) => { try { return new Intl.NumberFormat('fr-FR').format(normalizePrice(v)); } catch { return String(v); } };

  /* ── Auth ── */
  const loginPanel   = qs('#loginPanel');
  const adminPanel   = qs('#adminPanel');
  const loginForm    = qs('#loginForm');
  const adminPassword = qs('#adminPassword');
  const loginStatus  = qs('#loginStatus');
  const logoutBtn    = qs('#logoutBtn');

  const isAuthed  = () => localStorage.getItem(ADMIN_SESSION_KEY) === 'ok';
  const setAuthed = (state) => {
    if (state) localStorage.setItem(ADMIN_SESSION_KEY, 'ok');
    else       localStorage.removeItem(ADMIN_SESSION_KEY);
    renderAuth();
  };

  const renderAuth = () => {
    const authed = isAuthed();
    loginPanel?.classList.toggle('hidden', authed);
    adminPanel?.classList.toggle('hidden', !authed);
    if (logoutBtn) logoutBtn.style.display = authed ? 'inline-flex' : 'none';
    if (!authed && adminPassword) adminPassword.value = '';
    if (authed) loadAll();
  };

  loginForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    if ((adminPassword?.value ?? '') === PASSWORD) {
      if (loginStatus) { loginStatus.textContent = ''; loginStatus.style.color = ''; }
      setAuthed(true);
    } else {
      if (loginStatus) { loginStatus.textContent = 'Mot de passe incorrect.'; loginStatus.style.color = 'rgba(255,120,120,.95)'; }
    }
  });

  logoutBtn?.addEventListener('click', () => setAuthed(false));

  /* ── Éléments du formulaire ── */
  const announcementsGrid = qs('#announcementsGrid');
  const emptyState        = qs('#emptyState');
  const messagesList      = qs('#messagesList');
  const announcementForm  = qs('#announcementForm');
  const formStatus        = qs('#formStatus');
  const cancelEditBtn     = qs('#cancelEditBtn');

  // Champs texte
  const editId       = qs('#editId');
  const annTitle     = qs('#annTitle');
  const annType      = qs('#annType');
  const annDesc      = qs('#annDesc');
  const annArea      = qs('#annArea');
  const annAddress   = qs('#formAdresse');
  const annPrice     = qs('#annPrice');
  const annStatus    = qs('#annStatus');

  // ✅ Champs manquants maintenant présents dans le HTML
  const annChambres    = qs('#annChambres');
  const annSallesDeBain = qs('#annSallesDeBain');
  const annCapacite    = qs('#annCapacite');
  const annSurface     = qs('#annSurface');
  const annNote        = qs('#annNote');
  const annNombreAvis  = qs('#annNombreAvis');
  const annUrgent      = qs('#annUrgent');

  // Équipements
  const annEquipGrid   = qs('#annEquipments');
  const annEquipChecks = annEquipGrid ? qsa('input[type="checkbox"]', annEquipGrid) : [];

  // Photos
  const annImageFiles       = qs('#annImageFiles');
  const annImagesDataUrl    = qs('#annImagesDataUrl');
  const annImagesPreviewGrid = qs('#annImagesPreviewGrid');
  const annImagesPreviewEmpty = qs('#annImagesPreviewEmpty');

  // Tri & pagination
  const adminSortSelect  = qs('#adminSortSelect');
  const adminPagination  = qs('#adminPagination');

  /* ── Status message ── */
  const setStatusMsg = (msg, type) => {
    if (!formStatus) return;
    formStatus.textContent = msg || '';
    formStatus.style.color = type === 'error' ? 'rgba(255,120,120,.95)' : 'rgba(26,86,255,.95)';
  };

  /* ── Photos ── */
  let currentPhotos = [];

  const normalizePhotos = (ann) => {
    if (Array.isArray(ann.images) && ann.images.length) return ann.images;
    const s = ann.imageDataUrl || ann.imageUrl || '';
    return s ? [s] : [];
  };

  const updatePhotosHidden = () => {
    if (annImagesDataUrl) annImagesDataUrl.value = JSON.stringify(currentPhotos);
  };

  const renderPhotosPreview = () => {
    if (!annImagesPreviewGrid) return;
    annImagesPreviewGrid.innerHTML = '';
    if (!currentPhotos.length) {
      if (annImagesPreviewEmpty) annImagesPreviewGrid.appendChild(annImagesPreviewEmpty);
      return;
    }
    currentPhotos.slice(0, 10).forEach((src, i) => {
      const wrap = document.createElement('div');
      wrap.style.cssText = 'position:relative; border-radius:14px; overflow:hidden; border:1px solid rgba(255,255,255,.12); background:rgba(0,0,0,.06)';
      const img = document.createElement('img');
      img.src = src; img.alt = 'Prévisualisation';
      img.style.cssText = 'width:100%; height:110px; object-fit:cover; display:block';
      const xBtn = document.createElement('button');
      xBtn.type = 'button'; xBtn.textContent = '✕';
      xBtn.setAttribute('aria-label', 'Retirer');
      xBtn.style.cssText = 'position:absolute; top:6px; right:6px; width:30px; height:30px; border-radius:12px; border:1px solid rgba(255,255,255,.25); background:rgba(0,0,0,.45); color:#fff; cursor:pointer; font-weight:900';
      xBtn.addEventListener('click', () => {
        currentPhotos = currentPhotos.filter((_, idx) => idx !== i);
        updatePhotosHidden(); renderPhotosPreview();
      });
      wrap.appendChild(img); wrap.appendChild(xBtn);
      annImagesPreviewGrid.appendChild(wrap);
    });
  };

  const readFilesAsBase64 = (files, limitBytes = 5 * 1024 * 1024) =>
    new Promise((resolve, reject) => {
      const arr = Array.from(files || []);
      if (arr.reduce((s, f) => s + (f?.size || 0), 0) > limitBytes) {
        reject(new Error('Images trop lourdes (limite ~5MB total).'));
        return;
      }
      Promise.all(arr.map(f => new Promise((res, rej) => {
        const r = new FileReader();
        r.onload  = () => res(String(r.result || ''));
        r.onerror = () => rej(new Error('Erreur lecture image.'));
        r.readAsDataURL(f);
      }))).then(resolve).catch(reject);
    });

  annImageFiles?.addEventListener('change', async () => {
    const files = Array.from(annImageFiles.files || []).slice(0, 10);
    if (!files.length) return;
    try {
      setStatusMsg('', 'ok');
      currentPhotos = await readFilesAsBase64(files);
      updatePhotosHidden(); renderPhotosPreview();
    } catch (err) {
      currentPhotos = []; updatePhotosHidden(); renderPhotosPreview();
      setStatusMsg(String(err?.message || 'Erreur upload.'), 'error');
      annImageFiles.value = '';
    }
  });

  /* ── Équipements ── */
  const getEquipements = () => annEquipChecks.filter(c => c.checked).map(c => c.value);
  const setEquipements = (list) => {
    const s = new Set((list || []).map(String));
    annEquipChecks.forEach(c => { c.checked = s.has(String(c.value)); });
  };

  /* ── Reset formulaire ── */
  const resetForm = () => {
    if (editId) editId.value = '';
    announcementForm?.reset();
    if (annType)   annType.value   = 'vente';
    if (annStatus) annStatus.value = 'Disponible';
    if (annChambres)     annChambres.value     = '0';
    if (annSallesDeBain) annSallesDeBain.value = '0';
    if (annCapacite)     annCapacite.value     = '1';
    if (annSurface)      annSurface.value      = '0';
    if (annNote)         annNote.value         = '0';
    if (annNombreAvis)   annNombreAvis.value   = '0';
    if (annUrgent)       annUrgent.checked     = false;
    setEquipements([]);
    currentPhotos = [];
    updatePhotosHidden(); renderPhotosPreview();
    setStatusMsg('', 'ok');
  };

  cancelEditBtn?.addEventListener('click', resetForm);

  /* ── Tri ── */
  const sortList = (list, sort) => {
    const copy = [...list];
    switch (sort) {
      case 'recent':    return copy.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      case 'oldest':    return copy.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      case 'price_asc': return copy.sort((a, b) => normalizePrice(a.price) - normalizePrice(b.price));
      case 'price_desc':return copy.sort((a, b) => normalizePrice(b.price) - normalizePrice(a.price));
      case 'title_az':  return copy.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'fr'));
      default:          return copy;
    }
  };

  adminSortSelect?.addEventListener('change', () => {
    currentSort = adminSortSelect.value;
    currentPage = 1;
    renderAnnouncements();
  });

  /* ── Pagination ── */
  const renderPagination = (total) => {
    if (!adminPagination) return;
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    adminPagination.innerHTML = '';
    if (pages <= 1) return;

    const mkBtn = (label, page, disabled = false, active = false) => {
      const btn = document.createElement('button');
      btn.textContent = label;
      if (active)   btn.classList.add('active');
      if (disabled) btn.disabled = true;
      btn.addEventListener('click', () => { currentPage = page; renderAnnouncements(); });
      return btn;
    };

    adminPagination.appendChild(mkBtn('‹ Préc.', currentPage - 1, currentPage === 1));
    for (let p = 1; p <= pages; p++) {
      adminPagination.appendChild(mkBtn(String(p), p, false, p === currentPage));
    }
    adminPagination.appendChild(mkBtn('Suiv. ›', currentPage + 1, currentPage === pages));
  };

  /* ── Rendu annonces admin ── */
  const renderAnnouncements = () => {
    if (!announcementsGrid) return;
    const all  = readJSON(STORAGE_ANNOUNCEMENTS, []);
    const sorted = sortList(all, currentSort);
    const pages  = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    if (currentPage > pages) currentPage = pages;
    const slice  = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    announcementsGrid.innerHTML = '';
    if (emptyState) emptyState.style.display = all.length ? 'none' : 'block';

    slice.forEach((ann) => {
      const photos    = normalizePhotos(ann);
      const img       = photos[0] || '';
      const pillClass = ann.type === 'location' ? 'location' : 'vente';
      const typeLabel = ann.type === 'location' ? 'Location' : 'Vente';
      const urgent    = ann.urgent ? `<span style="background:#e53e3e; color:#fff; font-size:11px; font-weight:900; padding:3px 8px; border-radius:999px; margin-left:6px">🔥 URGENT</span>` : '';

      const card = document.createElement('div');
      card.className = 'announcement-card';
      card.innerHTML = `
        <div class="thumb" style="position:relative">
          ${img ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(ann.title || '')}" />` : '<div style="padding:20px; text-align:center; color:rgba(255,255,255,.4)">Image indisponible</div>'}
          <div style="position:absolute; top:10px; left:10px; display:flex; gap:6px; flex-wrap:wrap">
            <span class="ann-pill ${pillClass}">${escapeHtml(typeLabel)}</span>
            ${urgent}
          </div>
        </div>
        <div class="admin-card-content">
          <h4 class="announcement-title">${escapeHtml(ann.title || '')}</h4>
          <div class="fineprint">
            📍 ${escapeHtml(ann.area || '')} &nbsp;•&nbsp; 💰 ${escapeHtml(formatXAF(ann.price))} XAF
          </div>
          <div class="fineprint" style="display:flex; gap:10px; flex-wrap:wrap">
            <span>🛏 ${escapeHtml(String(ann.chambres ?? 0))} ch.</span>
            <span>🚿 ${escapeHtml(String(ann.sallesDeBain ?? 0))} SDB</span>
            <span>📐 ${escapeHtml(String(ann.surface ?? 0))} m²</span>
            <span>👥 ${escapeHtml(String(ann.capacite ?? 0))} pers.</span>
          </div>
          <div class="fineprint" style="margin-top:2px">Statut : <b>${escapeHtml(ann.status || 'Disponible')}</b></div>
          <div class="admin-card-actions" style="margin-top:8px">
            <button class="btn btn-primary btn-sm" type="button" data-action="edit" data-id="${escapeAttr(ann.id || '')}">✏️ Modifier</button>
            <button class="btn btn-outline btn-sm" type="button" data-action="delete" data-id="${escapeAttr(ann.id || '')}">🗑️ Supprimer</button>
          </div>
        </div>
      `;
      announcementsGrid.appendChild(card);
    });

    qsa('[data-action="edit"]',   announcementsGrid).forEach(b => b.addEventListener('click', () => startEdit(b.getAttribute('data-id'))));
    qsa('[data-action="delete"]', announcementsGrid).forEach(b => b.addEventListener('click', () => {
      const id = b.getAttribute('data-id');
      if (!id || !confirm('Supprimer cette annonce ?')) return;
      deleteAnnouncement(id);
    }));

    renderPagination(all.length);
  };

  /* ── Edition ── */
  const startEdit = (id) => {
    const list = readJSON(STORAGE_ANNOUNCEMENTS, []);
    const item = list.find(x => String(x.id) === String(id));
    if (!item) return;

    if (editId)          editId.value          = item.id || '';
    if (annTitle)        annTitle.value        = item.title || '';
    if (annType)         annType.value         = item.type || 'vente';
    if (annDesc)         annDesc.value         = item.description || '';
    if (annArea)         annArea.value         = item.area || '';
    if (annAddress)      annAddress.value      = item.adresse || '';
    if (annPrice)        annPrice.value        = item.price || '';
    if (annStatus)       annStatus.value       = item.status || 'Disponible';

    // ✅ Champs critiques
    if (annChambres)     annChambres.value     = item.chambres     ?? 0;
    if (annSallesDeBain) annSallesDeBain.value = item.sallesDeBain ?? 0;
    if (annCapacite)     annCapacite.value     = item.capacite     ?? 1;
    if (annSurface)      annSurface.value      = item.surface      ?? 0;
    if (annNote)         annNote.value         = item.note         ?? 0;
    if (annNombreAvis)   annNombreAvis.value   = item.nombreAvis   ?? 0;
    if (annUrgent)       annUrgent.checked     = !!item.urgent;

    setEquipements(item.equipements || []);

    currentPhotos = normalizePhotos(item);
    updatePhotosHidden(); renderPhotosPreview();

    setStatusMsg('✏️ Mode édition actif — modifiez puis cliquez Enregistrer.', 'ok');
    annTitle?.focus();
    qs('#announcementForm')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /* ── Suppression ── */
  const deleteAnnouncement = (id) => {
    const list = readJSON(STORAGE_ANNOUNCEMENTS, []);
    writeJSON(STORAGE_ANNOUNCEMENTS, list.filter(x => String(x.id) !== String(id)));
    renderAnnouncements();
  };

  /* ── Soumission formulaire ── */
  announcementForm?.addEventListener('submit', (e) => {
    e.preventDefault();

    const id          = editId?.value || '';
    const title       = (annTitle?.value || '').trim();
    const type        = annType?.value || 'vente';
    const description = (annDesc?.value || '').trim();
    const area        = (annArea?.value || '').trim();
    const adresse     = (annAddress?.value || '').trim();
    const price       = (annPrice?.value || '').trim();
    const status      = annStatus?.value || 'Disponible';

    // ✅ Lecture des nouveaux champs
    const chambres    = Math.max(0, Number(annChambres?.value    ?? 0));
    const sallesDeBain= Math.max(0, Number(annSallesDeBain?.value ?? 0));
    const capacite    = Math.max(1, Number(annCapacite?.value    ?? 1));
    const surface     = Math.max(0, Number(annSurface?.value     ?? 0));
    const note        = Math.max(0, Number(annNote?.value        ?? 0));
    const nombreAvis  = Math.max(0, Number(annNombreAvis?.value  ?? 0));
    const urgent      = annUrgent?.checked || false;
    const equipements = getEquipements();
    const photos      = currentPhotos || [];

    if (!title || !type || !description || !area || !adresse || !price) {
      setStatusMsg('Veuillez remplir tous les champs requis.', 'error');
      return;
    }
    if (!photos.length) {
      setStatusMsg('Ajoutez au moins une photo.', 'error');
      return;
    }

    const list    = readJSON(STORAGE_ANNOUNCEMENTS, []);
    const payload = { title, type, description, area, adresse, price, status, chambres, sallesDeBain, capacite, surface, note, nombreAvis, urgent, equipements, images: photos };

    if (id) {
      const idx = list.findIndex(x => String(x.id) === String(id));
      if (idx >= 0) list[idx] = { ...list[idx], ...payload };
      else list.push({ id: uid(), createdAt: Date.now(), ...payload });
    } else {
      list.push({ id: uid(), createdAt: Date.now(), ...payload });
    }

    writeJSON(STORAGE_ANNOUNCEMENTS, list);
    setStatusMsg(id ? '✅ Annonce mise à jour !' : '✅ Annonce ajoutée !', 'ok');
    resetForm();
    currentPage = 1;
    renderAnnouncements();
  });

  /* ── Messages ── */
  const renderMessages = () => {
    if (!messagesList) return;
    const messages = readJSON(STORAGE_MESSAGES, []);
    messagesList.innerHTML = '';

    if (!messages.length) {
      const empty = document.createElement('div');
      empty.className = 'fineprint';
      empty.textContent = 'Aucun message pour le moment.';
      messagesList.appendChild(empty);
      return;
    }

    [...messages].reverse().forEach((msg) => {
      const date = msg.createdAt ? new Date(msg.createdAt).toLocaleString('fr-FR') : '';
      const card = document.createElement('div');
      card.className = 'message-card';
      card.innerHTML = `
        <h4>${escapeHtml(msg.name || 'Utilisateur')} · ${escapeHtml(msg.email || '')}</h4>
        <p><b>Téléphone :</b> ${escapeHtml(msg.phone || '')}</p>
        ${msg.area ? `<p><b>Quartier :</b> ${escapeHtml(msg.area)}</p>` : ''}
        <p><b>Message :</b> ${escapeHtml(msg.message || '')}</p>
        <p class="fineprint" style="margin-top:8px">${escapeHtml(date)}</p>
        <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap">
          <a class="btn btn-primary btn-xs" href="https://wa.me/${msg.phone ? msg.phone.replace(/\D/g,'') : ''}?text=${encodeURIComponent('Bonjour ' + (msg.name||'') + ', merci pour votre message sur Immocongo !')}" target="_blank" rel="noopener">
            <i class="fa-brands fa-whatsapp"></i> Répondre WhatsApp
          </a>
          <button class="btn btn-outline btn-xs" type="button" data-action="deleteMsg" data-ts="${escapeAttr(String(msg.createdAt || ''))}">🗑️ Supprimer</button>
        </div>
      `;
      messagesList.appendChild(card);
    });

    qsa('[data-action="deleteMsg"]', messagesList).forEach(btn => {
      btn.addEventListener('click', () => {
        const ts = btn.getAttribute('data-ts');
        if (!ts || !confirm('Supprimer ce message ?')) return;
        const all  = readJSON(STORAGE_MESSAGES, []);
        writeJSON(STORAGE_MESSAGES, all.filter(m => String(m.createdAt || '') !== String(ts)));
        renderMessages();
      });
    });
  };

  /* ── Favoris ── */
  const renderFavoris = () => {
    const grid  = qs('#favorisGrid');
    const empty = qs('#favorisEmpty');
    if (!grid) return;

    const favIds = readJSON(STORAGE_FAVORIS, []).map(String);
    const all    = readJSON(STORAGE_ANNOUNCEMENTS, []);

    // Inclure les biens par défaut aussi
    const DEFAULT_IDS = ['default_1','default_2','default_3','default_4','default_5'];
    const favItems    = favIds
      .map(id => all.find(a => String(a.id) === id))
      .filter(Boolean);

    grid.innerHTML = '';
    if (!favItems.length) {
      if (empty) empty.style.display = 'block';
      return;
    }
    if (empty) empty.style.display = 'none';

    favItems.forEach(ann => {
      const photos  = normalizePhotos(ann);
      const img     = photos[0] || '';
      const card    = document.createElement('div');
      card.className = 'fav-card';
      card.innerHTML = `
        ${img ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(ann.title||'')}" />` : ''}
        <div class="fav-card-body">
          <h4 class="fav-card-title">${escapeHtml(ann.title||'')}</h4>
          <div class="fineprint">📍 ${escapeHtml(ann.area||'')} · ${escapeHtml(ann.type==='location'?'Location':'Vente')}</div>
          <div class="fav-card-price">${escapeHtml(formatXAF(ann.price))} XAF</div>
          <div class="fineprint" style="margin-top:2px">
            🛏 ${escapeHtml(String(ann.chambres??0))} ch.
            🚿 ${escapeHtml(String(ann.sallesDeBain??0))} SDB
            📐 ${escapeHtml(String(ann.surface??0))} m²
          </div>
          <button class="fav-remove" type="button" data-fav-remove="${escapeAttr(String(ann.id))}">
            <i class="fa-solid fa-heart-crack"></i> Retirer des favoris
          </button>
        </div>
      `;
      grid.appendChild(card);
    });

    qsa('[data-fav-remove]', grid).forEach(btn => {
      btn.addEventListener('click', () => {
        const id  = btn.getAttribute('data-fav-remove');
        const cur = readJSON(STORAGE_FAVORIS, []).map(String);
        writeJSON(STORAGE_FAVORIS, cur.filter(x => x !== id));
        renderFavoris();
      });
    });
  };

  /* ── Init ── */
  const loadAll = () => {
    renderAnnouncements();
    renderMessages();
    renderFavoris();
  };

  currentPhotos = [];
  updatePhotosHidden();
  renderPhotosPreview();
  renderAuth();
})();