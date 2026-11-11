
import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
    try {
        const result = db.prepare(
            "SELECT sqlite_version() AS version"
        ).get() as { version: string };

        return NextResponse.json({
            status: "OK",
            message: "Banco de dados conectado!",
            sqliteVersion: result.version
        });

    } catch (error) {
        console.error(error);

        return NextResponse.json(
            { error: "Erro ao conectar ao banco de dados" },
            { status: 500 }
        );
    }
}
