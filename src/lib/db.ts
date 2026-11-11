
import path from "node:path";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";

// Diretório onde o banco será armazenado
const dataDir = path.join(process.cwd(), "data");

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "agenda.db");

// Evita criar várias conexões durante o Hot Reload do Next.js
const globalForDb = globalThis as typeof globalThis & {
    db?: DatabaseSync;
};

const db =
    globalForDb.db ??
    new DatabaseSync(dbPath);

// Configurações do SQLite
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

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

export function withImmediateTransaction<T>(operation: () => T): T {
    db.exec("BEGIN IMMEDIATE");

    try {
        const result = operation();
        db.exec("COMMIT");
        return result;
    } catch (error) {
        try {
            db.exec("ROLLBACK");
        } catch (rollbackError) {
            throw new AggregateError(
                [error, rollbackError],
                "A transação falhou e não foi possível revertê-la."
            );
        }

        throw error;
    }
}

export default db;
