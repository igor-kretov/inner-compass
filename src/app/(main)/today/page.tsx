"use client";

import { useEffect, useRef, useState } from "react";

import { SimpleDayPlanner } from "@/components/planner/simple-day-planner";
import { localDateKey, shiftLocalDate, useAppStore } from "@/lib/app-store";

function initialPlanDate() {
  const now = new Date();
  const today = localDateKey(now);
  return now.getHours() >= 17 ? shiftLocalDate(today, 1) : today;
}

export default function TodayPage() {
  const { ready } = useAppStore();
  const [selectedDate, setSelectedDate] = useState(initialPlanDate);
  const followsEveningPreference = useRef(true);

  useEffect(() => {
    const refreshSelectedDay = () => {
      if (!followsEveningPreference.current) return;
      setSelectedDate(initialPlanDate());
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshSelectedDay();
    };
    const interval = window.setInterval(refreshSelectedDay, 60_000);
    window.addEventListener("focus", refreshSelectedDay);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshSelectedDay);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  if (!ready) {
    return (
      <div className="mx-auto grid w-full max-w-[44rem] gap-4" aria-busy="true" aria-label="Tagesplan wird geladen">
        <div className="h-11 animate-pulse rounded-2xl bg-surface-muted motion-reduce:animate-none" />
        <div className="h-32 animate-pulse rounded-card bg-surface-muted motion-reduce:animate-none" />
      </div>
    );
  }

  return (
    <SimpleDayPlanner
      key={selectedDate}
      selectedDate={selectedDate}
      onSelectDate={(date) => {
        followsEveningPreference.current = false;
        setSelectedDate(date);
      }}
    />
  );
}
