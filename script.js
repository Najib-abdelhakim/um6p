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
        console.error("ERREUR: Données projets non chargées! Vérifiez que data.js est chargé avant script.js");
        return;
    }
    
    console.log("=== INIT MAP ===");
    console.log("Total projets:", projets.length);
    console.log("Projets Ben Guerir:", projets.filter(p => p.campus === "Ben Guerir").length);
    console.log("Projets Rabat:", projets.filter(p => p.campus === "Rabat").length);
    
    // Vérifier les données des trajets
    console.log("=== VERIFICATION DONNEES TRAJETS ===");
    console.log("trajetsGolfette existe?", typeof trajetsGolfette !== 'undefined');
    console.log("trajetsBus existe?", typeof trajetsBus !== 'undefined');
    console.log("arretsGolfette existe?", typeof arretsGolfette !== 'undefined');
    console.log("arretsBus existe?", typeof arretsBus !== 'undefined');
    
    if(typeof trajetsGolfette !== 'undefined') {
        console.log("Nombre de trajets golfette:", trajetsGolfette.length);
        console.log("Trajets golfette:", trajetsGolfette);
    }
    if(typeof trajetsBus !== 'undefined') {
        console.log("Nombre de trajets bus:", trajetsBus.length);
        console.log("Trajets bus:", trajetsBus);
    }
    
    // Afficher les coordonnées Rabat pour vérifier
    let rabatProjets = projets.filter(p => p.campus === "Rabat");
    if(rabatProjets.length > 0) {
        console.log("Premier projet Rabat:", rabatProjets[0].nom, rabatProjets[0].coordinates);
    }
    
    map = L.map('map').setView([32.221017, -7.935687], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
        attribution: '© OpenStreetMap'
    }).addTo(map);
    
    projets.forEach(proj => {
        // Vérifier que les coordonnées sont valides
        if(proj.coordinates && proj.coordinates.length === 2) {
            let marker = creerMarqueurAvecInfos(proj);
            marker.addTo(map);
            markersList.push({ marker: marker, projet: proj });
        } else {
            console.warn("Coordonnées invalides pour:", proj.nom, proj.coordinates);
        }
    });
    
    console.log("Total marqueurs créés:", markersList.length);
    
    appliquerFiltres();
    afficherFiltresTypes();
    afficherListeSousTypes();
    afficherTrajetsSection();
    mettreAJourStats();
    
    // Contrôles campus
    let campusDiv = document.getElementById('campusControls');
    if(campusDiv) {
        campusDiv.innerHTML = `
            <button class="campus-btn" id="btnAll">Tous</button>
            <button class="campus-btn" id="btnBG">Ben Guerir</button>
            <button class="campus-btn" id="btnRabat">Rabat</button>
        `;
        document.getElementById('btnAll').onclick = () => afficherTousCampus();
        document.getElementById('btnBG').onclick = () => recentrerBenGuerir();
        document.getElementById('btnRabat').onclick = () => recentrerRabat();
    }
    
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
    console.log("Applique filtres - Campus:", currentCampus, "Type:", currentTypeFilter);
    
    markersList.forEach(item => {
        let matchCampus = (currentCampus === 'all' || item.projet.campus === currentCampus);
        let matchType = (currentTypeFilter === 'all' || item.projet.type === currentTypeFilter);
        
        if (matchCampus && matchType) {
            if (!map.hasLayer(item.marker)) {
                item.marker.addTo(map);
                console.log("Ajout marqueur:", item.projet.nom, item.projet.campus);
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
    console.log("Filtrer par campus:", campus);
    currentCampus = campus;
    appliquerFiltres();
    afficherFiltresTypes();
    afficherListeSousTypes();
    effacerTousLesTrajets();
}

function filtrerParType(type) {
    console.log("Filtrer par type:", type);
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
    if(!container) {
        console.warn("Container trajetsSection non trouvé");
        return;
    }
    container.innerHTML = '';
    
    // Vérifier que les données existent avant d'afficher
    if(typeof trajetsGolfette !== 'undefined' && trajetsGolfette && trajetsGolfette.length > 0) {
        console.log("Affichage des golfettes, nombre:", trajetsGolfette.length);
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
    } else {
        console.log("Aucune donnée golfette trouvée");
    }
    
    // Vérifier les données bus
    if(typeof trajetsBus !== 'undefined' && trajetsBus && trajetsBus.length > 0) {
        console.log("Affichage des bus, nombre:", trajetsBus.length);
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
    } else {
        console.log("Aucune donnée bus trouvée");
    }
}

// ==================== AFFICHAGE TRAJETS SUR CARTE ====================
function afficherTrajetGolfette(trajetId) {
    console.log("Afficher trajet golfette:", trajetId);
    
    if(typeof trajetsGolfette === 'undefined') {
        console.error("trajetsGolfette non défini");
        return;
    }
    if(typeof arretsGolfette === 'undefined') {
        console.error("arretsGolfette non défini");
        return;
    }
    
    if(trajetActuel) map.removeLayer(trajetActuel);
    let trajet = trajetsGolfette.find(t => t.id === trajetId);
    if(!trajet) {
        console.error("Trajet golfette non trouvé:", trajetId);
        return;
    }
    
    console.log("Trajet trouvé:", trajet);
    console.log("Arrets:", trajet.arrets);
    
    let points = [];
    trajet.arrets.forEach(id => {
        let arret = arretsGolfette.find(a => a.id === id);
        if(arret && arret.coords && arret.coords.length === 2) {
            points.push(arret.coords);
        } else {
            console.warn("Arrêt non trouvé ou coordonnées invalides:", id, arret);
        }
    });
    
    console.log("Points collectés:", points.length);
    
    if(points.length >= 2) {
        trajetActuel = L.polyline(points, { color: trajet.couleur, weight: 3, opacity: 0.9 }).addTo(map);
        map.fitBounds(L.latLngBounds(points));
    } else if(points.length === 1) {
        trajetActuel = L.circleMarker(points[0], { color: trajet.couleur, radius: 8 }).addTo(map);
        map.setView(points[0], 16);
    } else {
        console.error("Pas assez de points pour tracer le trajet");
    }
}

function afficherTrajetBus(trajetId) {
    console.log("Afficher trajet bus:", trajetId);
    
    if(typeof trajetsBus === 'undefined') {
        console.error("trajetsBus non défini");
        return;
    }
    if(typeof arretsBus === 'undefined') {
        console.error("arretsBus non défini");
        return;
    }
    
    if(trajetBusActuel) map.removeLayer(trajetBusActuel);
    let trajet = trajetsBus.find(t => t.id === trajetId);
    if(!trajet) {
        console.error("Trajet bus non trouvé:", trajetId);
        return;
    }
    
    console.log("Trajet bus trouvé:", trajet);
    console.log("Arrets bus:", trajet.arrets);
    
    let points = [];
    trajet.arrets.forEach(id => {
        let arret = arretsBus.find(a => a.id === id);
        if(arret && arret.coords && arret.coords.length === 2) {
            points.push(arret.coords);
        } else {
            console.warn("Arrêt bus non trouvé ou coordonnées invalides:", id, arret);
        }
    });
    
    console.log("Points bus collectés:", points.length);
    
    if(points.length >= 2) {
        trajetBusActuel = L.polyline(points, { color: trajet.couleur, weight: 3, dashArray: "8,8", opacity: 0.9 }).addTo(map);
        map.fitBounds(L.latLngBounds(points));
    } else if(points.length === 1) {
        trajetBusActuel = L.circleMarker(points[0], { color: trajet.couleur, radius: 8 }).addTo(map);
        map.setView(points[0], 16);
    } else {
        console.error("Pas assez de points pour tracer le trajet bus");
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
    console.log("=== RECENTRER RABAT ===");
    let rabatCoords = [33.978971, -6.729941];
    console.log("Deplacement vers Rabat:", rabatCoords);
    map.setView(rabatCoords, 17);
    filtrerParCampus('Rabat');
    
    setTimeout(() => {
        let visibleCount = markersList.filter(m => map.hasLayer(m.marker)).length;
        console.log("Marqueurs visibles a Rabat:", visibleCount);
        if(visibleCount === 0) {
            console.warn("AUCUN projet Rabat visible! Vérifiez les coordonnées dans data.js");
        }
    }, 500);
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
    console.log("DOM chargé, vérification des données...");
    
    if(typeof projets !== 'undefined') {
        console.log("projets trouvé, initialisation de la carte");
        initMap();
    } else {
        console.log("projets non trouvé, attente...");
        let check = setInterval(() => {
            if(typeof projets !== 'undefined') {
                console.log("projets maintenant disponible");
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
window.afficherTrajetGolfette = afficherTrajetGolfette;
window.afficherTrajetBus = afficherTrajetBus;