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

type StatusFilter = "ALL" | AppointmentStatus;

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

function getLocalDate(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

export default function Home({ accountEmail }: { accountEmail: string }) {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [clinicFilter, setClinicFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
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

  const filteredAppointments = appointments.filter((appointment) => {
    const matchesStatus = statusFilter === "ALL" || appointment.status === statusFilter;
    const matchesClinic = !clinicFilter || appointment.clinic === clinicFilter;
    const matchesDate =
      !dateFilter || getLocalDate(appointment.scheduled_at) === dateFilter;

    return matchesStatus && matchesClinic && matchesDate;
  });

  const clinics = [...new Set(appointments.map((appointment) => appointment.clinic))].sort(
    (first, second) => first.localeCompare(second, "pt-BR")
  );

  const statusCounts = {
    ALL: appointments.length,
    SCHEDULED: appointments.filter((item) => item.status === "SCHEDULED").length,
    COLLECTED: appointments.filter((item) => item.status === "COLLECTED").length,
    CANCELLED: appointments.filter((item) => item.status === "CANCELLED").length,
  };

  return (
    <div className="min-h-screen">
      <header className="w-full bg-gradient-to-r from-emerald-700 to-teal-600 text-white shadow-lg shadow-emerald-950/20">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Agenda de Coletas</h1>
            <p className="mt-1 text-sm text-emerald-100">Controle de coletas veterinárias</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-emerald-50 sm:inline">{accountEmail}</span>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-white/40 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
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
            <h2 className="text-xl font-semibold text-slate-900">Agendamentos</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
              {filteredAppointments.length} itens
            </span>
          </div>

          <div className="mt-5 space-y-4">
            <div className="flex flex-wrap gap-2" aria-label="Filtrar por status">
              {(
                [
                  ["ALL", "Todos"],
                  ["SCHEDULED", "Agendadas"],
                  ["COLLECTED", "Coletadas"],
                  ["CANCELLED", "Canceladas"],
                ] as const
              ).map(([status, label]) => (
                <button
                  key={status}
                  type="button"
                  aria-pressed={statusFilter === status}
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                    statusFilter === status
                      ? "border-emerald-700 bg-emerald-700 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {label} ({statusCounts[status]})
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="filter-date" className="mb-1 block text-sm font-medium text-slate-700">
                  Filtrar por data
                </label>
                <input
                  id="filter-date"
                  type="date"
                  value={dateFilter}
                  onChange={(event) => setDateFilter(event.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
              </div>
              <div>
                <label htmlFor="filter-clinic" className="mb-1 block text-sm font-medium text-slate-700">
                  Filtrar por clínica
                </label>
                <select
                  id="filter-clinic"
                  value={clinicFilter}
                  onChange={(event) => setClinicFilter(event.target.value)}
                  className="min-w-52 rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                >
                  <option value="">Todas as clínicas</option>
                  {clinics.map((clinic) => (
                    <option key={clinic} value={clinic}>
                      {clinic}
                    </option>
                  ))}
                </select>
              </div>
              {dateFilter ? (
                <button
                  type="button"
                  onClick={() => setDateFilter("")}
                  className="rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Limpar data
                </button>
              ) : null}
              {clinicFilter ? (
                <button
                  type="button"
                  onClick={() => setClinicFilter("")}
                  className="rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Limpar clínica
                </button>
              ) : null}
            </div>
          </div>

          {isLoading ? (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Carregando agenda...
            </div>
          ) : appointments.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-600">
              Nenhuma coleta cadastrada.
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-600">
              Nenhum agendamento corresponde aos filtros.
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {filteredAppointments.map((appointment) => (
                <article
                  key={appointment.id}
                  className={`relative rounded-2xl border p-4 ${
                    appointment.status === "SCHEDULED"
                      ? "border-slate-200 bg-slate-50"
                      : appointment.status === "CANCELLED"
                        ? "border-red-200 bg-red-50"
                        : "border-green-200 bg-green-50"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleDelete(appointment.id)}
                    aria-label={`Excluir agendamento de ${appointment.animal}`}
                    title="Excluir agendamento"
                    className="absolute right-3 top-3 rounded-lg p-2 text-slate-500 transition hover:bg-red-100 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-300"
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M10 11v6m4-6v6M5.5 7l1 13h11l1-13M9 7V4h6v3" />
                    </svg>
                  </button>

                  <div
                    className={`flex flex-wrap items-start justify-between gap-3 pr-10 ${
                      appointment.status === "SCHEDULED" ? "" : "text-slate-500"
                    }`}
                  >
                    <div>
                      <p
                        className={`text-lg font-semibold ${
                          appointment.status === "SCHEDULED" ? "text-slate-900" : "text-slate-500"
                        }`}
                      >
                        {appointment.animal}
                      </p>
                      <p className="text-sm">{appointment.clinic}</p>
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

                  <div
                    className={`mt-3 space-y-1 text-sm ${
                      appointment.status === "SCHEDULED" ? "text-slate-600" : "text-slate-500"
                    }`}
                  >
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

                  {appointment.status === "SCHEDULED" ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleStatusChange(appointment.id, "COLLECTED")}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                      >
                        Marcar como coletada
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(appointment.id, "CANCELLED")}
                        className="rounded-lg bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
      </main>
    </div>
  );
}
