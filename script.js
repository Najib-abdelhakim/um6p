// ==================== VARIABLES GLOBALES ====================
let map;
let markersList = [];
let currentCampus = 'all';
let currentTypeFilter = 'all';
let trajetActuel = null;
let trajetBusActuel = null;

// ==================== FONCTION POPUP ====================
// ==================== FONCTION POPUP MODIFIEE ====================
// TOUTES les images sont affichees en HAUT (banniere), meme les grandes
function creerMarqueurAvecInfos(projet) {
    let iconUrl = projet.icone && projet.icone !== "" ? projet.icone : 'https://cdn-icons-png.flaticon.com/512/2991/2991231.png';
    let customIcon = L.divIcon({
        className: 'custom-marker',
        html: `<img src="${iconUrl}" style="width:38px;height:38px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);background:white;padding:3px;object-fit:cover;">`,
        iconSize: [38, 38],
        popupAnchor: [0, -20]
    });
    
    let marker = L.marker(projet.coordinates, { icon: customIcon });
    
    // BADGE (type · campus)
    let badgeHtml = '';
    if ((projet.type && projet.type.trim() !== "") || (projet.campus && projet.campus.trim() !== "")) {
        let typePart = (projet.type && projet.type.trim() !== "") ? projet.type : "";
        let campusPart = (projet.campus && projet.campus.trim() !== "") ? projet.campus : "";
        let separator = (typePart && campusPart) ? " · " : "";
        badgeHtml = `<div class="popup-badge">${typePart}${separator}${campusPart}</div>`;
    }
    
    // TITRE
    let titleHtml = '';
    if (projet.nom && projet.nom.trim() !== "") {
        titleHtml = `<h3>${projet.nom}</h3>`;
    }
    
    // DESCRIPTION
    let descriptionHtml = '';
    if (projet.description && projet.description.trim() !== "") {
        descriptionHtml = `<div class="popup-description">${projet.description}</div>`;
    }
    
    // INFOS COMPLEMENTAIRES
    let complementHtml = '';
    if (projet.Informations_complémentaires && projet.Informations_complémentaires.trim() !== "") {
        complementHtml = `<div class="popup-footer"><div class="info-complementaire"><strong>Details techniques :</strong><br>${projet.Informations_complémentaires}</div></div>`;
    }
    
    // TEXTE CONTENT
    let textContent = `
        ${titleHtml}
        ${badgeHtml}
        ${descriptionHtml}
        ${complementHtml}
    `;
    
    let hasImage = (projet.image && projet.image.trim() !== "" && !projet.image.includes('flaticon'));
    
    // Si pas d'image, afficher directement le texte
    if (!hasImage) {
        let popupContent = `
            <div class="popup-content-text" style="padding:15px;">
                ${textContent}
            </div>
        `;
        marker.bindPopup(popupContent, { maxWidth: 450, minWidth: 350 });
        return marker;
    }
    
    // TOUTES LES IMAGES SONT EN HAUT - layout vertical uniquement
    let popupContent = `
        <div class="popup-layout-vertical">
            <div class="popup-image-top">
                <img src="${projet.image}" alt="${projet.nom || 'Image'}">
            </div>
            <div class="popup-content-text">
                ${textContent}
            </div>
        </div>
    `;
    marker.bindPopup(popupContent, { maxWidth: 450, minWidth: 350 });
    
    return marker;
}

// ==================== INITIALISATION ====================
function initMap() {
    if (typeof projets === 'undefined') {
        console.error("ERROR: Project data not loaded!");
        return;
    }
    
    console.log("=== INIT MAP - GOOGLE HYBRID ===");
    console.log("Total projects:", projets.length);
    
    // Create map with Google Maps Hybrid
    map = L.map('map').setView([32.221017, -7.935687], 16);
    
    // GOOGLE MAPS HYBRID - Satellite + Street names
    L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        attribution: '&copy; <a href="https://maps.google.com">Google Maps</a> | UM6P Green Map',
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    }).addTo(map);
    
    // Add all markers
    projets.forEach(proj => {
        if(proj.coordinates && proj.coordinates.length === 2 && 
           proj.coordinates[0] !== 32 && proj.coordinates[1] !== -7) {
            if(proj.coordinates[0] > 30 && proj.coordinates[0] < 35) {
                let marker = creerMarqueurAvecInfos(proj);
                marker.addTo(map);
                markersList.push({ marker: marker, projet: proj });
            }
        } else if(proj.coordinates && proj.coordinates.length === 2 && 
                  proj.coordinates[0] !== 32 && proj.coordinates[1] !== -7) {
            let marker = creerMarqueurAvecInfos(proj);
            marker.addTo(map);
            markersList.push({ marker: marker, projet: proj });
        }
    });
    
    console.log("Total markers created:", markersList.length);
    
    appliquerFiltres();
    afficherFiltresTypes();
    afficherListeSousTypes();
    afficherTrajetsSection();
    mettreAJourStats();
    
    // Campus controls
    let campusDiv = document.getElementById('campusControls');
    if(campusDiv) {
        campusDiv.innerHTML = `
            <button class="campus-btn" id="btnAll">All</button>
            <button class="campus-btn" id="btnBG">Ben Guerir</button>
            <button class="campus-btn" id="btnRabat">Rabat</button>
        `;
        document.getElementById('btnAll').onclick = () => afficherTousCampus();
        document.getElementById('btnBG').onclick = () => recentrerBenGuerir();
        document.getElementById('btnRabat').onclick = () => recentrerRabat();
    }
    
    // Reset button
    document.getElementById('resetFilters')?.addEventListener('click', () => {
        currentTypeFilter = 'all';
        currentCampus = 'all';
        appliquerFiltres();
        afficherFiltresTypes();
        afficherListeSousTypes();
        effacerTousLesTrajets();
        document.querySelectorAll('.type-filter-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('.type-filter-btn[data-type="all"]')?.classList.add('active');
        mettreAJourStats();
    });
}

// ==================== FILTERS ====================
function appliquerFiltres() {
    markersList.forEach(item => {
        let matchCampus = (currentCampus === 'all' || item.projet.campus === currentCampus);
        let matchType = (currentTypeFilter === 'all' || item.projet.type === currentTypeFilter);
        
        if (matchCampus && matchType) {
            if (!map.hasLayer(item.marker)) {
                item.marker.addTo(map);
            }
        } else {
            if (map.hasLayer(item.marker)) {
                map.removeLayer(item.marker);
            }
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
    if(campusSpan) campusSpan.textContent = currentCampus === 'all' ? 'All' : currentCampus;
}

// ==================== TYPE FILTERS ====================
function afficherFiltresTypes() {
    let container = document.getElementById('typesFilters');
    if(!container) return;
    
    let typesUniques = new Set();
    projets.forEach(projet => {
        if (currentCampus === 'all' || projet.campus === currentCampus) {
            if(projet.type && projet.type.trim() !== "") typesUniques.add(projet.type);
        }
    });
    
    let typesArray = Array.from(typesUniques).sort();
    let html = '<button class="type-filter-btn active" data-type="all">All</button>';
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

// ==================== SUB-TYPES ====================
function afficherListeSousTypes() {
    let container = document.getElementById('sousTypesList');
    if(!container) return;
    
    container.innerHTML = '';
    let sousTypesMap = new Map();
    
    projets.forEach(projet => {
        if ((currentCampus !== 'all' && projet.campus !== currentCampus)) return;
        if ((currentTypeFilter !== 'all' && projet.type !== currentTypeFilter)) return;
        
        if (projet.sousType && projet.sousType.trim() !== "") {
            if (!sousTypesMap.has(projet.sousType)) {
                sousTypesMap.set(projet.sousType, {
                    nom: projet.sousType,
                    icone: projet.icone,
                    count: 0
                });
            }
            sousTypesMap.get(projet.sousType).count++;
        }
    });
    
    let sorted = Array.from(sousTypesMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    
    for(let [nom, data] of sorted) {
        let item = document.createElement('div');
        item.className = 'sous-type-item';
        item.setAttribute('data-soustype', nom);
        let projectText = data.count > 1 ? 'projects' : 'project';
        item.innerHTML = `
            <img src="${data.icone || 'https://cdn-icons-png.flaticon.com/512/2991/2991231.png'}" onerror="this.src='https://cdn-icons-png.flaticon.com/512/2991/2991231.png'">
            <div class="sous-type-info">
                <div class="sous-type-nom">${nom}</div>
                <div class="sous-type-count">${data.count} ${projectText}</div>
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

// ==================== ROUTES SECTION ====================
function afficherTrajetsSection() {
    let container = document.getElementById('trajetsSection');
    if(!container) return;
    container.innerHTML = '';
    
    // Golf carts
    if(typeof trajetsGolfette !== 'undefined' && trajetsGolfette && trajetsGolfette.length > 0) {
        let card = document.createElement('div');
        card.className = 'type-card';
        card.innerHTML = `
            <div class="type-header" style="background:#3c9e62">
                <span class="type-nom">GOLF CART Pathway</span>
                <span class="toggle-icon">▼</span>
            </div>
            <div class="type-content" id="golfetteContent"></div>
        `;
        let content = card.querySelector('.type-content');
        trajetsGolfette.forEach(t => {
            let item = document.createElement('div');
            item.className = 'sous-type-item';
            item.innerHTML = `
                <div style="width:32px;height:32px;border-radius:20px;background:${t.couleur};display:flex;align-items:center;justify-content:center;margin-right:12px;color:white;font-weight:bold;">G</div>
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
    
    // Buses
    if(typeof trajetsBus !== 'undefined' && trajetsBus && trajetsBus.length > 0) {
        let card = document.createElement('div');
        card.className = 'type-card';
        card.innerHTML = `
            <div class="type-header" style="background:#2c7a4d">
                <span class="type-nom">BUS Pathway</span>
                <span class="toggle-icon">▼</span>
            </div>
            <div class="type-content" id="busContent"></div>
        `;
        let content = card.querySelector('.type-content');
        trajetsBus.forEach(t => {
            let item = document.createElement('div');
            item.className = 'sous-type-item';
            item.innerHTML = `
                <div style="width:32px;height:32px;border-radius:20px;background:${t.couleur};display:flex;align-items:center;justify-content:center;margin-right:12px;color:white;font-weight:bold;">B</div>
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

// ==================== DISPLAY ROUTES ====================
function afficherTrajetGolfette(trajetId) {
    if(typeof trajetsGolfette === 'undefined' || typeof arretsGolfette === 'undefined') return;
    if(trajetActuel) map.removeLayer(trajetActuel);
    
    let trajet = trajetsGolfette.find(t => t.id === trajetId);
    if(!trajet) return;
    
    let points = [];
    trajet.arrets.forEach(id => {
        let arret = arretsGolfette.find(a => a.id === id);
        if(arret && arret.coords && arret.coords.length === 2) {
            points.push(arret.coords);
        }
    });
    
    if(points.length >= 2) {
        trajetActuel = L.polyline(points, { color: trajet.couleur, weight: 4, opacity: 0.9 }).addTo(map);
        map.fitBounds(L.latLngBounds(points));
    }
}

function afficherTrajetBus(trajetId) {
    if(typeof trajetsBus === 'undefined' || typeof arretsBus === 'undefined') return;
    if(trajetBusActuel) map.removeLayer(trajetBusActuel);
    
    let trajet = trajetsBus.find(t => t.id === trajetId);
    if(!trajet) return;
    
    let points = [];
    trajet.arrets.forEach(id => {
        let arret = arretsBus.find(a => a.id === id);
        if(arret && arret.coords && arret.coords.length === 2) {
            points.push(arret.coords);
        }
    });
    
    if(points.length >= 2) {
        trajetBusActuel = L.polyline(points, { color: trajet.couleur, weight: 4, dashArray: "8,8", opacity: 0.9 }).addTo(map);
        map.fitBounds(L.latLngBounds(points));
    }
}

function effacerTousLesTrajets() {
    if(trajetActuel) { map.removeLayer(trajetActuel); trajetActuel = null; }
    if(trajetBusActuel) { map.removeLayer(trajetBusActuel); trajetBusActuel = null; }
}

// ==================== CAMPUS ACTIONS ====================
function recentrerBenGuerir() {
    map.setView([32.221017, -7.935687], 16);
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

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded - Google Hybrid Map");
    
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