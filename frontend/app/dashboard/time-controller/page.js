"use client";

import React, { useEffect, useState } from "react";

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
    description:
      "Use this range to control the lunch session for the selected campus.",
    accent: "from-cyan-500 to-blue-600",
  },
  {
    key: "dinner",
    title: "Dinner",
    description: "Dinner scanning and dashboard status follow this saved time.",
    accent: "from-emerald-500 to-teal-600",
  },
];

export default function TimeControllerPage() {
  const [schedule, setSchedule] = useState(defaultSchedule);
  const [campuses, setCampuses] = useState([]);
  const [selectedCampus, setSelectedCampus] = useState(null);
  const [loadingCampuses, setLoadingCampuses] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!message) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setMessage("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (!error) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setError("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    const fetchCampuses = async () => {
      setLoadingCampuses(true);
      try {
        const res = await fetch(`${url}/dashboard/campuses`, {
          credentials: "include",
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Failed to load campuses");
        }

        if (Array.isArray(data.campuses)) {
          const sortedCampuses = [...data.campuses].sort((a, b) =>
            a.name.localeCompare(b.name),
          );

          setCampuses(sortedCampuses);
          if (sortedCampuses.length > 0) {
            setSelectedCampus(sortedCampuses[0]._id);
          }
        } else {
          throw new Error("Invalid campuses data");
        }
      } catch (err) {
        setError(err.message || "Failed to load campuses");
      } finally {
        setLoadingCampuses(false);
      }
    };

    fetchCampuses();
  }, []);

  useEffect(() => {
    if (!selectedCampus) {
      setLoading(false);
      setSchedule(defaultSchedule);
      return;
    }

    const fetchSchedule = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${url}/dashboard/meal-schedule/${selectedCampus}`,
          {
            credentials: "include",
          },
        );
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
  }, [selectedCampus]);

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

      const res = await fetch(
        `${url}/dashboard/meal-schedule/${selectedCampus}`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
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

  return (
    <div className="page-shell px-4 pb-10 pt-24 md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="surface-panel rounded-[28px] p-5 md:p-6">
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-300/80">
            Admin Control
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
            Meal Time Controller
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600 md:text-base">
            Set the breakfast, lunch, and dinner times for the selected campus.
            Campus scanning, dashboard session status, and meal history all use
            this saved schedule.
          </p>
        </section>

        <div className="mt-5">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Select Campus
            </span>
            <select
              value={selectedCampus || ""}
              onChange={(e) => setSelectedCampus(e.target.value)}
              className="field-surface w-full rounded-2xl px-4 py-3 outline-none transition focus:border-cyan-400"
              disabled={loadingCampuses || loading || saving}
            >
              {loadingCampuses ? (
                <option>Loading campuses...</option>
              ) : Array.isArray(campuses) && campuses.length > 0 ? (
                campuses.map((campus) => (
                  <option key={campus._id} value={campus._id}>
                    {campus.name}
                  </option>
                ))
              ) : (
                <option value="">No available campus</option>
              )}
            </select>
          </label>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {mealCards.map((meal) => (
              <div key={meal.key} className="surface-card rounded-[28px] p-6">
                <div
                  className={`inline-flex rounded-2xl bg-gradient-to-r px-4 py-2 text-sm font-bold text-white ${meal.accent}`}
                >
                  {meal.title}
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  {meal.description}
                </p>

                <div className="mt-6 space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Start time
                    </span>
                    <input
                      type="time"
                      value={schedule[meal.key]?.start || ""}
                      onChange={(event) =>
                        handleChange(meal.key, "start", event.target.value)
                      }
                      className="field-surface w-full rounded-2xl px-4 py-3 outline-none transition focus:border-cyan-400"
                      required
                      disabled={
                        loadingCampuses || loading || saving || !selectedCampus
                      }
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      End time
                    </span>
                    <input
                      type="time"
                      value={schedule[meal.key]?.end || ""}
                      onChange={(event) =>
                        handleChange(meal.key, "end", event.target.value)
                      }
                      className="field-surface w-full rounded-2xl px-4 py-3 outline-none transition focus:border-cyan-400"
                      required
                      disabled={
                        loadingCampuses || loading || saving || !selectedCampus
                      }
                    />
                  </label>
                </div>

                <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
                  Current window: {schedule[meal.key]?.label || "--:-- - --:--"}
                </div>
              </div>
            ))}
          </div>

          {(message || error) && (
            <div
              className={`rounded-2xl px-4 py-3 text-sm ${
                error
                  ? "border border-red-200 bg-red-50 text-red-700"
                  : "border border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {error || message}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loadingCampuses || loading || saving || !selectedCampus}
              className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : loading
                  ? "Loading..."
                  : !selectedCampus
                    ? "No available campus"
                    : "Save Meal Times"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
