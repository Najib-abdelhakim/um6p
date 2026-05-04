// ==================== VARIABLES GLOBALES ====================
let map;
let markersList = [];
let currentCampus = 'all';
let currentTypeFilter = 'all';
let trajetActuel = null;
let trajetBusActuel = null;

// ==================== COULEURS ====================
const glowColors = {
    'Water': 'rgb(0, 149, 255)',
    'Engagement In Action': 'rgb(255, 102, 0)',
    'Waste': 'rgb(255, 43, 43)',
    'Biodiversity': 'rgb(0, 255, 0)',
    'Energy': 'rgb(255, 217, 0)',
    'Ecomobility': 'rgb(0, 251, 255)',
    'Buildings': 'rgb(132, 0, 255)',
    'Catering': 'rgb(255, 162, 0)'
};

const themeActiveColors = {
    'Biodiversity': '#34a56f',
    'Buildings': '#b700ff',
    'Ecomobility': '#00bcd4',
    'Energy': '#ffcc00',
    'Engagement In Action': '#e67e22',
    'Waste': '#cd0e0e',
    'Water': '#0099ff'
};

function getGlowColor(type) {
    if (type && glowColors[type]) return glowColors[type];
    return 'rgba(255, 255, 0, 0.5)';
}

// ==================== FONCTION POPUP AVEC RAYONNEMENT ====================
function creerMarqueurAvecInfos(projet) {
    let iconUrl = projet.icone && projet.icone !== "" ? projet.icone : '';
    let glowColor = getGlowColor(projet.type);
    let markerId = projet.id || Math.random().toString(36);
    
    let customIcon = L.divIcon({
        className: 'custom-marker',
        html: `
            <div class="marker-container" data-id="${markerId}">
                <div class="marker-glow" style="background: radial-gradient(circle, ${glowColor} 0%, ${glowColor.replace('0.7', '0.4')} 40%, rgba(255,255,255,0) 60%);"></div>
                <div class="marker-pulse" style="background: radial-gradient(circle, ${glowColor.replace('0.7', '0.4')} 0%, rgba(255,255,0,0) 100%);"></div>
                ${iconUrl ? `<img src="${iconUrl}" class="marker-image" style="width:42px;height:42px;border-radius:50%;border:3px solid white;box-shadow:0 2px 12px rgba(0,0,0,0.4);background:white;padding:3px;object-fit:cover;position:relative;z-index:2;">` : ''}
            </div>
        `,
        iconSize: [80, 80],
        popupAnchor: [0, -40],
        className: 'glow-marker'
    });
    
    let marker = L.marker(projet.coordinates, { icon: customIcon });
    
    let badgeHtml = '';
    if ((projet.type && projet.type.trim() !== "") || (projet.campus && projet.campus.trim() !== "")) {
        let typePart = (projet.type && projet.type.trim() !== "") ? projet.type : "";
        let campusPart = (projet.campus && projet.campus.trim() !== "") ? projet.campus : "";
        let separator = (typePart && campusPart) ? " · " : "";
        badgeHtml = `<div class="popup-badge">${typePart}${separator}${campusPart}</div>`;
    }
    
    let titleHtml = '';
    if (projet.nom && projet.nom.trim() !== "") titleHtml = `<h3>${projet.nom}</h3>`;
    
    let descriptionHtml = '';
    if (projet.description && projet.description.trim() !== "") descriptionHtml = `<div class="popup-description">${projet.description}</div>`;
    
    let complementHtml = '';
    if (projet.Informations_complémentaires && projet.Informations_complémentaires.trim() !== "") {
        complementHtml = `<div class="popup-footer"><div class="info-complementaire"><strong>Additional details :</strong><br>${projet.Informations_complémentaires}</div></div>`;
    }
    
    let textContent = `${titleHtml}${badgeHtml}${descriptionHtml}${complementHtml}`;
    let hasImage = (projet.image && projet.image.trim() !== "" && !projet.image.includes('flaticon'));
    
    if (!hasImage) {
        marker.bindPopup(`<div class="popup-content-text" style="padding:15px;">${textContent}</div>`, { maxWidth: 450, minWidth: 350 });
        return marker;
    }
    
    marker.bindPopup(`
        <div class="popup-layout-vertical">
            <div class="popup-image-top"><img src="${projet.image}" alt="${projet.nom || 'Image'}"></div>
            <div class="popup-content-text">${textContent}</div>
        </div>
    `, { maxWidth: 300, minWidth: 200 });
    
    return marker;
}
// ==================== FONCTION POUR AMÉLIORER LA VISIBILITÉ ====================
function ameliorerVisibiliteMarqueurs() {
    markersList.forEach(item => {
        if (item.marker._icon) {
            item.marker._icon.addEventListener('mouseenter', () => {
                const glowDiv = item.marker._icon.querySelector('.marker-glow');
                if (glowDiv) {
                    glowDiv.style.transform = 'scale(1.3)';
                    glowDiv.style.opacity = '0.9';
                }
            });
            item.marker._icon.addEventListener('mouseleave', () => {
                const glowDiv = item.marker._icon.querySelector('.marker-glow');
                if (glowDiv) {
                    glowDiv.style.transform = 'scale(1)';
                    glowDiv.style.opacity = '0.7';
                }
            });
        }
    });
}

// ==================== FONCTION POUR AFFICHER TOUS LES MARQUEURS ====================
function afficherTousLesMarqueurs() {
    markersList.forEach(item => {
        if (!map.hasLayer(item.marker)) {
            item.marker.addTo(map);
        }
    });
    currentTypeFilter = 'all';
    currentCampus = 'all';
    mettreAJourStats();
}

// ==================== INITIALISATION ====================
function initMap() {
    if (typeof projets === 'undefined') {
        console.error("ERROR: Project data not loaded!");
        return;
    }
    
    console.log("=== INIT MAP - GOOGLE HYBRID WITH GLOW EFFECTS ===");
    console.log("Total projects:", projets.length);
    
    map = L.map('map').setView([31.862835361667987, -6.849775828544829], 5);
    
    L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        attribution: '&copy; <a href="https://maps.google.com">Google Maps</a> | UM6P Green Map',
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    }).addTo(map);
    
    // NE PAS ajouter les marqueurs ici - ils seront ajoutés quand on clique sur un campus
    
    // Créer les marqueurs mais ne pas les ajouter à la carte
    projets.forEach(proj => {
        if(proj.coordinates && proj.coordinates.length === 2) {
            let marker = creerMarqueurAvecInfos(proj);
            // NE PAS FAIRE marker.addTo(map)
            markersList.push({ marker: marker, projet: proj });
        }
    });
    
    console.log("Total markers created (not added to map):", markersList.length);
    
    // Ne pas appeler appliquerFiltres() ici car currentCampus = 'all' afficherait tout
    // On garde currentCampus = 'all' mais on n'affiche rien
    afficherFiltresTypes();
    afficherListeSousTypes();
    afficherTrajetsSection();
    mettreAJourStats();
    
    // Campus controls avec les 6 boutons
    let campusDiv = document.getElementById('campusControls');
    if(campusDiv) {
        campusDiv.innerHTML = `
            <button class="campus-btn" id="btnBG" style="background: linear-gradient(135deg, #bc4d29, #d74a2b); color: white;">Ben Guerir</button>
            <button class="campus-btn" id="btnRabat" style="background: linear-gradient(135deg, #808080, #696969); color: white;">Rabat</button>
            <button class="campus-btn" id="btnGEP" style="background: linear-gradient(135deg, #a4c840, #61873d); color: white;">GEP</button>
            <button class="campus-btn" id="btnAITTC" style="background: linear-gradient(135deg, #17a2b8, #00bcd4); color: white;">AITTC</button>
            <button class="campus-btn" id="btnASARI" style="background: linear-gradient(135deg, #bc9d75, #e6cfaf); color: #4a3728;">ASARI Laayoune</button>
        `;
        
        document.getElementById('btnBG').onclick = () => recentrerBenGuerir();
        document.getElementById('btnRabat').onclick = () => recentrerRabat();
        document.getElementById('btnGEP').onclick = () => recentrerGEP();
        document.getElementById('btnAITTC').onclick = () => recentrerAITTC();
        document.getElementById('btnASARI').onclick = () => recentrerASARI();
    }
    
    // Reset button
    document.getElementById('resetFilters')?.addEventListener('click', () => {
        currentTypeFilter = 'all';
        currentCampus = 'all';
        // Ne pas afficher tous les marqueurs, juste cacher tous
        markersList.forEach(item => {
            if (map.hasLayer(item.marker)) {
                map.removeLayer(item.marker);
            }
        });
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
    afficherTrajetsSection();
    afficherListeSousTypes();
    effacerTousLesTrajets();
}

function filtrerParType(type) {
    currentTypeFilter = type;
    appliquerFiltres();
    afficherFiltresTypes();
    afficherTrajetsSection();
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
    
    let html = '';
    
    let isAllActive = (currentTypeFilter === 'all');
    html += `<button class="type-filter-btn ${isAllActive ? 'active' : ''}" data-type="all" style="background: ${isAllActive ? '#01568b' : '#e8f0f5'}; color: ${isAllActive ? 'white' : '#01568b'}; border: 1px solid #c5e0cf; transition: all 0.3s ease;">All</button>`;
    
    typesArray.forEach(type => {
        let isActive = (currentTypeFilter === type);
        let activeColor = themeActiveColors[type] || '#01568b';
        
        html += `<button class="type-filter-btn ${isActive ? 'active' : ''}" data-type="${type}" style="background: ${isActive ? activeColor : '#e8f0f5'}; color: ${isActive ? 'white' : '#01568b'}; border: 1px solid #c5e0cf; transition: all 0.3s ease;">${type}</button>`;
    });
    
    container.innerHTML = html;
    
    document.querySelectorAll('.type-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            let selectedType = btn.getAttribute('data-type');
            
            document.querySelectorAll('.type-filter-btn').forEach(b => {
                let type = b.getAttribute('data-type');
                
                if (selectedType === type) {
                    b.classList.add('active');
                    if (type === 'all') {
                        b.style.background = '#01568b';
                        b.style.color = 'white';
                    } else {
                        let activeColor = themeActiveColors[type] || '#01568b';
                        b.style.background = activeColor;
                        b.style.color = 'white';
                    }
                } else {
                    b.classList.remove('active');
                    b.style.background = '#e8f0f5';
                    b.style.color = '#01568b';
                }
            });
            
            filtrerParType(selectedType);
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
    
    // Filtrer les trajets golfette selon le campus
    let golfettesFiltrees = [];
    if(typeof trajetsGolfette !== 'undefined' && trajetsGolfette) {
        if (currentCampus === 'all') {
            golfettesFiltrees = [...trajetsGolfette];
        } else {
            golfettesFiltrees = trajetsGolfette.filter(t => t.campus === currentCampus);
        }
    }
    
    // Filtrer les trajets bus selon le campus
    let busFiltrees = [];
    if(typeof trajetsBus !== 'undefined' && trajetsBus) {
        if (currentCampus === 'all') {
            busFiltrees = [...trajetsBus];
        } else {
            busFiltrees = trajetsBus.filter(t => t.campus === currentCampus);
        }
    }
    
    // Afficher GOLF CART
    if(golfettesFiltrees.length > 0) {
        let card = document.createElement('div');
        card.className = 'type-card';
        card.innerHTML = `
            <div class="type-header" style="background:#01568b">
                <span class="type-nom">GOLF CART Pathway</span>
                <span class="toggle-icon">▼</span>
            </div>
            <div class="type-content" id="golfetteContent"></div>
        `;
        let content = card.querySelector('.type-content');
        golfettesFiltrees.forEach(t => {
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
    
    // Afficher BUS
    if(busFiltrees.length > 0) {
        let card = document.createElement('div');
        card.className = 'type-card';
        card.innerHTML = `
            <div class="type-header" style="background:#01568b">
                <span class="type-nom">BUS Pathway</span>
                <span class="toggle-icon">▼</span>
            </div>
            <div class="type-content" id="busContent"></div>
        `;
        let content = card.querySelector('.type-content');
        busFiltrees.forEach(t => {
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
        let contourBlanc = L.polyline(points, { color: "#FFFFFF", weight: 6, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }).addTo(map);
        let traitCouleur = L.polyline(points, { color: trajet.couleur, weight: 2, opacity: 1, lineCap: 'round', lineJoin: 'round' }).addTo(map);
        trajetActuel = L.layerGroup([contourBlanc, traitCouleur]).addTo(map);
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
        let contourBlanc = L.polyline(points, { color: "#FFFFFF", weight: 6, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }).addTo(map);
        let traitCouleur = L.polyline(points, { color: trajet.couleur, weight: 2, opacity: 1, dashArray: "8,8", lineCap: 'round', lineJoin: 'round' }).addTo(map);
        trajetBusActuel = L.layerGroup([contourBlanc, traitCouleur]).addTo(map);
        map.fitBounds(L.latLngBounds(points));
    }
}

function effacerTousLesTrajets() {
    if(trajetActuel) { map.removeLayer(trajetActuel); trajetActuel = null; }
    if(trajetBusActuel) { map.removeLayer(trajetBusActuel); trajetBusActuel = null; }
}

// ==================== CAMPUS ACTIONS ====================
function recentrerBenGuerir() {
    map.setView([32.2162514740, -7.9394896113], 16);
    filtrerParCampus('Ben Guerir');
}

function recentrerRabat() {
    map.setView([33.98077935537, -6.72924130237], 17);
    filtrerParCampus('Rabat');
}

function recentrerGEP() {
    let gepProject = projets.find(p => p.campus === 'GEP' && p.coordinates);
    if(gepProject && gepProject.coordinates) {
        map.setView(gepProject.coordinates, 16);
    } else {
        map.setView([32.221600083, -7.92746093660], 17);
    }
    filtrerParCampus('GEP');
}

function recentrerAITTC() {
    let aittcProject = projets.find(p => p.campus === 'AITTC' && p.coordinates);
    if(aittcProject && aittcProject.coordinates) {
        map.setView(aittcProject.coordinates, 16);
    } else {
        map.setView([32.2191598586631, -7.89091311143900], 18);
    }
    filtrerParCampus('AITTC');
}

function recentrerASARI() {
    let asariProject = projets.find(p => p.campus === 'ASARI Laayoune' && p.coordinates);
    if(asariProject && asariProject.coordinates) {
        map.setView(asariProject.coordinates, 13);
    } else {
        map.setView([27.178419194697753, -13.383511877580803], 18);
    }
    filtrerParCampus('ASARI Laayoune');
}

function toggleSidebar() {
    let sidebar = document.getElementById('sidebar');
    let btn = document.getElementById('toggleSidebar');
    sidebar.classList.toggle('collapsed');
    btn.innerHTML = sidebar.classList.contains('collapsed') ? '▶' : '◀';
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded - Google Hybrid Map with Glow Effects");
    
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

window.recentrerBenGuerir = recentrerBenGuerir;
window.recentrerRabat = recentrerRabat;
window.toggleSidebar = toggleSidebar;
window.afficherTousLesMarqueurs = afficherTousLesMarqueurs;
window.recentrerGEP = recentrerGEP;
window.recentrerAITTC = recentrerAITTC;
window.recentrerASARI = recentrerASARI;