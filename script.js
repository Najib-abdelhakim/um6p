// ==================== VARIABLES GLOBALES ====================
let map;
let markersList = [];
let currentCampus = 'all';
let currentTypeFilter = 'all';
let trajetActuel = null;
let trajetBusActuel = null;

// ==================== FONCTION POUR DÉFINIR LA COULEUR DE RAYONNEMENT ====================
function getGlowColor(type) {
    const glowColors = {
        'Water': 'rgba(0, 150, 255, 0.7)',
        'Engagement In Action': 'rgba(255, 100, 0, 0.7)',
        'Waste': 'rgba(50, 205, 50, 0.7)',
        'Biodiversity': 'rgba(34, 139, 34, 0.7)',
        'Energy': 'rgba(255, 215, 0, 0.7)',
        'Ecomobility': 'rgba(0, 206, 209, 0.7)',
        'Buildings': 'rgba(138, 43, 226, 0.7)',
        'Catering': 'rgba(255, 140, 0, 0.7)'
    };
    
    if (type && glowColors[type]) return glowColors[type];
    return 'rgba(255, 255, 0, 0.5)';
}

// ==================== FONCTION POPUP AVEC RAYONNEMENT ====================
function creerMarqueurAvecInfos(projet) {
    let iconUrl = projet.icone && projet.icone !== "" ? projet.icone : 'https://cdn-icons-png.flaticon.com/512/2991/2991231.png';
    let glowColor = getGlowColor(projet.type);
    let markerId = projet.id || Math.random().toString(36);
    
    let customIcon = L.divIcon({
        className: 'custom-marker',
        html: `
            <div class="marker-container" data-id="${markerId}">
                <div class="marker-glow" style="background: radial-gradient(circle, ${glowColor} 0%, ${glowColor.replace('0.7', '0.3')} 40%, rgba(255,255,255,0) 80%);"></div>
                <div class="marker-pulse" style="background: radial-gradient(circle, ${glowColor.replace('0.7', '0.4')} 0%, rgba(255,255,0,0) 100%);"></div>
                <img src="${iconUrl}" class="marker-image" style="width:42px;height:42px;border-radius:50%;border:3px solid white;box-shadow:0 2px 12px rgba(0,0,0,0.4);background:white;padding:3px;object-fit:cover;position:relative;z-index:2;">
            </div>
        `,
        iconSize: [80, 80],
        popupAnchor: [0, -40],
        className: 'glow-marker'
    });
    
    let marker = L.marker(projet.coordinates, { icon: customIcon });
    
    const isPriority = (projet.type === 'Water' || projet.type === 'Engagement In Action' || projet.type === 'Waste');
    if (isPriority) {
        setTimeout(() => {
            const container = document.querySelector(`.marker-container[data-id="${markerId}"]`);
            if (container) {
                const pulseDiv = container.querySelector('.marker-pulse');
                if (pulseDiv) pulseDiv.style.animation = 'pulse 1.5s infinite';
                const glowDiv = container.querySelector('.marker-glow');
                if (glowDiv) glowDiv.style.animation = 'glowPulse 2s infinite';
            }
        }, 100);
    }
    
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
    `, { maxWidth: 450, minWidth: 350 });
    
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
    
    setTimeout(() => {
        ameliorerVisibiliteMarqueurs();
    }, 500);
    
    // Campus controls avec les 6 boutons
    let campusDiv = document.getElementById('campusControls');
    if(campusDiv) {
        campusDiv.innerHTML = `
            <button class="campus-btn" id="btnBG" style="background: linear-gradient(135deg, #bc4d29, #d74a2b); color: white;">Ben Guerir</button>
            <button class="campus-btn" id="btnRabat" style="background: linear-gradient(135deg, #808080, #696969); color: white;">Rabat</button>
            <button class="campus-btn" id="btnGEP" style="background: linear-gradient(135deg, #a4c840, #61873d); color: white;">GEP</button>
            <button class="campus-btn" id="btnAITTC" style="background: linear-gradient(135deg, #17a2b8, #00bcd4); color: white;">AITTC</button>
            <button class="campus-btn" id="btnACARI" style="background: linear-gradient(135deg,  #bc9d75, #e6cfaf); color: #4a3728;">ACARI Laayoune</button>
        `;
        
        document.getElementById('btnBG').onclick = () => recentrerBenGuerir();
        document.getElementById('btnRabat').onclick = () => recentrerRabat();
        document.getElementById('btnGEP').onclick = () => recentrerGEP();
        document.getElementById('btnAITTC').onclick = () => recentrerAITTC();
        document.getElementById('btnACARI').onclick = () => recentrerACARI();
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
    
    // COULEURS FLUO / NEON pour chaque thème quand actif
    const themeActiveColors = {
        'Biodiversity': '#34a56f',        // Vert
        'Buildings': '#9b59b6',            // Violet
        'Ecomobility': '#00bcd4',          // Cyan
        'Energy': '#f1c40f',               // Jaune
        'Engagement In Action': '#e67e22',  // Orange
        'Waste': '#2ecc71',                // Vert clair
        'Water': '#3498db'                 // Bleu
    };
    
    let html = '';
    
    // Bouton ALL - reste vert foncé quand actif
    let isAllActive = (currentTypeFilter === 'all');
    html += `<button class="type-filter-btn ${isAllActive ? 'active' : ''}" data-type="all" style="background: ${isAllActive ? '#2c7a4d' : '#e8f3ec'}; color: ${isAllActive ? 'white' : '#1e5a3a'}; border: 1px solid #c5e0cf; transition: all 0.3s ease;">All</button>`;
    
    // Les autres boutons
    typesArray.forEach(type => {
        let isActive = (currentTypeFilter === type);
        let activeColor = themeActiveColors[type] || '#2c7a4d';
        
        html += `<button class="type-filter-btn ${isActive ? 'active' : ''}" data-type="${type}" style="background: ${isActive ? activeColor : '#e8f3ec'}; color: ${isActive ? 'white' : '#1e5a3a'}; border: 1px solid #c5e0cf; transition: all 0.3s ease;">${type}</button>`;
    });
    
    container.innerHTML = html;
    
    document.querySelectorAll('.type-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            let selectedType = btn.getAttribute('data-type');
            
            // Mettre à jour tous les boutons
            document.querySelectorAll('.type-filter-btn').forEach(b => {
                let type = b.getAttribute('data-type');
                
                if (selectedType === type) {
                    b.classList.add('active');
                    if (type === 'all') {
                        b.style.background = '#2c7a4d';
                        b.style.color = 'white';
                    } else {
                        let activeColor = themeActiveColors[type] || '#2c7a4d';
                        b.style.background = activeColor;
                        b.style.color = 'white';
                    }
                } else {
                    b.classList.remove('active');
                    b.style.background = '#e8f3ec';
                    b.style.color = '#1e5a3a';
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

function afficherTousCampus() {
    map.setView([32.9, -7.0], 8);
    filtrerParCampus('all');
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

function recentrerACARI() {
    let acariProject = projets.find(p => p.campus === 'ACARI Laayoune' && p.coordinates);
    if(acariProject && acariProject.coordinates) {
        map.setView(acariProject.coordinates, 13);
    } else {
        map.setView([27.17847371770062, -13.383737074369604], 18);
    }
    filtrerParCampus('ACARI Laayoune');
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
window.afficherTousCampus = afficherTousCampus;
window.toggleSidebar = toggleSidebar;
window.afficherTousLesMarqueurs = afficherTousLesMarqueurs;
window.recentrerGEP = recentrerGEP;
window.recentrerAITTC = recentrerAITTC;
window.recentrerACARI = recentrerACARI;