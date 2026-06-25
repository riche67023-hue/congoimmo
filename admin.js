(() => {
  const STORAGE_ANNOUNCEMENTS = 'immocongo_announcements';
  const STORAGE_MESSAGES = 'immocongo_contact_messages';

  const ADMIN_SESSION_KEY = 'immocongo_admin_session';
  const PASSWORD = 'immocongo2025';

  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const escapeHtml = (str) =>
    String(str ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '<')
      .replaceAll('>', '>')
      .replaceAll('"', '"')
      .replaceAll("'", '&#039;');

  const escapeAttr = (str) => escapeHtml(str).replaceAll('`', '');

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

  const uid = () => 'a_' + Math.random().toString(16).slice(2) + '_' + Date.now();

  // Auth
  const loginPanel = qs('#loginPanel');
  const adminPanel = qs('#adminPanel');
  const loginForm = qs('#loginForm');
  const adminPassword = qs('#adminPassword');
  const loginStatus = qs('#loginStatus');
  const logoutBtn = qs('#logoutBtn');

  const isAuthed = () => localStorage.getItem(ADMIN_SESSION_KEY) === 'ok';

  const setAuthed = (state) => {
    if (state) localStorage.setItem(ADMIN_SESSION_KEY, 'ok');
    else localStorage.removeItem(ADMIN_SESSION_KEY);
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
    const pass = adminPassword?.value ?? '';
    if (pass === PASSWORD) {
      if (loginStatus) {
        loginStatus.textContent = '';
        loginStatus.style.color = '';
      }
      setAuthed(true);
    } else {
      if (loginStatus) {
        loginStatus.textContent = 'Mot de passe incorrect.';
        loginStatus.style.color = 'rgba(255,120,120,.95)';
      }
    }
  });

  logoutBtn?.addEventListener('click', () => setAuthed(false));

  // UI
  const announcementsGrid = qs('#announcementsGrid');
  const emptyState = qs('#emptyState');
  const messagesList = qs('#messagesList');

  const announcementForm = qs('#announcementForm');
  const editId = qs('#editId');

  const annTitle = qs('#annTitle');
  const annType = qs('#annType');
  const annDesc = qs('#annDesc');
  const annArea = qs('#annArea');
  const annAddress = qs('#annAddress');
  const annPrice = qs('#annPrice');

  const annChambres = qs('#annChambres');
  const annSallesDeBain = qs('#annSallesDeBain');
  const annCapacite = qs('#annCapacite');
  const annSurface = qs('#annSurface');

  const annEquipGrid = qs('#annEquipments');
  const annEquipChecks = annEquipGrid ? qsa('input[type="checkbox"]', annEquipGrid) : [];

  const annNote = qs('#annNote');
  const annNombreAvis = qs('#annNombreAvis');

  const annImageFiles = qs('#annImageFiles');
  const annImagesDataUrlHidden = qs('#annImagesDataUrl');
  const annImagesPreviewGrid = qs('#annImagesPreviewGrid');
  const annImagesPreviewEmpty = qs('#annImagesPreviewEmpty');

  const annStatusSelect = qs('#annStatus');

  const formStatus = qs('#formStatus');
  const cancelEditBtn = qs('#cancelEditBtn');

  function setStatusMsg(msg, type) {
    if (!formStatus) return;
    formStatus.textContent = msg || '';
    formStatus.style.color = type === 'error' ? 'rgba(255,120,120,.95)' : type === 'ok' ? 'rgba(26,86,255,.95)' : '';
  }

  let currentPhotos = [];

  function normalizePhotosFromStorage(ann) {
    if (Array.isArray(ann.images) && ann.images.length) return ann.images;
    const single = ann.imageDataUrl || ann.imageUrl;
    return single ? [single] : [];
  }

  function updatePhotosHiddenField() {
    if (!annImagesDataUrlHidden) return;
    annImagesDataUrlHidden.value = JSON.stringify(Array.isArray(currentPhotos) ? currentPhotos : []);
  }

  function renderPhotosPreview() {
    if (!annImagesPreviewGrid) return;
    annImagesPreviewGrid.innerHTML = '';

    const photos = Array.isArray(currentPhotos) ? currentPhotos : [];
    if (!photos.length) {
      if (annImagesPreviewEmpty) annImagesPreviewGrid.appendChild(annImagesPreviewEmpty);
      return;
    }

    const max = Math.min(10, photos.length);
    for (let i = 0; i < max; i++) {
      const src = photos[i];

      const wrapper = document.createElement('div');
      wrapper.style.position = 'relative';
      wrapper.style.borderRadius = '14px';
      wrapper.style.overflow = 'hidden';
      wrapper.style.border = '1px solid rgba(255,255,255,.12)';
      wrapper.style.background = 'rgba(0,0,0,.06)';

      const img = document.createElement('img');
      img.src = src;
      img.alt = 'Prévisualisation';
      img.style.width = '100%';
      img.style.height = '110px';
      img.style.objectFit = 'cover';
      img.style.display = 'block';

      const xBtn = document.createElement('button');
      xBtn.type = 'button';
      xBtn.textContent = '✕';
      xBtn.setAttribute('aria-label', 'Retirer cette image');
      xBtn.style.position = 'absolute';
      xBtn.style.top = '6px';
      xBtn.style.right = '6px';
      xBtn.style.width = '30px';
      xBtn.style.height = '30px';
      xBtn.style.borderRadius = '12px';
      xBtn.style.border = '1px solid rgba(255,255,255,.25)';
      xBtn.style.background = 'rgba(0,0,0,.45)';
      xBtn.style.color = '#fff';
      xBtn.style.cursor = 'pointer';
      xBtn.style.fontWeight = '900';

      xBtn.addEventListener('click', () => {
        currentPhotos = currentPhotos.filter((_, idx) => idx !== i);
        updatePhotosHiddenField();
        renderPhotosPreview();
      });

      wrapper.appendChild(img);
      wrapper.appendChild(xBtn);
      annImagesPreviewGrid.appendChild(wrapper);
    }
  }

  function readFilesAsBase64(files, totalLimitBytes = 5 * 1024 * 1024) {
    return new Promise((resolve, reject) => {
      const fileArr = Array.from(files || []);
      const totalSize = fileArr.reduce((s, f) => s + (f?.size || 0), 0);
      if (totalSize > totalLimitBytes) {
        reject(new Error('Image trop lourde (limite totale ~5MB).'));
        return;
      }

      const readerPromises = fileArr.map(
        (file) =>
          new Promise((res, rej) => {
            const reader = new FileReader();
            reader.onload = () => res(String(reader.result || ''));
            reader.onerror = () => rej(new Error('Erreur lecture image.'));
            reader.readAsDataURL(file);
          })
      );
      Promise.all(readerPromises).then(resolve).catch(reject);
    });
  }

  annImageFiles?.addEventListener('change', async () => {
    const files = annImageFiles.files ? Array.from(annImageFiles.files) : [];
    if (!files.length) return;

    const allowed = files.slice(0, 10);
    try {
      setStatusMsg('', 'ok');
      const base64Arr = await readFilesAsBase64(allowed);
      currentPhotos = base64Arr;
      updatePhotosHiddenField();
      renderPhotosPreview();
    } catch (err) {
      currentPhotos = [];
      updatePhotosHiddenField();
      renderPhotosPreview();
      setStatusMsg(String(err?.message || 'Erreur upload image.'), 'error');
      annImageFiles.value = '';
    }
  });

  function getEquipmentsFromUI() {
    if (!annEquipChecks.length) return [];
    return annEquipChecks.filter((c) => c.checked).map((c) => c.value);
  }

  function setEquipmentsInUI(equipements) {
    const set = new Set((equipements || []).map(String));
    annEquipChecks.forEach((c) => {
      c.checked = set.has(String(c.value));
    });
  }

  function resetForm() {
    if (editId) editId.value = '';
    announcementForm?.reset();

    if (annType) annType.value = 'vente';
    if (annStatusSelect) annStatusSelect.value = 'Disponible';

    currentPhotos = [];
    updatePhotosHiddenField();
    renderPhotosPreview();

    setStatusMsg('', 'ok');
  }

  cancelEditBtn?.addEventListener('click', resetForm);

  function renderAnnouncements() {
    if (!announcementsGrid) return;
    const list = readJSON(STORAGE_ANNOUNCEMENTS, []);

    announcementsGrid.innerHTML = '';
    if (emptyState) emptyState.style.display = list.length ? 'none' : 'block';

    list.forEach((ann) => {
      const photos = normalizePhotosFromStorage(ann);
      const img = photos[0] || '';

      const pillClass = ann.type === 'location' ? 'location' : 'vente';
      const typeLabel = ann.type === 'location' ? 'Location' : 'Vente';

      const note = Number(ann.note || 0);
      const nbAvis = Number(ann.nombreAvis || 0);

      const card = document.createElement('div');
      card.className = 'announcement-card';
      card.innerHTML = `
        <div class="thumb">${img ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(ann.title || '')}" />` : 'Image indisponible'}</div>
        ${note > 0 ? `<div class="ann-note-badge">⭐ ${note}/10 · ${nbAvis} avis</div>` : ''}
        <div class="ann-pill ${pillClass}">${escapeHtml(typeLabel)}</div>
        <h4 class="announcement-title">${escapeHtml(ann.title || '')}</h4>
        <div class="fineprint" style="padding:0 14px 10px">
          Quartier : <b>${escapeHtml(ann.area || '')}</b> • Prix : <b>${escapeHtml(ann.price || '')} XAF</b>
        </div>
        <p class="announcement-desc">${escapeHtml(ann.description || '')}</p>
        <div class="admin-actions">
          <button class="btn" type="button" data-action="edit" data-id="${escapeAttr(ann.id || '')}">✏️ Modifier</button>
          <button class="btn secondary" type="button" data-action="delete" data-id="${escapeAttr(ann.id || '')}">🗑️ Supprimer</button>
        </div>
      `;
      announcementsGrid.appendChild(card);
    });

    qsa('[data-action="edit"]', announcementsGrid).forEach((btn) => {
      btn.addEventListener('click', () => startEdit(btn.getAttribute('data-id')));
    });

    qsa('[data-action="delete"]', announcementsGrid).forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (!id) return;
        if (!confirm('Supprimer cette annonce ?')) return;
        deleteAnnouncement(id);
      });
    });
  }

  function startEdit(id) {
    const list = readJSON(STORAGE_ANNOUNCEMENTS, []);
    const item = list.find((x) => String(x.id) === String(id));
    if (!item) return;

    if (editId) editId.value = item.id || '';
    if (annTitle) annTitle.value = item.title || '';
    if (annType) annType.value = item.type || 'vente';
    if (annDesc) annDesc.value = item.description || '';
    if (annArea) annArea.value = item.area || '';
    if (annAddress) annAddress.value = item.adresse || '';
    if (annPrice) annPrice.value = item.price || '';

    if (annChambres) annChambres.value = item.chambres ?? 0;
    if (annSallesDeBain) annSallesDeBain.value = item.sallesDeBain ?? 0;
    if (annCapacite) annCapacite.value = item.capacite ?? 1;
    if (annSurface) annSurface.value = item.surface ?? 0;

    setEquipmentsInUI(item.equipements || []);

    if (annNote) annNote.value = item.note ?? 0;
    if (annNombreAvis) annNombreAvis.value = item.nombreAvis ?? 0;

    if (annStatusSelect) annStatusSelect.value = item.status || 'Disponible';

    currentPhotos = normalizePhotosFromStorage(item);
    updatePhotosHiddenField();
    renderPhotosPreview();

    setStatusMsg('Mode édition actif.', 'ok');
    annTitle?.focus();
  }

  function deleteAnnouncement(id) {
    const list = readJSON(STORAGE_ANNOUNCEMENTS, []);
    const next = list.filter((x) => String(x.id) !== String(id));
    writeJSON(STORAGE_ANNOUNCEMENTS, next);
    renderAnnouncements();
    renderMessages();
  }

  function renderMessages() {
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
      const createdAt = msg.createdAt ? new Date(msg.createdAt) : null;
      const card = document.createElement('div');
      card.className = 'message-card';
      card.innerHTML = `
        <h4>${escapeHtml(msg.name || 'Utilisateur')} • ${escapeHtml(msg.email || '')}</h4>
        <p><b>Téléphone :</b> ${escapeHtml(msg.phone || '')}</p>
        <p><b>Message :</b> ${escapeHtml(msg.message || '')}</p>
        <p class="fineprint" style="margin-top:8px"><b>Date :</b> ${createdAt ? escapeHtml(createdAt.toLocaleString('fr-FR')) : ''}</p>
        <div style="margin-top:10px">
          <button class="btn secondary btn-xs" type="button" data-action="deleteMsg" data-ts="${escapeAttr(String(msg.createdAt || ''))}">🗑️ Supprimer</button>
        </div>
      `;
      messagesList.appendChild(card);
    });

    qsa('[data-action="deleteMsg"]', messagesList).forEach((btn) => {
      btn.addEventListener('click', () => {
        const ts = btn.getAttribute('data-ts');
        if (!ts) return;
        if (!confirm('Supprimer ce message ?')) return;
        const all = readJSON(STORAGE_MESSAGES, []);
        const next = all.filter((m) => String(m.createdAt || '') !== String(ts));
        writeJSON(STORAGE_MESSAGES, next);
        renderMessages();
      });
    });
  }

  announcementForm?.addEventListener('submit', (e) => {
    e.preventDefault();

    const id = editId?.value || '';
    const title = (annTitle?.value || '').trim();
    const type = annType?.value || 'vente';
    const description = (annDesc?.value || '').trim();
    const area = (annArea?.value || '').trim();
    const adresse = (annAddress?.value || '').trim();
    const price = (annPrice?.value || '').trim();
    const status = annStatusSelect?.value || 'Disponible';

    const chambres = Number(annChambres?.value ?? 0);
    const sallesDeBain = Number(annSallesDeBain?.value ?? 0);
    const capacite = Number(annCapacite?.value ?? 1);
    const surface = Number(annSurface?.value ?? 0);

    const equipements = getEquipmentsFromUI();
    const note = Number(annNote?.value ?? 0);
    const nombreAvis = Number(annNombreAvis?.value ?? 0);

    const photos = currentPhotos || [];

    if (!title || !type || !description || !area || !adresse || !price || !photos.length) {
      setStatusMsg('Tous les champs requis doivent être remplis (y compris adresse + photos).', 'error');
      return;
    }

    if (capacite < 1) {
      setStatusMsg('Capacité maximum doit être au moins 1.', 'error');
      return;
    }

    const list = readJSON(STORAGE_ANNOUNCEMENTS, []);

    const payload = {
      title,
      type,
      description,
      area,
      adresse,
      price,
      status,
      chambres: Math.max(0, chambres),
      sallesDeBain: Math.max(0, sallesDeBain),
      capacite: Math.max(1, capacite),
      surface: Math.max(0, surface),
      equipements,
      note: Math.max(0, note),
      nombreAvis: Math.max(0, nombreAvis),
      images: photos,
    };

    if (id) {
      const idx = list.findIndex((x) => String(x.id) === String(id));
      if (idx >= 0) list[idx] = { ...list[idx], ...payload };
    } else {
      list.push({ id: uid(), createdAt: Date.now(), ...payload });
    }

    writeJSON(STORAGE_ANNOUNCEMENTS, list);
    setStatusMsg(id ? 'Annonce mise à jour.' : 'Annonce ajoutée.', 'ok');

    resetForm();
    renderAnnouncements();
  });

  function loadAll() {
    renderAnnouncements();
    renderMessages();
  }

  // Init
  currentPhotos = [];
  updatePhotosHiddenField();
  renderPhotosPreview();
  renderAuth();
})();

