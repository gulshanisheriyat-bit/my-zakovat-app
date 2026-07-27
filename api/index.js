const express = require('express');
const cors = require('cors');
const { kv } = require('@vercel/kv');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const PACKAGES_KEY = 'packages_meta';

// Barcha paketlar ro‘yxati
app.get('/api/packages', async (req, res) => {
    try {
        const data = await kv.get(PACKAGES_KEY);
        res.json(data || []);
    } catch (e) {
        res.status(500).json({ error: 'Server xatosi' });
    }
});

// Bitta paketni olish
app.get('/api/packages/:id', async (req, res) => {
    try {
        const meta = await kv.get(PACKAGES_KEY) || [];
        const pkg = meta.find(p => p.id === req.params.id);
        if (!pkg) return res.status(404).json({ error: 'Paket topilmadi' });
        const content = await kv.get(`package_${req.params.id}`);
        if (!content) return res.status(404).json({ error: 'Paket mazmuni topilmadi' });
        res.json(content);
    } catch (e) {
        res.status(500).json({ error: 'Server xatosi' });
    }
});

// Yangi paket saqlash
app.post('/api/packages', async (req, res) => {
    try {
        const { packageName, questions } = req.body;
        if (!packageName || !questions || !questions.length) {
            return res.status(400).json({ error: 'Paket nomi va savollar majburiy' });
        }

        let meta = await kv.get(PACKAGES_KEY) || [];
        if (meta.some(p => p.name === packageName)) {
            return res.status(409).json({ error: 'Bu nomli paket avval yuklangan' });
        }

        const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        const newMeta = { id, name: packageName, createdAt: new Date().toISOString() };
        meta.push(newMeta);
        await kv.set(PACKAGES_KEY, meta);
        await kv.set(`package_${id}`, { packageName, questions });

        res.status(201).json({ message: 'Paket saqlandi', id });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server xatosi' });
    }
});

// Paketni o‘chirish
app.delete('/api/packages/:id', async (req, res) => {
    try {
        let meta = await kv.get(PACKAGES_KEY) || [];
        const idx = meta.findIndex(p => p.id === req.params.id);
        if (idx === -1) return res.status(404).json({ error: 'Paket topilmadi' });
        meta.splice(idx, 1);
        await kv.set(PACKAGES_KEY, meta);
        await kv.del(`package_${req.params.id}`);
        res.json({ message: 'Paket o‘chirildi' });
    } catch (e) {
        res.status(500).json({ error: 'Server xatosi' });
    }
});

module.exports = app;