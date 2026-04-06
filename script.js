// ==================== VARIABLES GLOBALES ====================
let map;
let markersList = [];
let currentCampus = 'all';
let currentTypeFilter = 'all';
let trajetActuel = null;
let trajetBusActuel = null;

// ==================== FONCTION POPUP AMÉLIORÉE ====================
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
        imageHtml = `<div class="popup-img-wrapper"><img src="${projet.image}" class="popup-img" alt="${projet.nom}" onerror="this.src='https://cdn-icons-png.flaticon.com/512/2941/2941535.png'"></div>`;
    } else {
        imageHtml = `<div class="popup-img-wrapper"><img src="https://cdn-icons-png.flaticon.com/512/2941/2941535.png" class="popup-img" style="padding:20px; background:#eef2ea;" alt="icone"></div>`;
    }
    
    let badgeType = projet.type || "Projet";
    let campusInfo = projet.campus || "UM6P";
    let descriptionText = projet.description ? projet.description : "Aucune description disponible.";
    
    let complementHtml = "";
    if (projet.Informations_complementaires && projet.Informations_complementaires.trim() !== "") {
        complementHtml += `<div class="info-complementaire"><strong>Details techniques :</strong><br>${projet.Informations_complementaires}</div>`;
    }
    if (projet.Daily_production && projet.Daily_production !== "") {
        complementHtml += `<div class="info-complementaire"><strong>Production journaliere :</strong> ${projet.Daily_production}</div>`;
    }
    if (projet.Total_power && projet.Total_power !== "") {
        complementHtml += `<div class="info-complementaire"><strong>Puissance totale :</strong> ${projet.Total_power}</div>`;
    }
    if (projet.Number_of_panels && projet.Number_of_panels !== "") {
        complementHtml += `<div class="info-complementaire"><strong>Panneaux :</strong> ${projet.Number_of_panels}</div>`;
    }
    if (projet.Number_of_lights && projet.Number_of_lights !== "") {
        complementHtml += `<div class="info-complementaire"><strong>Eclairage :</strong> ${projet.Number_of_lights}</div>`;
    }
    if (projet.Operating_hours && projet.Operating_hours !== "") {
        complementHtml += `<div class="info-complementaire"><strong>Autonomie :</strong> ${projet.Operating_hours}</div>`;
    }
    
    let popupContent = `
        <div>
            ${imageHtml}
            <div class="popup-content">
                <div class="popup-badge">${badgeType} · ${campusInfo}</div>
                <h3>${projet.nom || "Projet UM6P"}</h3>
                <div class="popup-description">${descriptionText}</div>
                ${complementHtml}
            </div>
        </div>
    `;
    
    marker.bindPopup(popupContent, { maxWidth: 450, minWidth: 320 });
    return marker;
}

// ==================== INITIALISATION DE LA CARTE ====================
function initMap() {
    if (typeof projets === 'undefined') {
        console.error("Les donnees projets ne sont pas chargees");
        return;
    }
    
    map = L.map('map').setView([32.221017, -7.935687], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
        attribution: '© OpenStreetMap contributors' 
    }).addTo(map);
    
    projets.forEach(proj => {
        let marker = creerMarqueurAvecInfos(proj);
        marker.addTo(map);
        markersList.push({ marker: marker, projet: proj });
    });
    
    appliquerFiltres();
    
    let campusDiv = document.getElementById('campusControls');
    if(campusDiv) {
        campusDiv.innerHTML = `
            <button class="campus-btn" id="btnAll">Tous campus</button>
            <button class="campus-btn" id="btnBG">Ben Guerir</button>
            <button class="campus-btn" id="btnRabat">Rabat</button>
        `;
        document.getElementById('btnAll').onclick = () => afficherTousCampus();
        document.getElementById('btnBG').onclick = () => recentrerBenGuerir();
        document.getElementById('btnRabat').onclick = () => recentrerRabat();
    }
    
    afficherFiltresTypes();
    afficherListeSousTypes();
    afficherTrajetsSection();
    mettreAJourStats();
    
    // Reset button
    let resetBtn = document.querySelector('.reset-btn');
    if(resetBtn) {
        resetBtn.addEventListener('click', () => {
            currentTypeFilter = 'all';
            appliquerFiltres();
            afficherFiltresTypes();
            afficherListeSousTypes();
            effacerTousLesTrajets();
            document.querySelectorAll('.type-filter-btn').forEach(btn => {
                btn.classList.remove('active');
                if(btn.getAttribute('data-type') === 'all') btn.classList.add('active');
            });
            document.querySelectorAll('.sous-type-item').forEach(i => i.style.background = 'white');
        });
    }
}

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
        let matchCampus = (currentCampus === 'all' || item.projet.campus === currentCampus);
        let matchType = (currentTypeFilter === 'all' || item.projet.type === currentTypeFilter);
        if (matchCampus && matchType) count++;
    });
    return count;
}

function mettreAJourStats() {
    let countSpan = document.getElementById('projetCount');
    if(countSpan) countSpan.textContent = getTotalProjetsCount();
}

// ==================== AFFICHAGE DES FILTRES PAR TYPE ====================
function afficherFiltresTypes() {
    let typesContainer = document.getElementById('typesFilters');
    if(!typesContainer) return;
    
    let typesUniques = new Set();
    projets.forEach(projet => {
        if (currentCampus === 'all' || projet.campus === currentCampus) {
            if(projet.type) typesUniques.add(projet.type);
        }
    });
    
    let typesArray = Array.from(typesUniques).sort();
    let typesOrder = ['Biodiversity', 'Buildings', 'Cathring', 'Energy', 'Transport', 'Waste'];
    typesArray.sort((a, b) => {
        let indexA = typesOrder.indexOf(a);
        let indexB = typesOrder.indexOf(b);
        if(indexA === -1) indexA = 999;
        if(indexB === -1) indexB = 999;
        return indexA - indexB;
    });
    
    let html = '<button class="type-filter-btn active" data-type="all">Tous types</button>';
    typesArray.forEach(type => {
        html += `<button class="type-filter-btn" data-type="${type}">${type}</button>`;
    });
    
    typesContainer.innerHTML = html;
    
    document.querySelectorAll('.type-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.type-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            let typeValue = btn.getAttribute('data-type');
            filtrerParType(typeValue);
        });
    });
}

// ==================== AFFICHAGE DES SOUS-TYPES ====================
function organiserSousTypesParType() {
    let sousTypesMap = new Map();
    
    projets.forEach(projet => {
        if (currentCampus !== 'all' && projet.campus !== currentCampus) return;
        if (currentTypeFilter !== 'all' && projet.type !== currentTypeFilter) return;
        
        let sousType = projet.sousType;
        if (!sousTypesMap.has(sousType)) {
            sousTypesMap.set(sousType, {
                nom: sousType,
                icone: projet.icone,
                projets: [],
                type: projet.type
            });
        }
        sousTypesMap.get(sousType).projets.push(projet);
    });
    
    return sousTypesMap;
}

function afficherListeSousTypes() {
    let container = document.getElementById('sousTypesList');
    if(!container) return;
    
    container.innerHTML = '';
    let sousTypesMap = organiserSousTypesParType();
    
    let sousTypesArray = Array.from(sousTypesMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    
    for(let [sousTypeNom, stData] of sousTypesArray) {
        let countProj = stData.projets.length;
        let iconUrl = stData.icone && stData.icone !== "" ? stData.icone : 'https://cdn-icons-png.flaticon.com/512/2991/2991231.png';
        
        let sousItem = document.createElement('div');
        sousItem.className = 'sous-type-item';
        sousItem.setAttribute('data-soustype', sousTypeNom);
        sousItem.innerHTML = `
            <img src="${iconUrl}" onerror="this.src='https://cdn-icons-png.flaticon.com/512/2991/2991231.png'">
            <div class="sous-type-info">
                <div class="sous-type-nom">${sousTypeNom}</div>
                <div class="sous-type-count">${countProj} projet${countProj > 1 ? 's' : ''}</div>
            </div>
        `;
        
        sousItem.addEventListener('click', (e) => {
            e.stopPropagation();
            markersList.forEach(item => {
                if (map.hasLayer(item.marker)) map.removeLayer(item.marker);
            });
            markersList.forEach(item => {
                let matchCampus = (currentCampus === 'all' || item.projet.campus === currentCampus);
                let matchType = (currentTypeFilter === 'all' || item.projet.type === currentTypeFilter);
                let matchSousType = (item.projet.sousType === sousTypeNom);
                
                if (matchCampus && matchType && matchSousType) {
                    item.marker.addTo(map);
                }
            });
            effacerTousLesTrajets();
            document.querySelectorAll('.sous-type-item').forEach(i => i.style.background = 'white');
            sousItem.style.background = '#e3f1e8';
        });
        
        container.appendChild(sousItem);
    }
    
    if(sousTypesArray.length === 0) {
        let emptyMsg = document.createElement('div');
        emptyMsg.className = 'empty-message';
        emptyMsg.textContent = 'Aucun projet trouve';
        emptyMsg.style.padding = '20px';
        emptyMsg.style.textAlign = 'center';
        emptyMsg.style.color = '#888';
        container.appendChild(emptyMsg);
    }
}

// ==================== AFFICHAGE DES TRAJETS (CORRIGE) ====================
function afficherTrajetsSection() {
    let container = document.getElementById('trajetsSection');
    if(!container) return;
    
    container.innerHTML = '';
    
    // Trajets Bus
    if(typeof trajetsBus !== 'undefined' && trajetsBus && trajetsBus.length > 0) {
        let busCard = document.createElement('div');
        busCard.className = 'type-card';
        busCard.style.marginTop = '16px';
        
        let busHeader = document.createElement('div');
        busHeader.className = 'type-header';
        busHeader.style.background = '#2c7a4d';
        busHeader.innerHTML = `<span class="type-nom">TRAJETS BUS</span><span class="toggle-icon">▼</span>`;
        
        let busContent = document.createElement('div');
        busContent.className = 'type-content';
        
        trajetsBus.forEach(trajet => {
            let item = document.createElement('div');
            item.className = 'sous-type-item';
            item.style.borderLeftColor = trajet.couleur || '#2c7a4d';
            item.innerHTML = `
                <div style="width:32px;height:32px;border-radius:20px;background:${trajet.couleur || '#2c7a4d'};display:flex;align-items:center;justify-content:center;margin-right:12px;color:white;font-weight:bold;">B</div>
                <div class="sous-type-info"><div class="sous-type-nom">${trajet.nom}</div></div>
            `;
            item.addEventListener('click', () => {
                effacerTousLesTrajets();
                afficherTrajetBus(trajet.id);
            });
            busContent.appendChild(item);
        });
        
        busHeader.addEventListener('click', () => {
            busHeader.classList.toggle('collapsed');
            busContent.classList.toggle('collapsed');
        });
        
        busCard.appendChild(busHeader);
        busCard.appendChild(busContent);
        container.appendChild(busCard);
    }
    
    // Trajets Golfette
    if(typeof trajetsGolfette !== 'undefined' && trajetsGolfette && trajetsGolfette.length > 0) {
        let golfCard = document.createElement('div');
        golfCard.className = 'type-card';
        golfCard.style.marginTop = '16px';
        
        let golfHeader = document.createElement('div');
        golfHeader.className = 'type-header';
        golfHeader.style.background = '#3c9e62';
        golfHeader.innerHTML = `<span class="type-nom">NAVETTES GOLFETTES</span><span class="toggle-icon">▼</span>`;
        
        let golfContent = document.createElement('div');
        golfContent.className = 'type-content';
        
        trajetsGolfette.forEach(trajet => {
            let item = document.createElement('div');
            item.className = 'sous-type-item';
            item.style.borderLeftColor = trajet.couleur || '#3c9e62';
            item.innerHTML = `
                <div style="width:32px;height:32px;border-radius:20px;background:${trajet.couleur || '#3c9e62'};display:flex;align-items:center;justify-content:center;margin-right:12px;color:white;font-weight:bold;">G</div>
                <div class="sous-type-info"><div class="sous-type-nom">${trajet.nom}</div></div>
            `;
            item.addEventListener('click', () => {
                effacerTousLesTrajets();
                afficherTrajetGolfette(trajet.id);
            });
            golfContent.appendChild(item);
        });
        
        golfHeader.addEventListener('click', () => {
            golfHeader.classList.toggle('collapsed');
            golfContent.classList.toggle('collapsed');
        });
        
        golfCard.appendChild(golfHeader);
        golfCard.appendChild(golfContent);
        container.appendChild(golfCard);
    }
}

// ==================== TRAJETS ====================
function afficherTrajetGolfette(trajetId) {
    if(trajetActuel) map.removeLayer(trajetActuel);
    let trajet = (typeof trajetsGolfette !== 'undefined') ? trajetsGolfette.find(t => t.id === trajetId) : null;
    if(!trajet || typeof arretsGolfette === 'undefined') {
        console.log("Trajet golfette non trouve:", trajetId);
        return;
    }
    let points = [];
    trajet.arrets.forEach(id => {
        let arret = arretsGolfette.find(a => a.id === id);
        if(arret) points.push(arret.coords);
    });
    if(points.length > 0) {
        trajetActuel = L.polyline(points, { color: trajet.couleur, weight: 5, opacity: 0.9 }).addTo(map);
        map.fitBounds(L.polyline(points).getBounds());
        console.log("Trajet golfette affiche:", trajet.nom);
    }
}

function afficherTrajetBus(trajetId) {
    if(trajetBusActuel) map.removeLayer(trajetBusActuel);
    let trajet = (typeof trajetsBus !== 'undefined') ? trajetsBus.find(t => t.id === trajetId) : null;
    if(!trajet || typeof arretsBus === 'undefined') {
        console.log("Trajet bus non trouve:", trajetId);
        return;
    }
    let points = [];
    trajet.arrets.forEach(id => {
        let arret = arretsBus.find(a => a.id === id);
        if(arret) points.push(arret.coords);
    });
    if(points.length > 0) {
        trajetBusActuel = L.polyline(points, { color: trajet.couleur, weight: 5, dashArray: "8,8", opacity: 0.9 }).addTo(map);
        map.fitBounds(L.polyline(points).getBounds());
        console.log("Trajet bus affiche:", trajet.nom);
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
    let toggleBtn = document.getElementById('toggleSidebar');
    sidebar.classList.toggle('collapsed');
    toggleBtn.innerHTML = sidebar.classList.contains('collapsed') ? '▶' : '◀';
}

// ==================== INITIALISATION ====================
document.addEventListener('DOMContentLoaded', () => {
    if(typeof projets !== 'undefined') {
        initMap();
    } else {
        const checkData = setInterval(() => {
            if(typeof projets !== 'undefined') {
                clearInterval(checkData);
                initMap();
            }
        }, 100);
    }
    
    let toggleBtn = document.getElementById('toggleSidebar');
    if(toggleBtn) toggleBtn.addEventListener('click', toggleSidebar);
});

window.recentrerBenGuerir = recentrerBenGuerir;
window.recentrerRabat = recentrerRabat;
window.afficherTousCampus = afficherTousCampus;
window.toggleSidebar = toggleSidebar;