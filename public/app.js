const seedListings = [
  { id: 'demo-1', title: 'Kost Taman Sari', type: 'kost', area: 'Seturan', price: 1250000, whatsapp: '6281234567890', ownerName: 'Mbak Rani', facilities: ['WiFi', 'Kamar mandi dalam', 'Parkir'], description: 'Kost tenang dekat kampus, akses mudah ke Jalan Raya Seturan.', status: 'approved', permissionStatus: 'approved', verificationStatus: 'verified', createdAt: '2026-10-10', updatedAt: '2026-10-10' },
  { id: 'demo-2', title: 'Pogung Cozy House', type: 'kontrakan', area: 'Pogung', price: 2800000, whatsapp: '6281398765432', ownerName: 'Pak Dimas', facilities: ['2 kamar', 'Dapur', 'Carport'], description: 'Rumah mungil siap huni untuk pasangan atau keluarga kecil.', status: 'approved', permissionStatus: 'approved', verificationStatus: 'verified', createdAt: '2026-10-08', updatedAt: '2026-10-08' },
  { id: 'demo-3', title: 'Kost Putri Gejayan', type: 'kost', area: 'Gejayan', price: 950000, whatsapp: '6285711122233', ownerName: 'Bu Sari', facilities: ['Laundry', 'WiFi', 'Dapur bersama'], description: 'Kost putri dengan suasana homey, dekat area kuliner dan kampus.', status: 'approved', permissionStatus: 'approved', verificationStatus: 'verified', createdAt: '2026-10-05', updatedAt: '2026-10-05' },
  { id: 'demo-4', title: 'Jakal View Kost', type: 'kost', area: 'Jakal', price: 1500000, whatsapp: '628122224444', ownerName: 'Mas Arif', facilities: ['AC', 'Kamar mandi dalam', 'Parkir'], description: 'Kamar nyaman di area Jakal dengan pemandangan sawah.', status: 'pending', permissionStatus: 'pending', verificationStatus: 'unverified', createdAt: '2026-10-23', updatedAt: '2026-10-23' }
];

const STORAGE_KEY = 'ngekost-jogja:listings:v1';
const getListings = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || seedListings;
const saveListings = (listings) => localStorage.setItem(STORAGE_KEY, JSON.stringify(listings));
if (!localStorage.getItem(STORAGE_KEY)) saveListings(seedListings);

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const rupiah = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value).replace('IDR', 'Rp');
const labelType = (type) => type === 'kost' ? 'Kost' : 'Kontrakan';
const esc = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

function showToast(message) {
  const toast = $('#toast'); toast.textContent = message; toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
}

function showView(view) {
  document.querySelector('main').hidden = view !== 'home';
  $$('.app-view').forEach((element) => { element.hidden = element.id !== `${view}-view`; });
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (view === 'owner') prepareOwnerEditor();
  if (view === 'admin') renderAdmin();
}

function prepareOwnerEditor() {
  if ($('#owner-editor')) return;
  const form = $('#owner-form'); const strip = document.createElement('div'); strip.id = 'owner-editor'; strip.className = 'edit-strip';
  strip.innerHTML = '<span>Sudah pernah mengirim listing?</span><select id="owner-edit-select"><option value="">Pilih listing untuk edit</option></select><button id="load-owner-edit" class="button button-ghost" type="button">Edit</button>';
  form.parentNode.insertBefore(strip, form);
  const select = $('#owner-edit-select'); getListings().filter((item) => item.ownerName && item.id.indexOf('demo-') !== 0).forEach((item) => { select.insertAdjacentHTML('beforeend', `<option value="${esc(item.id)}">${esc(item.title)} · ${esc(item.area)}</option>`); });
  $('#load-owner-edit').addEventListener('click', () => { const item = getListings().find((listing) => listing.id === select.value); if (!item) return showToast('Pilih listing yang ingin diedit dulu.'); const ownerForm = $('#owner-form'); Object.entries({ id: item.id, title: item.title, ownerName: item.ownerName, type: item.type, area: item.area, price: item.price, whatsapp: item.whatsapp, facilities: (item.facilities || []).join(', '), description: item.description }).forEach(([key, value]) => { const field = ownerForm.elements[key]; if (field) field.value = value; }); ownerForm.elements.publishConsent.checked = true; ownerForm.elements.contactConsent.checked = true; showToast('Data listing dimuat. Silakan edit lalu kirim ulang.'); });
}

function listingCard(listing) {
  return `<article class="listing-card"><div class="listing-art"><span class="type-pill">${labelType(listing.type)}</span></div><div class="listing-body"><h3>${esc(listing.title)}</h3><p class="listing-meta">⌖ ${esc(listing.area)} · ${listing.facilities?.slice(0, 2).map(esc).join(' · ') || 'Info fasilitas tersedia'}</p><div class="listing-bottom"><span class="price">${rupiah(listing.price)} <small>/ bulan</small></span><button class="detail-link" data-detail="${esc(listing.id)}">Lihat detail ↗</button></div></div></article>`;
}

function renderListings() {
  const form = $('#search-form'); const data = new FormData(form);
  const query = (data.get('query') || '').toLowerCase(); const type = data.get('type'); const maxPrice = data.get('maxPrice');
  const listings = getListings().filter((item) => item.status === 'approved' && (!query || `${item.title} ${item.area} ${item.description}`.toLowerCase().includes(query)) && (type === 'all' || item.type === type) && (maxPrice === 'all' || item.price <= Number(maxPrice)));
  $('#listing-grid').innerHTML = listings.map(listingCard).join(''); $('#result-count').textContent = `${listings.length} tempat tersedia`; $('#empty-state').hidden = listings.length !== 0;
}

function showDetail(id) {
  const listing = getListings().find((item) => item.id === id); if (!listing) return;
  const phone = String(listing.whatsapp).replace(/\D/g, ''); const message = encodeURIComponent(`Halo ${listing.ownerName || ''}, saya tertarik dengan ${listing.title} di ${listing.area}. Apakah masih tersedia?`);
  $('#detail-content').innerHTML = `<div class="detail-card"><div class="listing-art"><span class="type-pill">${labelType(listing.type)}</span></div><div class="detail-info"><p class="eyebrow">${esc(listing.area)} · JOGJA</p><h1>${esc(listing.title)}</h1><p class="big-price">${rupiah(listing.price)} <small>/ bulan</small></p><p class="detail-copy">${esc(listing.description)}</p><div class="facilities">${(listing.facilities || []).map((item) => `<span class="facility">✓ ${esc(item)}</span>`).join('')}</div><a class="button button-orange" href="https://wa.me/${phone}?text=${message}" target="_blank" rel="noopener">Chat via WhatsApp <span>↗</span></a><p class="small-copy">Kontak dibagikan karena pemilik telah menyetujui penggunaan WhatsApp untuk listing ini.</p></div></div>`;
  showView('detail');
}

function resetOwnerForm() { $('#owner-form').reset(); $('[name=id]', $('#owner-form')).value = ''; }
function submitOwner(event) {
  event.preventDefault(); const form = event.currentTarget; const data = Object.fromEntries(new FormData(form)); const listings = getListings();
  const listing = { id: data.id || `owner-${Date.now()}`, title: data.title, ownerName: data.ownerName, type: data.type, area: data.area, price: Number(data.price), whatsapp: data.whatsapp, facilities: data.facilities.split(',').map((item) => item.trim()).filter(Boolean), description: data.description, status: 'pending', permissionStatus: 'approved', verificationStatus: 'pending', consentTextVersion: 'v1', consentCapturedAt: new Date().toISOString(), createdAt: new Date().toISOString().slice(0, 10), updatedAt: new Date().toISOString().slice(0, 10) };
  const index = listings.findIndex((item) => item.id === listing.id); index >= 0 ? listings.splice(index, 1, listing) : listings.push(listing); saveListings(listings); resetOwnerForm(); showToast('Listing masuk review. Terima kasih!'); showView('home'); renderListings();
}

function renderAdmin() {
  const listings = getListings(); const pending = listings.filter((item) => item.status === 'pending'); const approved = listings.filter((item) => item.status === 'approved');
  $('#admin-stats').innerHTML = `<div class="stat"><strong>${approved.length}</strong><span>Approved live</span></div><div class="stat"><strong>${pending.length}</strong><span>Menunggu review</span></div><div class="stat"><strong>${listings.length}</strong><span>Total di database</span></div>`; $('#queue-count').textContent = `${pending.length} pending`;
  $('#admin-queue').innerHTML = pending.length ? pending.map((item) => `<div class="queue-item"><div><h3>${esc(item.title)}</h3><p>${labelType(item.type)} · ${esc(item.area)} · ${rupiah(item.price)}</p><p>Consent: ${item.permissionStatus} · ${item.consentTextVersion || 'CSV import'}</p></div><div class="queue-actions"><button class="mini-button" data-approve="${item.id}">Approve</button><button class="mini-button reject" data-reject="${item.id}">Reject</button></div></div>`).join('') : '<p class="small-copy">Queue kosong. Semua listing sudah diproses.</p>';
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean); if (lines.length < 2) return [];
  const headers = lines.shift().split(',').map((item) => item.trim().toLowerCase());
  return lines.map((line) => { const values = line.split(',').map((item) => item.trim()); return Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])); });
}

let csvRows = [];
$('#search-form').addEventListener('submit', (event) => { event.preventDefault(); renderListings(); $('#listings').scrollIntoView({ behavior: 'smooth' }); });
$$('[data-quick]').forEach((button) => button.addEventListener('click', () => { $('#query').value = button.dataset.quick; renderListings(); }));
document.addEventListener('click', (event) => {
  const viewButton = event.target.closest('[data-view]'); if (viewButton) { if (viewButton.dataset.view === 'owner') resetOwnerForm(); showView(viewButton.dataset.view); }
  const detailButton = event.target.closest('[data-detail]'); if (detailButton) showDetail(detailButton.dataset.detail);
  const approve = event.target.closest('[data-approve]'); if (approve) updateStatus(approve.dataset.approve, 'approved');
  const reject = event.target.closest('[data-reject]'); if (reject) updateStatus(reject.dataset.reject, 'rejected');
});
$('#owner-form').addEventListener('submit', submitOwner);

function updateStatus(id, status) { const listings = getListings(); const item = listings.find((listing) => listing.id === id); if (!item) return; item.status = status; item.permissionStatus = status === 'approved' ? 'approved' : item.permissionStatus; item.updatedAt = new Date().toISOString().slice(0, 10); saveListings(listings); renderAdmin(); renderListings(); showToast(status === 'approved' ? 'Listing approved dan tampil di katalog.' : 'Listing ditandai rejected.'); }
$('#reset-data').addEventListener('click', () => { saveListings(seedListings); renderAdmin(); renderListings(); showToast('Demo data dikembalikan.'); });
$('#csv-input').addEventListener('change', async (event) => { const file = event.target.files[0]; if (!file) return; csvRows = parseCSV(await file.text()); $('#csv-preview').hidden = false; $('#csv-preview').textContent = JSON.stringify(csvRows.slice(0, 5), null, 2); $('#import-csv').disabled = !csvRows.length; });
$('#import-csv').addEventListener('click', () => { const imported = csvRows.map((row, index) => ({ id: `csv-${Date.now()}-${index}`, title: row.title || 'Untitled listing', ownerName: row.owner_name || 'Imported owner', type: row.type === 'kontrakan' ? 'kontrakan' : 'kost', area: row.area || 'Jogja', price: Number(row.price || 0), whatsapp: row.whatsapp || '', facilities: (row.facilities || '').split('|').map((item) => item.trim()).filter(Boolean), description: row.description || '', status: 'pending', permissionStatus: row.permission_status === 'approved' ? 'approved' : 'pending', verificationStatus: 'pending', source: row.source || 'csv', consentTextVersion: row.consent_text_version || 'required-before-publish', createdAt: new Date().toISOString().slice(0, 10), updatedAt: new Date().toISOString().slice(0, 10) })); saveListings([...getListings(), ...imported]); csvRows = []; $('#csv-input').value = ''; $('#csv-preview').hidden = true; $('#import-csv').disabled = true; renderAdmin(); showToast(`${imported.length} listing masuk review queue.`); });

renderListings();

