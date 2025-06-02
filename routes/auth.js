import express from 'express';
import { openDb } from '../db.js';
import bcrypt from 'bcrypt';

const router = express.Router();

router.post('/signup', async (req, res) => {
    const { username, password } = req.body;
    const db = await openDb();
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
        const result = await db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
        req.session.user = { id: result.lastID, username };
        res.redirect('/questions');
    } catch (err) {
        res.send('Username already exists or error occurred.');
    } finally {
        await db.close();
    }
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const db = await openDb();
    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (user && await bcrypt.compare(password, user.password)) {
        req.session.user = { id: user.id, username: user.username };
        return res.redirect('/questions');
    } else {
        res.send('Invalid credentials');
    }
    await db.close();
});

export default router;