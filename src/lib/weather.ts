"use client";

import { useEffect, useState } from "react";

export type WeatherKind = "clear" | "cloudy" | "wind" | "rain" | "storm" | "snow";

export const weatherKinds: readonly WeatherKind[] = ["clear", "cloudy", "wind", "rain", "storm", "snow"];

export const weatherLabels: Record<WeatherKind, string> = {
  clear: "Nắng",
  cloudy: "Nhiều mây",
  wind: "Gió",
  rain: "Mưa",
  storm: "Dông",
  snow: "Tuyết",
};

export type WeatherState = {
  kind: WeatherKind;
  temperature: number | null;
  status: "loading" | "ready" | "error";
  // Where the numbers came from: the device's position or the fallback city.
  place: "device" | "default";
};

// Hà Nội, used when the browser will not share its position.
const fallbackPosition = { latitude: 21.0285, longitude: 105.8542 };
const windyKmh = 25;
const refreshMs = 15 * 60 * 1000;

// WMO weather codes as reported by Open-Meteo.
export function kindFromReading(code: number, windKmh: number): WeatherKind {
  if (code >= 95) return "storm";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if (windKmh >= windyKmh) return "wind";
  if (code >= 2) return "cloudy";
  return "clear";
}

function getPosition(): Promise<{ latitude: number; longitude: number; place: "device" | "default" }> {
  return new Promise((resolve) => {
    const fallback = { ...fallbackPosition, place: "default" as const };
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(fallback);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          place: "device",
        }),
      () => resolve(fallback),
      { timeout: 8000, maximumAge: 30 * 60 * 1000 },
    );
  });
}

// `?weather=snow` in the address bar pins the scene, handy for previewing.
export function readWeatherOverride(): WeatherKind | null {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("weather");
  return weatherKinds.find((kind) => kind === value) ?? null;
}

export function useWeather(): WeatherState {
  const [state, setState] = useState<WeatherState>({
    kind: "clear",
    temperature: null,
    status: "loading",
    place: "default",
  });

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const load = async () => {
      const { latitude, longitude, place } = await getPosition();
      try {
        const url =
          "https://api.open-meteo.com/v1/forecast" +
          `?latitude=${latitude.toFixed(2)}&longitude=${longitude.toFixed(2)}` +
          "&current=temperature_2m,weather_code,wind_speed_10m&wind_speed_unit=kmh";
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(String(response.status));
        const data = await response.json();
        const current = data.current;
        if (cancelled) return;
        setState({
          kind: kindFromReading(Number(current.weather_code), Number(current.wind_speed_10m)),
          temperature: Math.round(Number(current.temperature_2m)),
          status: "ready",
          place,
        });
      } catch {
        if (cancelled) return;
        setState((previous) => ({ ...previous, status: previous.status === "ready" ? "ready" : "error", place }));
      }
    };

    void load();
    const interval = window.setInterval(() => void load(), refreshMs);
    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(interval);
    };
  }, []);

  return state;
}
