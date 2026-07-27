const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const DATA_DIR = path.join(__dirname, 'packages');
const META_FILE = path.join(__dirname, 'packages.json');

// Papka va meta-fayl mavjudligini tekshirish
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(META_FILE)) fs.writeFileSync(META_FILE, JSON.stringify([]));

// Barcha paketlarni olish (metamaʼlumot)
app.get('/api/packages', (req, res) => {
    try {
        const data = fs.readFileSync(META_FILE, 'utf-8');
        res.json(JSON.parse(data));
    } catch (e) {
        res.status(500).json({ error: 'Server xatosi' });
    }
});

// Bitta paketni olish (to‘liq)
app.get('/api/packages/:id', (req, res) => {
    try {
        const meta = JSON.parse(fs.readFileSync(META_FILE, 'utf-8'));
        const pkg = meta.find(p => p.id === req.params.id);
        if (!pkg) return res.status(404).json({ error: 'Paket topilmadi' });
        
        const filePath = path.join(DATA_DIR, pkg.filename);
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Fayl topilmadi' });
        
        const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        res.json(content);
    } catch (e) {
        res.status(500).json({ error: 'Server xatosi' });
    }
});

// Yangi paket saqlash
app.post('/api/packages', (req, res) => {
    try {
        const { packageName, questions } = req.body;
        if (!packageName || !questions || !questions.length) {
            return res.status(400).json({ error: 'Paket nomi va savollar majburiy' });
        }

        const meta = JSON.parse(fs.readFileSync(META_FILE, 'utf-8'));
        
        // Nom bo‘yicha takrorlanishni tekshirish
        if (meta.some(p => p.name === packageName)) {
            return res.status(409).json({ error: 'Bu nomli paket avval yuklangan' });
        }

        const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        const filename = `${id}.json`;
        const filePath = path.join(DATA_DIR, filename);

        // Maʼlumotni faylga yozish
        fs.writeFileSync(filePath, JSON.stringify({ packageName, questions }, null, 2));

        // Metamaʼlumotga qo‘shish
        const newMeta = { id, name: packageName, filename, createdAt: new Date().toISOString() };
        meta.push(newMeta);
        fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2));

        res.status(201).json({ message: 'Paket saqlandi', id });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server xatosi' });
    }
});

// Paketni o‘chirish (ixtiyoriy)
app.delete('/api/packages/:id', (req, res) => {
    try {
        const meta = JSON.parse(fs.readFileSync(META_FILE, 'utf-8'));
        const idx = meta.findIndex(p => p.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Paket topilmadi' });

        const pkg = meta[idx];
        const filePath = path.join(DATA_DIR, pkg.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        meta.splice(idx, 1);
        fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2));
        res.json({ message: 'Paket o‘chirildi' });
    } catch (e) {
        res.status(500).json({ error: 'Server xatosi' });
    }
});

app.listen(PORT, () => {
    console.log(`Server http://localhost:${PORT} da ishga tushdi`);
});