// ==================== VARIABLES GLOBALES ====================
let map;
let markersList = [];
let currentCampus = 'all';
let currentTypeFilter = 'all';
let trajetActuel = null;
let trajetBusActuel = null;

// ==================== FONCTION POPUP ====================
function creerMarqueurAvecInfos(projet) {
    let iconUrl = projet.icone && projet.icone !== "" ? projet.icone : 'https://cdn-icons-png.flaticon.com/512/2991/2991231.png';
    let customIcon = L.divIcon({
        className: 'custom-marker',
        html: `<img src="${iconUrl}" style="width:48px;height:48px;border-radius:50%;border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.3);background:white;padding:5px;object-fit:cover;">`,
        iconSize: [48, 48],
        popupAnchor: [0, -28]
    });
    
    let marker = L.marker(projet.coordinates, { icon: customIcon });
    
    let imageHtml = '';
    if (projet.image && projet.image !== "") {
        imageHtml = `<div class="popup-img-wrapper"><img src="${projet.image}" class="popup-img" alt="${projet.nom}"></div>`;
    } else {
        imageHtml = `<div class="popup-img-wrapper"><img src="https://cdn-icons-png.flaticon.com/512/2941/2941535.png" class="popup-img" style="padding:20px;"></div>`;
    }
    
    let complementHtml = "";
    if (projet.Informations_complémentaires && projet.Informations_complémentaires.trim() !== "") {
        complementHtml += `<div class="info-complementaire"><strong>Details techniques :</strong><br>${projet.Informations_complémentaires}</div>`;
    }
    
    let popupContent = `
        <div>
            ${imageHtml}
            <div class="popup-content">
                <div class="popup-badge">${projet.type} · ${projet.campus}</div>
                <h3>${projet.nom}</h3>
                <div class="popup-description">${projet.description || "Aucune description"}</div>
                ${complementHtml}
            </div>
        </div>
    `;
    
    marker.bindPopup(popupContent, { maxWidth: 450, minWidth: 320 });
    return marker;
}

// ==================== INITIALISATION ====================
function initMap() {
    if (typeof projets === 'undefined') {
        console.error("Données non chargées");
        return;
    }
    
    map = L.map('map').setView([32.221017, -7.935687], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
        attribution: '© OpenStreetMap'
    }).addTo(map);
    
    projets.forEach(proj => {
        let marker = creerMarqueurAvecInfos(proj);
        marker.addTo(map);
        markersList.push({ marker: marker, projet: proj });
    });
    
    appliquerFiltres();
    afficherFiltresTypes();
    afficherListeSousTypes();
    afficherTrajetsSection();
    mettreAJourStats();
    
    document.getElementById('btnAll')?.addEventListener('click', afficherTousCampus);
    document.getElementById('btnBG')?.addEventListener('click', recentrerBenGuerir);
    document.getElementById('btnRabat')?.addEventListener('click', recentrerRabat);
    
    document.querySelector('.reset-btn')?.addEventListener('click', () => {
        currentTypeFilter = 'all';
        appliquerFiltres();
        afficherFiltresTypes();
        afficherListeSousTypes();
        effacerTousLesTrajets();
        document.querySelectorAll('.type-filter-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('.type-filter-btn[data-type="all"]')?.classList.add('active');
    });
}

// ==================== FILTRES ====================
function appliquerFiltres() {
    markersList.forEach(item => {
        let matchCampus = (currentCampus === 'all' || item.projet.campus === currentCampus);
        let matchType = (currentTypeFilter === 'all' || item.projet.type === currentTypeFilter);
        
        if (matchCampus && matchType) {
            if (!map.hasLayer(item.marker)) item.marker.addTo(map);
        } else {
            if (map.hasLayer(item.marker)) map.removeLayer(item.marker);
        }
    });
    mettreAJourStats();
}

function filtrerParCampus(campus) {
    currentCampus = campus;
    appliquerFiltres();
    afficherFiltresTypes();
    afficherListeSousTypes();
    effacerTousLesTrajets();
}

function filtrerParType(type) {
    currentTypeFilter = type;
    appliquerFiltres();
    afficherFiltresTypes();
    afficherListeSousTypes();
    effacerTousLesTrajets();
}

function getTotalProjetsCount() {
    let count = 0;
    markersList.forEach(item => {
        if ((currentCampus === 'all' || item.projet.campus === currentCampus) &&
            (currentTypeFilter === 'all' || item.projet.type === currentTypeFilter)) {
            count++;
        }
    });
    return count;
}

function mettreAJourStats() {
    let countSpan = document.getElementById('projetCount');
    let campusSpan = document.getElementById('campusName');
    if(countSpan) countSpan.textContent = getTotalProjetsCount();
    if(campusSpan) campusSpan.textContent = currentCampus === 'all' ? 'Tous' : currentCampus;
}

// ==================== FILTRES TYPES ====================
function afficherFiltresTypes() {
    let container = document.getElementById('typesFilters');
    if(!container) return;
    
    let typesUniques = new Set();
    projets.forEach(projet => {
        if (currentCampus === 'all' || projet.campus === currentCampus) {
            if(projet.type) typesUniques.add(projet.type);
        }
    });
    
    let typesArray = Array.from(typesUniques).sort();
    let html = '<button class="type-filter-btn active" data-type="all">Tous types</button>';
    typesArray.forEach(type => {
        html += `<button class="type-filter-btn" data-type="${type}">${type}</button>`;
    });
    
    container.innerHTML = html;
    
    document.querySelectorAll('.type-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.type-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filtrerParType(btn.getAttribute('data-type'));
        });
    });
}

// ==================== SOUS-TYPES ====================
function afficherListeSousTypes() {
    let container = document.getElementById('sousTypesList');
    if(!container) return;
    
    container.innerHTML = '';
    let sousTypesMap = new Map();
    
    projets.forEach(projet => {
        if ((currentCampus !== 'all' && projet.campus !== currentCampus)) return;
        if ((currentTypeFilter !== 'all' && projet.type !== currentTypeFilter)) return;
        
        if (!sousTypesMap.has(projet.sousType)) {
            sousTypesMap.set(projet.sousType, {
                nom: projet.sousType,
                icone: projet.icone,
                count: 0
            });
        }
        sousTypesMap.get(projet.sousType).count++;
    });
    
    let sorted = Array.from(sousTypesMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    
    for(let [nom, data] of sorted) {
        let item = document.createElement('div');
        item.className = 'sous-type-item';
        item.setAttribute('data-soustype', nom);
        item.innerHTML = `
            <img src="${data.icone || 'https://cdn-icons-png.flaticon.com/512/2991/2991231.png'}" onerror="this.src='https://cdn-icons-png.flaticon.com/512/2991/2991231.png'">
            <div class="sous-type-info">
                <div class="sous-type-nom">${nom}</div>
                <div class="sous-type-count">${data.count} projet${data.count > 1 ? 's' : ''}</div>
            </div>
        `;
        item.addEventListener('click', () => {
            markersList.forEach(m => { if(map.hasLayer(m.marker)) map.removeLayer(m.marker); });
            markersList.forEach(m => {
                if (m.projet.sousType === nom &&
                    (currentCampus === 'all' || m.projet.campus === currentCampus) &&
                    (currentTypeFilter === 'all' || m.projet.type === currentTypeFilter)) {
                    m.marker.addTo(map);
                }
            });
            effacerTousLesTrajets();
            document.querySelectorAll('.sous-type-item').forEach(i => i.style.background = '');
            item.style.background = '#e3f1e8';
        });
        container.appendChild(item);
    }
}

// ==================== TRAJETS SECTION ====================
function afficherTrajetsSection() {
    let container = document.getElementById('trajetsSection');
    if(!container) return;
    container.innerHTML = '';
    
    // Golfettes
    if(typeof trajetsGolfette !== 'undefined' && trajetsGolfette.length > 0) {
        let card = document.createElement('div');
        card.className = 'type-card';
        card.innerHTML = `
            <div class="type-header" style="background:#3c9e62">
                <span class="type-nom">NAVETTES GOLFETTES</span>
                <span class="toggle-icon">▼</span>
            </div>
            <div class="type-content" id="golfetteContent"></div>
        `;
        let content = card.querySelector('.type-content');
        trajetsGolfette.forEach(t => {
            let item = document.createElement('div');
            item.className = 'sous-type-item';
            item.innerHTML = `
                <div style="width:32px;height:32px;border-radius:20px;background:${t.couleur};display:flex;align-items:center;justify-content:center;margin-right:12px;color:white;">G</div>
                <div class="sous-type-info"><div class="sous-type-nom">${t.nom}</div></div>
            `;
            item.onclick = () => { effacerTousLesTrajets(); afficherTrajetGolfette(t.id); };
            content.appendChild(item);
        });
        card.querySelector('.type-header').onclick = function() {
            this.classList.toggle('collapsed');
            this.nextElementSibling.classList.toggle('collapsed');
        };
        container.appendChild(card);
    }
    
    // Bus
    if(typeof trajetsBus !== 'undefined' && trajetsBus.length > 0) {
        let card = document.createElement('div');
        card.className = 'type-card';
        card.innerHTML = `
            <div class="type-header" style="background:#2c7a4d">
                <span class="type-nom">TRAJETS BUS</span>
                <span class="toggle-icon">▼</span>
            </div>
            <div class="type-content" id="busContent"></div>
        `;
        let content = card.querySelector('.type-content');
        trajetsBus.forEach(t => {
            let item = document.createElement('div');
            item.className = 'sous-type-item';
            item.innerHTML = `
                <div style="width:32px;height:32px;border-radius:20px;background:${t.couleur};display:flex;align-items:center;justify-content:center;margin-right:12px;color:white;">B</div>
                <div class="sous-type-info"><div class="sous-type-nom">${t.nom}</div></div>
            `;
            item.onclick = () => { effacerTousLesTrajets(); afficherTrajetBus(t.id); };
            content.appendChild(item);
        });
        card.querySelector('.type-header').onclick = function() {
            this.classList.toggle('collapsed');
            this.nextElementSibling.classList.toggle('collapsed');
        };
        container.appendChild(card);
    }
}

// ==================== AFFICHAGE TRAJETS SUR CARTE ====================
function afficherTrajetGolfette(trajetId) {
    if(trajetActuel) map.removeLayer(trajetActuel);
    let trajet = trajetsGolfette.find(t => t.id === trajetId);
    if(!trajet || typeof arretsGolfette === 'undefined') return;
    
    let points = [];
    trajet.arrets.forEach(id => {
        let arret = arretsGolfette.find(a => a.id === id);
        if(arret && arret.coords) points.push(arret.coords);
    });
    
    if(points.length >= 2) {
        trajetActuel = L.polyline(points, { color: trajet.couleur, weight: 6, opacity: 0.9 }).addTo(map);
        map.fitBounds(L.latLngBounds(points));
    } else if(points.length === 1) {
        trajetActuel = L.circleMarker(points[0], { color: trajet.couleur, radius: 8 }).addTo(map);
        map.setView(points[0], 16);
    }
}

function afficherTrajetBus(trajetId) {
    if(trajetBusActuel) map.removeLayer(trajetBusActuel);
    let trajet = trajetsBus.find(t => t.id === trajetId);
    if(!trajet || typeof arretsBus === 'undefined') return;
    
    let points = [];
    trajet.arrets.forEach(id => {
        let arret = arretsBus.find(a => a.id === id);
        if(arret && arret.coords) points.push(arret.coords);
    });
    
    if(points.length >= 2) {
        trajetBusActuel = L.polyline(points, { color: trajet.couleur, weight: 6, dashArray: "8,8", opacity: 0.9 }).addTo(map);
        map.fitBounds(L.latLngBounds(points));
    } else if(points.length === 1) {
        trajetBusActuel = L.circleMarker(points[0], { color: trajet.couleur, radius: 8 }).addTo(map);
        map.setView(points[0], 16);
    }
}

function effacerTousLesTrajets() {
    if(trajetActuel) { map.removeLayer(trajetActuel); trajetActuel = null; }
    if(trajetBusActuel) { map.removeLayer(trajetBusActuel); trajetBusActuel = null; }
}

// ==================== ACTIONS CAMPUS ====================
function recentrerBenGuerir() {
    map.setView([32.221017, -7.935687], 15);
    filtrerParCampus('Ben Guerir');
}

function recentrerRabat() {
    map.setView([33.978971, -6.729941], 17);
    filtrerParCampus('Rabat');
}

function afficherTousCampus() {
    map.setView([32.9, -7.0], 8);
    filtrerParCampus('all');
}

function toggleSidebar() {
    let sidebar = document.getElementById('sidebar');
    let btn = document.getElementById('toggleSidebar');
    sidebar.classList.toggle('collapsed');
    btn.innerHTML = sidebar.classList.contains('collapsed') ? '▶' : '◀';
}

// ==================== INITIALISATION ====================
document.addEventListener('DOMContentLoaded', () => {
    if(typeof projets !== 'undefined') {
        initMap();
    } else {
        let check = setInterval(() => {
            if(typeof projets !== 'undefined') {
                clearInterval(check);
                initMap();
            }
        }, 100);
    }
    document.getElementById('toggleSidebar')?.addEventListener('click', toggleSidebar);
});

// Exports
window.recentrerBenGuerir = recentrerBenGuerir;
window.recentrerRabat = recentrerRabat;
window.afficherTousCampus = afficherTousCampus;
window.toggleSidebar = toggleSidebar;