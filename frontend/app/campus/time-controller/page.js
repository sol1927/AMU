"use client";

import React, { useEffect, useState } from "react";
import CampusNavbar from "../../components/CampusNavbar";
import { useCampus } from "../../context/CampusContext";
import { useRouter } from "next/navigation";

const url = process.env.NEXT_PUBLIC_API_URL;

const defaultSchedule = {
  breakfast: { start: "", end: "", label: "--:-- - --:--" },
  lunch: { start: "", end: "", label: "--:-- - --:--" },
  dinner: { start: "", end: "", label: "--:-- - --:--" },
};

const mealCards = [
  {
    key: "breakfast",
    title: "Breakfast",
    description: "Students can scan only inside this breakfast window.",
    accent: "from-amber-400 to-orange-500",
  },
  {
    key: "lunch",
    title: "Lunch",
    description: "Use this range to control the lunch session for your campus.",
    accent: "from-cyan-500 to-blue-600",
  },
  {
    key: "dinner",
    title: "Dinner",
    description: "Dinner scanning and dashboard status follow this saved time.",
    accent: "from-emerald-500 to-teal-600",
  },
];

export default function CampusTimeControllerPage() {
  const router = useRouter();
  const { currentCampus, loading: campusLoading } = useCampus();
  const [schedule, setSchedule] = useState(defaultSchedule);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!campusLoading && !currentCampus) {
      router.replace("/");
    }
  }, [currentCampus, campusLoading, router]);

  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(() => setMessage(""), 3000);
    return () => clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (!error) return undefined;
    const timer = setTimeout(() => setError(""), 3000);
    return () => clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    if (!currentCampus) return;

    const fetchSchedule = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${url}/campus/schedule`, {
          credentials: "include",
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Failed to load meal schedule");
        }

        setSchedule(data.schedule || defaultSchedule);
      } catch (err) {
        setError(err.message || "Failed to load meal schedule");
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [currentCampus]);

  const handleChange = (mealType, field, value) => {
    setSchedule((prev) => ({
      ...prev,
      [mealType]: {
        ...prev[mealType],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const payload = {
        breakfast: {
          start: schedule.breakfast.start,
          end: schedule.breakfast.end,
        },
        lunch: {
          start: schedule.lunch.start,
          end: schedule.lunch.end,
        },
        dinner: {
          start: schedule.dinner.start,
          end: schedule.dinner.end,
        },
      };

      const res = await fetch(`${url}/campus/schedule`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to save meal schedule");
      }

      setSchedule(data.schedule || defaultSchedule);
      setMessage(data.message || "Meal schedule updated successfully.");
    } catch (err) {
      setError(err.message || "Failed to save meal schedule");
    } finally {
      setSaving(false);
    }
  };

  if (campusLoading || !currentCampus) {
    return (
      <div className="page-shell flex h-screen w-full items-center justify-center">
        <div className="relative">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600 shadow-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <CampusNavbar />
      <div className="page-shell min-h-screen px-4 pb-12 pt-24 md:px-8">
        <div className="mx-auto max-w-6xl">
          <section className="surface-card rounded-3xl p-5 mb-6">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Campus Control
              </span>
              <h1 className="text-2xl font-extrabold tracking-tight text-blue-600 dark:text-blue-400 leading-tight">
                Meal Time Controller
              </h1>
              <p className="mt-1 text-xs text-[var(--app-text-soft)] max-w-2xl">
                Configure operational hours for breakfast, lunch, and dinner
                scanning windows.
              </p>
            </div>
          </section>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {mealCards.map((meal) => (
                <div
                  key={meal.key}
                  className="surface-card rounded-[28px] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500"
                >
                  <div
                    className={`inline-flex rounded-2xl bg-gradient-to-r px-4 py-2 text-sm font-bold text-white ${meal.accent}`}
                  >
                    {meal.title}
                  </div>
                  <p className="mt-4 text-sm leading-6 text-[var(--app-text-muted)]">
                    {meal.description}
                  </p>

                  <div className="mt-6 space-y-4">
                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold text-[var(--app-text-soft)] uppercase tracking-wider">
                        Start time
                      </span>
                      <input
                        type="time"
                        value={schedule[meal.key]?.start || ""}
                        onChange={(event) =>
                          handleChange(meal.key, "start", event.target.value)
                        }
                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 outline-none transition focus:border-blue-500 text-sm text-[var(--app-text)] font-medium"
                        required
                        disabled={loading || saving}
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold text-[var(--app-text-soft)] uppercase tracking-wider">
                        End time
                      </span>
                      <input
                        type="time"
                        value={schedule[meal.key]?.end || ""}
                        onChange={(event) =>
                          handleChange(meal.key, "end", event.target.value)
                        }
                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 outline-none transition focus:border-blue-500 text-sm text-[var(--app-text)] font-medium"
                        required
                        disabled={loading || saving}
                      />
                    </label>
                  </div>

                  <div className="mt-5 rounded-2xl bg-white dark:bg-slate-950 px-4 py-3 text-sm text-[var(--app-text-muted)] border border-slate-200/50 dark:border-slate-800/50 font-medium">
                    Current window:{" "}
                    {schedule[meal.key]?.label ||
                      `${schedule[meal.key]?.start} - ${schedule[meal.key]?.end}`}
                  </div>
                </div>
              ))}
            </div>

            {(message || error) && (
              <div
                className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
                  error
                    ? "border border-red-200 bg-red-50 text-red-700 dark:border-red-950/20 dark:bg-red-950/20 dark:text-red-400"
                    : "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-950/20 dark:bg-emerald-950/20 dark:text-emerald-400"
                }`}
              >
                {error || message}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading || saving}
                className="inline-flex items-center justify-center rounded-2xl bg-blue-600 hover:bg-blue-700 px-6 py-3.5 text-sm font-bold text-white transition hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 shadow-lg shadow-blue-500/20"
              >
                {saving
                  ? "Saving..."
                  : loading
                    ? "Loading..."
                    : "Save Meal Times"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
