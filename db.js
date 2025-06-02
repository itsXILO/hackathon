import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export async function openDb() {
    return open({
        filename: './database.db',
        driver: sqlite3.Database
    });
}

// Initialize tables if they don't exist
export async function initDb() {
    const db = await openDb();
    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT
        );
        CREATE TABLE IF NOT EXISTS questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            question TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS answers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question_id INTEGER,
            user_id INTEGER,
            answer TEXT,
            votes INTEGER DEFAULT 0,
            FOREIGN KEY(question_id) REFERENCES questions(id),
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
    `);
    await db.close();
}