
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

// Diretório onde o banco será armazenado
const dataDir = path.join(process.cwd(), "data");

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "agenda.db");

// Evita criar várias conexões durante o Hot Reload do Next.js
const globalForDb = globalThis as unknown as {
    db: Database.Database | undefined;
};

const db =
    globalForDb.db ??
    new Database(dbPath);

// Configurações do SQLite
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Criação das tabelas
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        clinic TEXT NOT NULL,
        animal TEXT NOT NULL,
        exam_type TEXT NOT NULL,
        scheduled_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'SCHEDULED'
            CHECK (status IN ('SCHEDULED', 'COLLECTED', 'CANCELLED')),
        observations TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
`);

if (process.env.NODE_ENV !== "production") {
    globalForDb.db = db;
}

export default db;
