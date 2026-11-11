"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type AppointmentStatus = "SCHEDULED" | "COLLECTED" | "CANCELLED";

type Appointment = {
  id: number;
  clinic: string;
  animal: string;
  exam_type: string;
  scheduled_at: string;
  status: AppointmentStatus;
  observations: string | null;
  created_at: string;
  updated_at: string;
};

function createInitialForm() {
  return {
    clinic: "",
    animal: "",
    exam_type: "",
    scheduled_at: getNextDateTime(),
    status: "SCHEDULED" as AppointmentStatus,
    observations: "",
  };
}

function getNextDateTime() {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 30);
  now.setSeconds(0, 0);
  return toLocalDateTimeInput(now);
}

function getCurrentDateTime() {
  const now = new Date();
  if (now.getSeconds() > 0 || now.getMilliseconds() > 0) {
    now.setMinutes(now.getMinutes() + 1);
  }
  now.setSeconds(0, 0);
  return toLocalDateTimeInput(now);
}

function toLocalDateTimeInput(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function Home() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [form, setForm] = useState(createInitialForm);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  async function handleLogout() {
    const response = await fetch("/api/auth/logout", { method: "POST" });

    if (!response.ok) {
      setError("Não foi possível encerrar a sessão.");
      return;
    }

    router.replace("/login");
  }

  async function loadAppointments() {
    const response = await fetch("/api/health?mode=appointments");

    if (!response.ok) {
      throw new Error("Não foi possível carregar as coletas.");
    }

    const data = (await response.json()) as Appointment[];
    setAppointments(data);
  }

  useEffect(() => {
    let isMounted = true;

    fetch("/api/health?mode=appointments")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Não foi possível carregar as coletas.");
        }

        return (await response.json()) as Appointment[];
      })
      .then((data) => {
        if (isMounted) {
          setAppointments(data);
        }
      })
      .catch((loadError: unknown) => {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : "Erro ao carregar agenda.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const response = await fetch("/api/health", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: "appointments",
        ...form,
        scheduled_at: new Date(form.scheduled_at).toISOString(),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Não foi possível agendar a coleta.");
      return;
    }

    setForm(createInitialForm());
    await loadAppointments();
  }

  async function handleStatusChange(id: number, status: AppointmentStatus) {
    const response = await fetch(`/api/health?mode=appointments&id=${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Não foi possível atualizar o status.");
      return;
    }

    await loadAppointments();
  }

  async function handleDelete(id: number) {
    const response = await fetch(`/api/health?mode=appointments&id=${id}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Não foi possível remover a coleta.");
      return;
    }

    await loadAppointments();
  }

  const totalSCHEDULED = appointments.filter((item) => item.status === "SCHEDULED").length;
  const totalCOLLECTED = appointments.filter((item) => item.status === "COLLECTED").length;
  const totalCANCELLED = appointments.filter((item) => item.status === "CANCELLED").length;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <header className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 p-6 text-white shadow-lg shadow-emerald-950/20">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-100">Agenda de coletas</p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Controle de coletas veterinárias</h1>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl border border-white/40 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Sair
          </button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Agendadas</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{totalSCHEDULED}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Coletadas</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">{totalCOLLECTED}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Canceladas</p>
          <p className="mt-2 text-3xl font-bold text-red-500">{totalCANCELLED}</p>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[420px_1fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-xl font-semibold text-slate-900">Novo agendamento</h2>

          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Clínica</label>
              <input
                required
                value={form.clinic}
                onChange={(event) => setForm({ ...form, clinic: event.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                placeholder="Clínica Vida Animal"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Animal</label>
              <input
                required
                value={form.animal}
                onChange={(event) => setForm({ ...form, animal: event.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                placeholder="Luna"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Tipo de exame</label>
              <input
                required
                value={form.exam_type}
                onChange={(event) => setForm({ ...form, exam_type: event.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                placeholder="Hemograma completo"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Data e hora</label>
              <input
                required
                type="datetime-local"
                min={getCurrentDateTime()}
                value={form.scheduled_at}
                onChange={(event) => setForm({ ...form, scheduled_at: event.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm({
                    ...form,
                    status: event.target.value as AppointmentStatus,
                  })
                }
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              >
                <option value="SCHEDULED">Agendada</option>
                <option value="COLLECTED">Coletada</option>
                <option value="CANCELLED">Cancelada</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Observações</label>
              <textarea
                value={form.observations}
                onChange={(event) => setForm({ ...form, observations: event.target.value })}
                rows={4}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                placeholder="Instruções especiais, jejum, etc."
              />
            </div>

            {error ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-medium text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              Salvar agendamento
            </button>
          </div>
        </form>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-slate-900">Coletas agendadas</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
              {appointments.length} itens
            </span>
          </div>

          {isLoading ? (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Carregando agenda...
            </div>
          ) : appointments.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-600">
              Nenhuma coleta cadastrada.
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {appointments.map((appointment) => (
                <article
                  key={appointment.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">{appointment.animal}</p>
                      <p className="text-sm text-slate-600">{appointment.clinic}</p>
                    </div>
                    <span
                      className={
                        appointment.status === "SCHEDULED"
                          ? "rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700"
                          : appointment.status === "COLLECTED"
                            ? "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700"
                            : "rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700"
                      }
                    >
                      {appointment.status === "SCHEDULED"
                        ? "Agendada"
                        : appointment.status === "COLLECTED"
                          ? "Coletada"
                          : "Cancelada"}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1 text-sm text-slate-600">
                    <p>
                      <span className="font-medium">Exame:</span> {appointment.exam_type}
                    </p>
                    <p>
                      <span className="font-medium">Data:</span> {formatDate(appointment.scheduled_at)}
                    </p>
                    {appointment.observations ? (
                      <p>
                        <span className="font-medium">Obs.:</span> {appointment.observations}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleStatusChange(appointment.id, "COLLECTED")}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                    >
                      Coletada
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(appointment.id, "CANCELLED")}
                      className="rounded-lg bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(appointment.id)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Excluir
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
