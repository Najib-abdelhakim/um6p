// ==================== VARIABLES GLOBALES ====================
let map;
let markersList = [];
let currentCampus = 'all';
let trajetActuel = null;
let trajetBusActuel = null;

// ==================== FONCTION POPUP AMÉLIORÉE ====================
function creerMarqueurAvecInfos(projet) {
    // Icône personnalisée (inchangée)
    let iconUrl = projet.icone && projet.icone !== "" ? projet.icone : 'https://cdn-icons-png.flaticon.com/512/2991/2991231.png';
    let customIcon = L.divIcon({
        className: 'custom-marker',
        html: `<img src="${iconUrl}" style="width:48px;height:48px;border-radius:50%;border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.3);background:white;padding:5px;object-fit:cover;">`,
        iconSize: [48, 48],
        popupAnchor: [0, -28]
    });
    
    let marker = L.marker(projet.coordinates, { icon: customIcon });
    
    // === IMAGE AVEC HAUTEUR 220px (agrandie) ===
    let imageHtml = '';
    if (projet.image && projet.image !== "") {
        imageHtml = `<div class="popup-img-wrapper"><img src="${projet.image}" class="popup-img" alt="${projet.nom}" onerror="this.src='https://cdn-icons-png.flaticon.com/512/2941/2941535.png'"></div>`;
    } else {
        imageHtml = `<div class="popup-img-wrapper"><img src="https://cdn-icons-png.flaticon.com/512/2941/2941535.png" class="popup-img" style="padding:20px; background:#eef2ea;" alt="icone"></div>`;
    }
    
    let badgeType = projet.type || "Projet";
    let campusInfo = projet.campus || "UM6P";
    let descriptionText = projet.description ? projet.description : "Aucune description disponible.";
    
    // === RÉCUPÉRATION DES INFOS COMPLÉMENTAIRES ===
    let complementHtml = "";
    
    // Champ principal: Informations_complémentaires
    if (projet.Informations_complémentaires && projet.Informations_complémentaires.trim() !== "") {
        complementHtml += `<div class="info-complementaire"><strong>📋 Détails techniques :</strong><br>${projet.Informations_complémentaires}</div>`;
    }
    
    // Autres champs possibles
    if (projet.Daily_production && projet.Daily_production !== "") {
        complementHtml += `<div class="info-complementaire"><strong>⚡ Production journalière :</strong> ${projet.Daily_production}</div>`;
    }
    if (projet.Total_power && projet.Total_power !== "") {
        complementHtml += `<div class="info-complementaire"><strong>🔋 Puissance totale :</strong> ${projet.Total_power}</div>`;
    }
    if (projet.Number_of_panels && projet.Number_of_panels !== "") {
        complementHtml += `<div class="info-complementaire"><strong>☀️ Panneaux :</strong> ${projet.Number_of_panels}</div>`;
    }
    if (projet.Number_of_lights && projet.Number_of_lights !== "") {
        complementHtml += `<div class="info-complementaire"><strong>💡 Éclairage :</strong> ${projet.Number_of_lights}</div>`;
    }
    if (projet.Operating_hours && projet.Operating_hours !== "") {
        complementHtml += `<div class="info-complementaire"><strong>⏱️ Autonomie :</strong> ${projet.Operating_hours}</div>`;
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

// ==================== INITIALISATION DE LA CARTE (INCHANGÉE) ====================
function initMap() {
    if (typeof projets === 'undefined') {
        console.error("Les données projets ne sont pas chargées");
        return;
    }
    
    // Carte Leaflet - IDENTIQUE à l'original
    map = L.map('map').setView([32.221017, -7.935687], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
        attribution: '© OpenStreetMap contributors' 
    }).addTo(map);
    
    // Ajout des marqueurs améliorés
    projets.forEach(proj => {
        let marker = creerMarqueurAvecInfos(proj);
        marker.addTo(map);
        markersList.push({ marker: marker, projet: proj });
    });
    
    filtrerParCampus('all');
    
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
    
    afficherListeTypes();
    mettreAJourStats();
}

// ==================== FILTRES ====================
function filtrerParCampus(campus) {
    currentCampus = campus;
    markersList.forEach(item => {
        if (campus === 'all' || item.projet.campus === campus) {
            if (!map.hasLayer(item.marker)) item.marker.addTo(map);
        } else {
            if (map.hasLayer(item.marker)) map.removeLayer(item.marker);
        }
    });
    afficherListeTypes();
    effacerTousLesTrajets();
    mettreAJourStats();
}

function resetMarqueurs() {
    filtrerParCampus(currentCampus);
}

function getTotalProjetsCount() {
    if (currentCampus === 'all') return projets.length;
    return projets.filter(p => p.campus === currentCampus).length;
}

function mettreAJourStats() {
    let countSpan = document.getElementById('projetCount');
    let campusSpan = document.getElementById('campusName');
    if(countSpan) countSpan.textContent = getTotalProjetsCount();
    if(campusSpan) campusSpan.textContent = currentCampus === 'all' ? 'Tous les campus' : currentCampus;
}

// ==================== ORGANISATION DES TYPES ====================
function organiserProjetsParType() {
    let types = {};
    projets.forEach(projet => {
        if (currentCampus !== 'all' && projet.campus !== currentCampus) return;
        if (!types[projet.type]) {
            types[projet.type] = { nom: projet.type, sousTypes: {} };
        }
        if (!types[projet.type].sousTypes[projet.sousType]) {
            types[projet.type].sousTypes[projet.sousType] = { 
                nom: projet.sousType, 
                icone: projet.icone, 
                projets: [] 
            };
        }
        types[projet.type].sousTypes[projet.sousType].projets.push(projet);
    });
    return types;
}

function afficherListeTypes() {
    let typesContainer = document.getElementById('typesList');
    if(!typesContainer) return;
    typesContainer.innerHTML = '';
    let types = organiserProjetsParType();
    
    for(let typeNom in types) {
        let typeData = types[typeNom];
        let sousTypes = typeData.sousTypes;
        let typeCard = document.createElement('div');
        typeCard.className = 'type-card';
        
        let header = document.createElement('div');
        header.className = 'type-header';
        header.innerHTML = `
            <span class="type-nom">
                <span>${typeNom}</span>
                <span style="font-size:11px;background:rgba(255,255,255,0.25);padding:2px 8px;border-radius:20px;">${Object.keys(sousTypes).length}</span>
            </span>
            <span class="toggle-icon">▼</span>
        `;
        
        let contentDiv = document.createElement('div');
        contentDiv.className = 'type-content';
        
        for(let sousTypeNom in sousTypes) {
            let stData = sousTypes[sousTypeNom];
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
                let sousTypeFilter = sousItem.getAttribute('data-soustype');
                markersList.forEach(item => {
                    if (map.hasLayer(item.marker)) map.removeLayer(item.marker);
                });
                markersList.forEach(item => {
                    if (item.projet.sousType === sousTypeFilter && (currentCampus === 'all' || item.projet.campus === currentCampus)) {
                        item.marker.addTo(map);
                    }
                });
                effacerTousLesTrajets();
                document.querySelectorAll('.sous-type-item').forEach(i => i.style.background = 'white');
                sousItem.style.background = '#e3f1e8';
            });
            contentDiv.appendChild(sousItem);
        }
        
        header.addEventListener('click', () => {
            header.classList.toggle('collapsed');
            contentDiv.classList.toggle('collapsed');
        });
        
        typeCard.appendChild(header);
        typeCard.appendChild(contentDiv);
        typesContainer.appendChild(typeCard);
    }
    
    // Trajets
    if(typeof trajetsBus !== 'undefined' && trajetsBus && trajetsBus.length) {
        let busCard = creerCarteTrajets(" TRAJETS BUS", "#2c7a4d", trajetsBus, (id) => afficherTrajetBus(id));
        typesContainer.appendChild(busCard);
    }
    if(typeof trajetsGolfette !== 'undefined' && trajetsGolfette && trajetsGolfette.length) {
        let golfCard = creerCarteTrajets(" NAVETTES GOLFETTES", "#3c9e62", trajetsGolfette, (id) => afficherTrajetGolfette(id));
        typesContainer.appendChild(golfCard);
    }
    
    // Reset
    let resetCard = document.createElement('div');
    resetCard.className = 'type-card';
    resetCard.style.background = '#f3f9f0';
    resetCard.style.border = '1px solid #9ac2a8';
    resetCard.innerHTML = `<div class="type-header" style="background:#3c9e62; justify-content:center;"><span class="type-nom"> TOUS LES PROJETS</span></div>`;
    resetCard.addEventListener('click', () => {
        resetMarqueurs();
        effacerTousLesTrajets();
        document.querySelectorAll('.sous-type-item').forEach(i => i.style.background = 'white');
    });
    typesContainer.appendChild(resetCard);
}

function creerCarteTrajets(titre, couleur, listeTrajets, onClickCallback) {
    let card = document.createElement('div');
    card.className = 'type-card';
    card.style.marginTop = '16px';
    
    let header = document.createElement('div');
    header.className = 'type-header';
    header.style.background = couleur;
    header.innerHTML = `<span class="type-nom">${titre}</span><span class="toggle-icon">▼</span>`;
    
    let content = document.createElement('div');
    content.className = 'type-content';
    
    listeTrajets.forEach(trajet => {
        let item = document.createElement('div');
        item.className = 'sous-type-item';
        item.style.borderLeftColor = trajet.couleur || couleur;
        item.innerHTML = `
            <div style="width:32px;height:32px;border-radius:20px;background:${trajet.couleur || '#555'};display:flex;align-items:center;justify-content:center;margin-right:12px;color:white;font-weight:bold;"></div>
            <div class="sous-type-info"><div class="sous-type-nom">${trajet.nom}</div></div>
        `;
        item.addEventListener('click', () => {
            effacerTousLesTrajets();
            onClickCallback(trajet.id);
        });
        content.appendChild(item);
    });
    
    header.addEventListener('click', () => {
        header.classList.toggle('collapsed');
        content.classList.toggle('collapsed');
    });
    
    card.appendChild(header);
    card.appendChild(content);
    return card;
}

// ==================== TRAJETS ====================
function afficherTrajetGolfette(trajetId) {
    if(trajetActuel) map.removeLayer(trajetActuel);
    let trajet = (typeof trajetsGolfette !== 'undefined') ? trajetsGolfette.find(t => t.id === trajetId) : null;
    if(!trajet || typeof arretsGolfette === 'undefined') return;
    let points = [];
    trajet.arrets.forEach(id => {
        let arret = arretsGolfette.find(a => a.id === id);
        if(arret) points.push(arret.coords);
    });
    if(points.length) {
        trajetActuel = L.polyline(points, { color: trajet.couleur, weight: 5, opacity: 0.9 }).addTo(map);
        map.fitBounds(L.polyline(points).getBounds());
    }
}

function afficherTrajetBus(trajetId) {
    if(trajetBusActuel) map.removeLayer(trajetBusActuel);
    let trajet = (typeof trajetsBus !== 'undefined') ? trajetsBus.find(t => t.id === trajetId) : null;
    if(!trajet || typeof arretsBus === 'undefined') return;
    let points = [];
    trajet.arrets.forEach(id => {
        let arret = arretsBus.find(a => a.id === id);
        if(arret) points.push(arret.coords);
    });
    if(points.length) {
        trajetBusActuel = L.polyline(points, { color: trajet.couleur, weight: 5, dashArray: "8,8", opacity: 0.9 }).addTo(map);
        map.fitBounds(L.polyline(points).getBounds());
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