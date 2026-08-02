const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');
const session = require('express-session');

const app = express();
const PORT = 3000;

// ============================================================
// SESSION (pour garder l'utilisateur connecté)
// ============================================================

app.use(session({
    secret: 'un-secret-tres-securise-pour-la-session',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 1 jour
}));

// ============================================================
// MIDDLEWARE GÉNÉRAUX
// ============================================================

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Servir les fichiers statiques (CSS, JS, images)
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configurer EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ============================================================
// MIDDLEWARE D'AUTHENTIFICATION POUR LE DASHBOARD
// ============================================================

const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.isLoggedIn) {
        return next();
    }
    res.redirect('/login');
};

// ============================================================
// CONFIGURATION MULTER
// ============================================================

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const name = crypto.randomBytes(16).toString('hex') + ext;
        cb(null, name);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }
});

// ============================================================
// FICHIERS DE DONNÉES (JSON)
// ============================================================

const MESSAGES_FILE = path.join(__dirname, 'messages.json');
const CONFIG_FILE = path.join(__dirname, 'config.json');

const DEFAULT_CONFIG = {
    philo_accueil: `<h2>Bienvenue</h2><p>Bienvenue sur l'espace numérique officiel de l'<strong>Association Philomatique de Madagascar</strong>. Fidèle à la tradition des sociétés philomatiques, notre espace a pour vocation de réunir les passionnés des sciences, des lettres, du droit et de la culture dans un esprit d'émulation intellectuelle libre et accessible.</p><div class="manifesto-box">Notre objectif est de jeter des ponts entre la réflexion académique, la rigueur philosophique et les dynamiques contemporaines de la société malgache. Ici, le savoir ne s'impose pas, il se partage et se cultive.</div><p>Que vous soyez étudiant, chercheur ou esprit curieux, cet espace est le vôtre. À travers cette plateforme gratuite et indépendante, nous souhaitons faire vivre le débat d'idées et la recherche de la clarté.</p>`,
    philo_presentation: `<h2>Qui sommes-nous ?</h2><p>L'Association Philomatique de Madagascar est un collectif indépendant né de la volonté de décloisonner les savoirs. À une époque où la connaissance est souvent sectorisée, nous croyons fermement à la richesse de la pluridisciplinarité.</p><h3>Nos Axes Fondateurs</h3><ul><li><strong>Sciences Humaines et Sociales :</strong> Réflexion philosophique, études juridiques et analyses des institutions publiques.</li><li><strong>Lettres et Culture :</strong> Valorisation du patrimoine linguistique, littéraire et des fondements culturels (le <em>faka</em>) de la société malgache.</li><li><strong>Vulgarisation et Partage :</strong> Rendre accessibles les concepts complexes pour stimuler la participation civique et intellectuelle.</li></ul>`,
    philo_travaux: `<h2>Travaux &amp; Lettres</h2><p>Cet espace sera la revue numérique de l'association. Nos membres y publieront régulièrement des articles de fond, des résumés de lectures de thèses, des essais juridiques et des chroniques philosophiques.</p><div class="editorial-card"><span class="editorial-card-tag">Prochainement</span><h4 class="editorial-card-title">Le rôle de la participation civique dans la gouvernance moderne</h4><p style="margin-bottom: 0; font-size: 1rem; color: var(--text-muted);">Une note d'analyse interdisciplinaire croisant le droit public, l'économie et la science politique.</p></div>`,
    philo_contact: `<h2>Contact &amp; Adhésion</h2><p>Vous souhaitez rejoindre l'association, soumettre un article pour la revue ou simplement échanger avec nous ? L'adhésion est entièrement libre et ouverte à toute personne partageant notre amour de l'étude.</p><form class="contact-form" id="contactForm"><div class="form-group"><label for="name">Nom complet</label><input type="text" id="name" name="name" required placeholder="Ex: Jean Rakoto"></div><div class="form-group"><label for="email">Adresse e-mail</label><input type="email" id="email" name="email" required placeholder="Ex: jean.rakoto@email.com"></div><div class="form-group"><label for="subject">Sujet de votre message</label><input type="text" id="subject" name="subject" required placeholder="Demande d'adhésion, proposition d'article..."></div><div class="form-group"><label for="message">Votre message</label><textarea id="message" name="message" required placeholder="Écrivez votre message ici..."></textarea></div><button type="submit" id="submitBtn">Envoyer le message</button></form><div class="form-feedback" id="formFeedback"></div><div class="contact-info"><p><strong>Secrétariat de l'Association</strong></p><p>Courriel : <span style="color: var(--accent); font-style: italic;">contact@association-philomatique-mg.org</span></p><p>Siège : Antananarivo, Madagascar</p></div>`,
    philo_hero_background: ''
};

function readMessages() {
    try {
        if (fs.existsSync(MESSAGES_FILE)) {
            return JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8'));
        }
    } catch (err) { console.error('Erreur lecture messages:', err); }
    return [];
}

function writeMessages(messages) {
    try {
        fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2));
    } catch (err) { console.error('Erreur écriture messages:', err); }
}

function readConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
            const parsed = JSON.parse(raw);
            for (const key in DEFAULT_CONFIG) {
                if (!(key in parsed)) parsed[key] = DEFAULT_CONFIG[key];
            }
            return parsed;
        }
    } catch (err) {
        console.error('Erreur lecture config, utilisation des valeurs par défaut:', err);
    }
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

function writeConfig(config) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
        console.log('✅ config.json sauvegardé');
    } catch (err) {
        console.error('❌ Erreur écriture config:', err);
        throw err;
    }
}

// ============================================================
// ROUTES API
// ============================================================

app.get('/api/messages', (req, res) => {
    res.json(readMessages());
});

app.post('/api/contact', (req, res) => {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
        return res.status(400).json({ error: 'Tous les champs sont requis.' });
    }
    const messages = readMessages();
    messages.push({
        id: Date.now(),
        type: 'contact',
        name,
        email,
        subject,
        message,
        date: new Date().toISOString(),
        read: false,
        source: 'contact'
    });
    writeMessages(messages);
    res.json({ success: true, message: 'Message envoyé !' });
});

app.put('/api/messages/:id/read', (req, res) => {
    const id = parseInt(req.params.id);
    const messages = readMessages();
    const index = messages.findIndex(m => m.id === id);
    if (index === -1) return res.status(404).json({ error: 'Message non trouvé.' });
    messages[index].read = true;
    writeMessages(messages);
    res.json({ success: true });
});

app.delete('/api/messages/:id', (req, res) => {
    const id = parseInt(req.params.id);
    let messages = readMessages();
    messages = messages.filter(m => m.id !== id);
    writeMessages(messages);
    res.json({ success: true });
});

app.delete('/api/messages', (req, res) => {
    writeMessages([]);
    res.json({ success: true });
});

app.get('/api/config', (req, res) => {
    try {
        const config = readConfig();
        res.json(config);
    } catch (err) {
        console.error('Erreur GET /api/config:', err);
        res.status(500).json({ error: 'Erreur lecture configuration' });
    }
});

app.post('/api/config', (req, res) => {
    try {
        const newConfig = req.body;
        const currentConfig = readConfig();
        const merged = { ...currentConfig, ...newConfig };
        writeConfig(merged);
        res.json({ success: true, message: 'Configuration sauvegardée.' });
    } catch (err) {
        console.error('❌ Erreur POST /api/config:', err);
        res.status(500).json({ error: 'Erreur sauvegarde configuration: ' + err.message });
    }
});

app.post('/api/upload-hero', upload.single('heroImage'), (req, res) => {
    console.log('📸 Fichier reçu :', req.file ? req.file.filename : 'Aucun fichier');
    if (!req.file) {
        return res.status(400).json({ error: 'Aucun fichier reçu' });
    }
    const imagePath = '/uploads/' + req.file.filename;
    console.log('✅ Chemin enregistré :', imagePath);
    try {
        const config = readConfig();
        config.philo_hero_background = imagePath;
        writeConfig(config);
        res.json({ success: true, imagePath });
    } catch (err) {
        console.error('Erreur sauvegarde config après upload:', err);
        res.status(500).json({ error: 'Erreur lors de la sauvegarde de la configuration' });
    }
});

// ============================================================
// PAGES PUBLIQUES
// ============================================================

app.get('/', (req, res) => {
    const config = readConfig();
    res.render('philo', {
        accueil: config.philo_accueil || DEFAULT_CONFIG.philo_accueil,
        presentation: config.philo_presentation || DEFAULT_CONFIG.philo_presentation,
        travaux: config.philo_travaux || DEFAULT_CONFIG.philo_travaux,
        contact: config.philo_contact || DEFAULT_CONFIG.philo_contact,
        heroBackground: config.philo_hero_background || '',
        title: 'Association Philomatique de Madagascar',
        description: 'L\'Association Philomatique de Madagascar réunit les passionnés des sciences, des lettres, du droit et de la culture.'
    });
});

app.get('/sitemap.xml', (req, res) => {
    res.type('application/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>https://www.association-philomatique-mg.org/</loc>
        <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>1.0</priority>
    </url>
</urlset>`);
});

app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.send(`User-agent: *
Allow: /
Sitemap: https://www.association-philomatique-mg.org/sitemap.xml`);
});

// ============================================================
// PAGE DE CONNEXION PERSONNALISÉE
// ============================================================

app.get('/login', (req, res) => {
    // Si déjà connecté, on redirige vers le dashboard
    if (req.session && req.session.isLoggedIn) {
        return res.redirect('/dashboard');
    }
    res.sendFile(path.join(__dirname, 'admin', 'login.html'));
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    // Identifiants : Latabatra / Latabatra
    if (username === 'Latabatra' && password === 'Latabatra') {
        req.session.isLoggedIn = true;
        req.session.username = username;
        res.json({ success: true, redirect: '/dashboard' });
    } else {
        res.status(401).json({ success: false, error: 'Identifiants incorrects.' });
    }
});

// ============================================================
// DASHBOARD (protégé par session)
// ============================================================

app.get('/dashboard', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'dashboard.html'));
});

// ============================================================
// DÉCONNEXION (optionnelle)
// ============================================================

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// ============================================================
// DÉMARRAGE
// ============================================================

app.listen(PORT, () => {
    console.log(`✅ Serveur lancé sur http://localhost:${PORT}`);
    console.log(`📂 Page Philo : http://localhost:${PORT}/`);
    console.log(`🔐 Login : http://localhost:${PORT}/login`);
    console.log(`📊 Dashboard : http://localhost:${PORT}/dashboard`);
    console.log(`📨 API Messages : http://localhost:${PORT}/api/messages`);
});