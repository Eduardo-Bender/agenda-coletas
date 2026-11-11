
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import db from "@/lib/db";

const appointmentSchema = z.object({
  clinic: z.string().trim().min(2, "Clínica é obrigatória").max(120),
  animal: z.string().trim().min(2, "Animal é obrigatório").max(120),
  exam_type: z.string().trim().min(2, "Tipo de exame é obrigatório").max(120),
  scheduled_at: z
    .string()
    .min(1, "Data da coleta é obrigatória")
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: "Data da coleta inválida",
    }),
  status: z.enum(["SCHEDULED", "COLLECTED", "CANCELLED"]).default("SCHEDULED"),
  observations: z
    .string()
    .trim()
    .max(500, "Observações devem ter no máximo 500 caracteres")
    .optional()
    .transform((value) => (value ? value : null)),
});

const updateAppointmentSchema = appointmentSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Informe ao menos um campo para atualizar.",
  });

type AppointmentRecord = {
  id: number;
  clinic: string;
  animal: string;
  exam_type: string;
  scheduled_at: string;
  status: "SCHEDULED" | "COLLECTED" | "CANCELLED";
  observations: string | null;
  created_at: string;
  updated_at: string;
};

function listAppointments() {
  return db
    .prepare(
      `
        SELECT *
        FROM appointments
        ORDER BY scheduled_at ASC
      `
    )
    .all() as AppointmentRecord[];
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  if (url.searchParams.get("mode") === "appointments") {
    if (!(await getCurrentUser())) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    return NextResponse.json(listAppointments());
  }

  try {
    const result = db.prepare("SELECT sqlite_version() AS version").get() as {
      version: string;
    };

    return NextResponse.json({
      status: "OK",
      message: "Banco de dados conectado!",
      sqliteVersion: result.version,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Erro ao conectar ao banco de dados" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!(await getCurrentUser())) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (!body || body.mode !== "appointments") {
      return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
    }

    const parsed = appointmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message ?? "Dados inválidos",
        },
        { status: 400 }
      );
    }

    const data = parsed.data;

    const result = db
      .prepare(
        `
          INSERT INTO appointments (
            clinic,
            animal,
            exam_type,
            scheduled_at,
            status,
            observations,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `
      )
      .run(
        data.clinic,
        data.animal,
        data.exam_type,
        data.scheduled_at,
        data.status,
        data.observations
      );

    const created = db
      .prepare("SELECT * FROM appointments WHERE id = ?")
      .get(result.lastInsertRowid) as AppointmentRecord;

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar agendamento", error);

    return NextResponse.json(
      {
        error: "Não foi possível criar o agendamento.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  if (!(await getCurrentUser())) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  try {
    const url = new URL(request.url);

    if (url.searchParams.get("mode") !== "appointments") {
      return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
    }

    const id = Number(url.searchParams.get("id"));

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = updateAppointmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message ?? "Dados inválidos",
        },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const fields = Object.entries(data).filter(([, value]) => value !== undefined);

    if (fields.length === 0) {
      return NextResponse.json({ error: "Informe ao menos um campo para atualizar." }, { status: 400 });
    }

    const sets = fields.map(([key]) => `${key} = ?`);
    const values = fields.map(([, value]) => value);

    db.prepare(
      `
        UPDATE appointments
        SET ${sets.join(", ")}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
    ).run(...values, id);

    const updated = db
      .prepare("SELECT * FROM appointments WHERE id = ?")
      .get(id) as AppointmentRecord;

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Erro ao atualizar agendamento", error);

    return NextResponse.json(
      {
        error: "Não foi possível atualizar o agendamento.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  if (!(await getCurrentUser())) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  try {
    const url = new URL(request.url);

    if (url.searchParams.get("mode") !== "appointments") {
      return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
    }

    const id = Number(url.searchParams.get("id"));

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const deleted = db.prepare("DELETE FROM appointments WHERE id = ?").run(id);

    if (deleted.changes === 0) {
      return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Erro ao remover agendamento", error);

    return NextResponse.json(
      {
        error: "Não foi possível remover o agendamento.",
      },
      { status: 500 }
    );
  }
}
