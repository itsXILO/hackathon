import express from 'express';
import bodyParser from 'body-parser';
import session from 'express-session'; // Add this
import authRoutes from './routes/auth.js';
import { initDb, openDb } from './db.js';

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.set('views', './views');

// Add session middleware
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false
}));

// Middleware to make user info available in all views
app.use((req, res, next) => {
    res.locals.currentUser = req.session.user;
    next();
});

// Middleware to require login
function requireLogin(req, res, next) {
    if (!req.session.user) {
        return res.status(401).send('You must be logged in to perform this action.');
    }
    next();
}

// Update /questions to join with users for usernames
app.get('/questions', async (req, res) => {
    const db = await openDb();
    // Join with users to get question author's username
    const questions = await db.all(`
        SELECT q.*, u.username as author
        FROM questions q
        LEFT JOIN users u ON q.user_id = u.id
    `);
    for (let q of questions) {
        // Join with users to get answer author's username
        q.answers = await db.all(`
            SELECT a.*, u.username as author
            FROM answers a
            LEFT JOIN users u ON a.user_id = u.id
            WHERE a.question_id = ?
        `, [q.id]);
    }
    await db.close();
    res.render('questions', { questions });
});

// Protect POST /questions and POST /questions/:id/answer
app.post('/questions', requireLogin, async (req, res) => {
    const { question } = req.body;
    const db = await openDb();
    const userId = req.session.user ? req.session.user.id : null;
    await db.run('INSERT INTO questions (user_id, question) VALUES (?, ?)', [userId, question]);
    await db.close();
    res.redirect('/questions');
});

app.post('/questions/:id/answer', requireLogin, async (req, res) => {
    const { id } = req.params;
    const { answer } = req.body;
    const db = await openDb();
    const userId = req.session.user ? req.session.user.id : null;
    await db.run('INSERT INTO answers (question_id, user_id, answer, votes) VALUES (?, ?, ?, ?)', [id, userId, answer, 0]);
    await db.close();
    res.redirect('/questions');
});

app.post('/questions/:qid/answers/:aid/upvote', async (req, res) => {
    const { aid } = req.params;
    const db = await openDb();
    await db.run('UPDATE answers SET votes = votes + 1 WHERE id = ?', [aid]);
    await db.close();
    res.redirect('/questions');
});

app.post('/clear-db', async (req, res) => {
    const db = await openDb();
    // Disable foreign key checks to allow truncation
    await db.run('PRAGMA foreign_keys = OFF');
    await db.run('DELETE FROM answers');
    await db.run('DELETE FROM questions');
    await db.run('DELETE FROM users');
    // Reset auto-increment counters for SQLite
    await db.run('DELETE FROM sqlite_sequence WHERE name IN ("users", "questions", "answers")');
    await db.run('PRAGMA foreign_keys = ON');
    await db.close();
    res.send('Database cleared!');
});

app.post('/delete-all-qa', async (req, res) => {
    const db = await openDb();
    // Disable foreign key checks to allow truncation
    await db.run('PRAGMA foreign_keys = OFF');
    await db.run('DELETE FROM answers');
    await db.run('DELETE FROM questions');
    // Reset auto-increment counters for SQLite
    await db.run('DELETE FROM sqlite_sequence WHERE name IN ("questions", "answers")');
    await db.run('PRAGMA foreign_keys = ON');
    await db.close();
    res.send('All questions and answers deleted!');
});

app.use('/', authRoutes);

app.get("/", (req, res) => {
    res.render('index');
});

app.get("/learn", (req, res) => {
    res.render('main');
});

app.get("/login", (req, res) => {
    res.render('auth');
});

// Add error handling to the async IIFE
(async () => {
    try {
        console.log('Initializing database...');
        await initDb(); // Make sure this runs before your app starts
        console.log('Database initialized.');

        app.listen(port, () => {
            console.log(`running on ${port}`);
        });
    } catch (err) {
        console.error('Failed to initialize the database or start the server:', err);
        if (err && err.stack) {
            console.error(err.stack);
        }
        process.exit(1);
    }
})();