"use client";

import React, { useEffect, useState } from "react";
import CampusNavbar from "../../components/CampusNavbar";
import { useCampus } from "../../context/CampusContext";
import { useRouter } from "next/navigation";

const url = process.env.NEXT_PUBLIC_API_URL;

const defaultSchedule = {
  breakfast: { start: "06:00", end: "09:00", label: "06:00 - 09:00" },
  lunch: { start: "11:00", end: "14:00", label: "11:00 - 14:00" },
  dinner: { start: "17:00", end: "20:00", label: "17:00 - 20:00" },
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
    <div className="page-shell flex h-screen flex-col overflow-hidden bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <CampusNavbar />

      <main className="flex-1 overflow-y-auto px-4 pb-10 pt-24 md:px-8">
        <div className="mx-auto max-w-6xl">
          <section className="surface-panel rounded-[28px] p-6 md:p-8 mb-6">
            <p className="text-sm font-black uppercase tracking-[0.35em] text-cyan-600 dark:text-cyan-400">
              Campus Control
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl text-slate-900 dark:text-white">
              Meal Time Controller
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400 md:text-base leading-relaxed">
              Configure the breakfast, lunch, and dinner operational hours for your campus.
              Card validations, student scanning terminal access, and dashboard charts utilize this window setup.
            </p>
          </section>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {mealCards.map((meal) => (
                <div key={meal.key} className="surface-card rounded-[28px] p-6 shadow-sm border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-transform hover:-translate-y-1">
                  <div
                    className={`inline-flex rounded-2xl bg-gradient-to-r px-4 py-2 text-sm font-bold text-white ${meal.accent}`}
                  >
                    {meal.title}
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {meal.accent.description}
                    {meal.description}
                  </p>

                  <div className="mt-6 space-y-4">
                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Start time
                      </span>
                      <input
                        type="time"
                        value={schedule[meal.key]?.start || ""}
                        onChange={(event) =>
                          handleChange(meal.key, "start", event.target.value)
                        }
                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 px-4 py-3 outline-none transition focus:border-blue-500 dark:bg-slate-950 dark:focus:bg-slate-950 text-sm"
                        required
                        disabled={loading || saving}
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        End time
                      </span>
                      <input
                        type="time"
                        value={schedule[meal.key]?.end || ""}
                        onChange={(event) =>
                          handleChange(meal.key, "end", event.target.value)
                        }
                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 px-4 py-3 outline-none transition focus:border-blue-500 dark:bg-slate-950 dark:focus:bg-slate-950 text-sm"
                        required
                        disabled={loading || saving}
                      />
                    </label>
                  </div>

                  <div className="mt-5 rounded-2xl bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm text-slate-600 dark:text-slate-400 ring-1 ring-slate-200 dark:ring-slate-800 font-medium">
                    Current window: {schedule[meal.key]?.label || `${schedule[meal.key]?.start} - ${schedule[meal.key]?.end}`}
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
      </main>
    </div>
  );
}
