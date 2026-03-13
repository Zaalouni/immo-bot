/**
 * ══════════════════════════════════════════════════════════════════════════
 * NAV-MENU.JS - Unified Navigation Menu for ImmoLux Dashboard
 * - Generates global navbar with sidebar menu
 * - 21 pages organized by categories
 * - Mobile-first with touch support
 * - Auto-detects active page
 * ══════════════════════════════════════════════════════════════════════════
 */

(function() {
    'use strict';

    // ── Configuration ────────────────────────────────────────────────────────

    const NAV_CONFIG = {
        logo: {
            text: '🏠 ImmoLux',
            href: 'index.html'
        },
        quickLinks: [
            { text: 'Dashboard', href: 'index.html' },
            { text: 'Explorer', href: 'explorer.html' },
            { text: '3 Chambres', href: '3chambres.html' },
            { text: 'Nouvelles', href: 'new-listings.html' },
            { text: 'Carte', href: 'map-advanced.html' }
        ],
        categories: [
            {
                id: 'main',
                icon: '🏠',
                title: 'Pages principales',
                links: [
                    { icon: '📊', text: 'Dashboard', href: 'index.html' },
                    { icon: '🔍', text: 'Explorer', href: 'explorer.html' },
                    { icon: '🏠', text: '3 Chambres', href: '3chambres.html' },
                    { icon: '🚆', text: 'Villes Train', href: 'train-cities.html' }
                ]
            },
            {
                id: 'new',
                icon: '✨',
                title: 'Nouvelles & Alertes',
                links: [
                    { icon: '✨', text: 'Nouvelles annonces', href: 'new-listings.html' },
                    { icon: '⭐', text: 'Alertes', href: 'alerts.html' },
                    { icon: '⭐', text: 'Prioritaires', href: 'favorites.html' }
                ]
            },
            {
                id: 'maps',
                icon: '🗺️',
                title: 'Cartes & Proximité',
                links: [
                    { icon: '🗺️', text: 'Carte', href: 'map.html' },
                    { icon: '🗺️', text: 'Carte avancée', href: 'map-advanced.html' },
                    { icon: '📍', text: 'Proximité', href: 'nearby.html' }
                ]
            },
            {
                id: 'stats',
                icon: '📊',
                title: 'Statistiques & Rapports',
                links: [
                    { icon: '📊', text: 'Résumé', href: 'dashboard-summary.html' },
                    { icon: '🧠', text: 'Synthèse marché', href: 'market-intelligence.html' },
                    { icon: '📋', text: 'Stats par ville', href: 'stats-by-city.html' },
                    { icon: '📈', text: 'Tendances', href: 'trends.html' },
                    { icon: '📄', text: 'Reports', href: 'reports.html' },
                    { icon: '📊', text: 'Qualité données', href: 'data-quality.html' }
                ]
            },
            {
                id: 'gallery',
                icon: '📸',
                title: 'Galerie',
                links: [
                    { icon: '📸', text: 'Photos', href: 'photos.html' },
                    { icon: '✨', text: 'Galerie', href: 'gallery.html' }
                ]
            },
            {
                id: 'tools',
                icon: '🔍',
                title: 'Outils',
                links: [
                    { icon: '🔄', text: 'Comparateur', href: 'comparison.html' },
                    { icon: '⚠️', text: 'Anomalies', href: 'anomalies.html' }
                ]
            },
            {
                id: 'ai',
                icon: '🤖',
                title: 'Intelligence Artificielle',
                links: [
                    { icon: '🤖', text: 'Analyse IA', href: 'ia-analyse.html' }
                ]
            }
        ]
    };

    // ── State ────────────────────────────────────────────────────────────────

    let sidebarOpen = false;
    let currentPage = getCurrentPage();

    // ── Helpers ──────────────────────────────────────────────────────────────

    function getCurrentPage() {
        const path = window.location.pathname;
        const page = path.split('/').pop() || 'index.html';
        return page === '' ? 'index.html' : page;
    }

    function isActivePage(href) {
        return href === currentPage;
    }

    function toggleSidebar(open) {
        sidebarOpen = typeof open === 'boolean' ? open : !sidebarOpen;

        const overlay = document.getElementById('navSidebarOverlay');
        const sidebar = document.getElementById('navSidebar');

        if (overlay && sidebar) {
            if (sidebarOpen) {
                overlay.classList.add('show');
                sidebar.classList.add('show');
                document.body.style.overflow = 'hidden'; // Prevent scroll
            } else {
                overlay.classList.remove('show');
                sidebar.classList.remove('show');
                document.body.style.overflow = '';
            }
        }
    }

    function toggleCategory(categoryId) {
        const category = document.querySelector(`[data-category-id="${categoryId}"]`);
        if (category) {
            category.classList.toggle('collapsed');

            // Save state to localStorage
            const collapsed = category.classList.contains('collapsed');
            localStorage.setItem(`nav-category-${categoryId}`, collapsed ? 'collapsed' : 'expanded');
        }
    }

    function restoreCategoryStates() {
        NAV_CONFIG.categories.forEach(cat => {
            const state = localStorage.getItem(`nav-category-${cat.id}`);
            const categoryEl = document.querySelector(`[data-category-id="${cat.id}"]`);

            if (categoryEl) {
                if (state === 'collapsed') {
                    categoryEl.classList.add('collapsed');
                } else {
                    categoryEl.classList.remove('collapsed');
                }
            }
        });
    }

    // ── Render Functions ─────────────────────────────────────────────────────

    function renderNavbar() {
        const nav = document.getElementById('global-nav');
        if (!nav) return;

        nav.className = 'global-nav';
        nav.innerHTML = `
            <a href="${NAV_CONFIG.logo.href}" class="global-nav-logo">${NAV_CONFIG.logo.text}</a>

            <div class="global-nav-links">
                ${NAV_CONFIG.quickLinks.map(link => `
                    <a href="${link.href}" class="global-nav-link ${isActivePage(link.href) ? 'active' : ''}">
                        ${link.text}
                    </a>
                `).join('')}
            </div>

            <div class="global-nav-actions">
                <button class="nav-btn nav-btn-menu"
                        id="navMenuToggle"
                        aria-label="Ouvrir le menu de navigation"
                        title="Menu"></button>
                ${renderDarkModeToggle()}
            </div>
        `;

        // Event listeners
        document.getElementById('navMenuToggle')?.addEventListener('click', () => toggleSidebar(true));
    }

    function renderDarkModeToggle() {
        // Check if dark mode toggle already exists on the page
        const existingToggle = document.getElementById('darkModeToggle');
        if (existingToggle) {
            return ''; // Don't create duplicate
        }

        return `
            <button class="nav-btn"
                    id="navDarkModeToggle"
                    aria-label="Basculer mode clair/sombre"
                    title="Mode clair/sombre">☀️</button>
        `;
    }

    function renderSidebar() {
        // Remove existing sidebar if any
        const existingOverlay = document.getElementById('navSidebarOverlay');
        const existingSidebar = document.getElementById('navSidebar');
        if (existingOverlay) existingOverlay.remove();
        if (existingSidebar) existingSidebar.remove();

        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'navSidebarOverlay';
        overlay.className = 'nav-sidebar-overlay';
        overlay.addEventListener('click', () => toggleSidebar(false));
        document.body.appendChild(overlay);

        // Create sidebar
        const sidebar = document.createElement('aside');
        sidebar.id = 'navSidebar';
        sidebar.className = 'nav-sidebar';
        sidebar.innerHTML = `
            <div class="nav-sidebar-header">
                <div class="nav-sidebar-title">Navigation</div>
                <button class="nav-sidebar-close"
                        id="navSidebarClose"
                        aria-label="Fermer le menu">×</button>
            </div>
            <div class="nav-sidebar-content">
                ${NAV_CONFIG.categories.map(renderCategory).join('')}
            </div>
        `;
        document.body.appendChild(sidebar);

        // Event listeners
        document.getElementById('navSidebarClose')?.addEventListener('click', () => toggleSidebar(false));

        // Category toggles
        NAV_CONFIG.categories.forEach(cat => {
            const header = document.querySelector(`[data-category-header="${cat.id}"]`);
            if (header) {
                header.addEventListener('click', () => toggleCategory(cat.id));
            }
        });

        // Touch events for mobile swipe-to-close
        let touchStartX = 0;
        let touchEndX = 0;

        sidebar.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        });

        sidebar.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        });

        function handleSwipe() {
            if (touchEndX > touchStartX + 50) { // Swipe right
                toggleSidebar(false);
            }
        }

        // Keyboard events
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && sidebarOpen) {
                toggleSidebar(false);
            }
        });

        // Restore category states
        setTimeout(restoreCategoryStates, 0);
    }

    function renderCategory(category) {
        return `
            <div class="nav-category" data-category-id="${category.id}">
                <button class="nav-category-header"
                        data-category-header="${category.id}"
                        aria-expanded="true">
                    <span>
                        <span class="nav-category-icon">${category.icon}</span>
                        ${category.title}
                    </span>
                    <span class="nav-category-toggle">▼</span>
                </button>
                <div class="nav-category-links">
                    ${category.links.map(renderSidebarLink).join('')}
                </div>
            </div>
        `;
    }

    function renderSidebarLink(link) {
        const active = isActivePage(link.href) ? 'active' : '';
        return `
            <a href="${link.href}" class="nav-sidebar-link ${active}">
                <span class="nav-sidebar-link-icon">${link.icon}</span>
                ${link.text}
            </a>
        `;
    }

    // ── Dark Mode Integration ────────────────────────────────────────────────

    function setupDarkModeIntegration() {
        const navToggle = document.getElementById('navDarkModeToggle');
        const existingToggle = document.getElementById('darkModeToggle');

        if (navToggle && existingToggle) {
            // Sync with existing dark mode toggle
            navToggle.addEventListener('click', () => {
                existingToggle.click();
            });
        } else if (navToggle) {
            // Standalone dark mode toggle
            navToggle.addEventListener('click', () => {
                document.body.classList.toggle('light-mode');
                const isLight = document.body.classList.contains('light-mode');
                navToggle.textContent = isLight ? '🌙' : '☀️';
                localStorage.setItem('theme', isLight ? 'light' : 'dark');
            });

            // Restore saved theme
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme === 'light') {
                document.body.classList.add('light-mode');
                navToggle.textContent = '🌙';
            }
        }
    }

    // ── Initialize ───────────────────────────────────────────────────────────

    function init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
            return;
        }

        renderNavbar();
        renderSidebar();
        setupDarkModeIntegration();

        console.log('✅ Global navigation menu initialized');
    }

    // Start
    init();

})();
