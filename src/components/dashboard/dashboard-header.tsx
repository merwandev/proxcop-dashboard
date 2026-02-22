"use client";

import { useState, useEffect } from "react";

interface DashboardHeaderProps {
  userName: string;
}

export function DashboardHeader({ userName }: DashboardHeaderProps) {
  const [time, setTime] = useState<string>("");
  const [seconds, setSeconds] = useState<string>("");
  const [temperature, setTemperature] = useState<string | null>(null);
  const [weatherIcon, setWeatherIcon] = useState<string>("☀️");

  // Real-time clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const h = now.getHours().toString().padStart(2, "0");
      const m = now.getMinutes().toString().padStart(2, "0");
      const s = now.getSeconds().toString().padStart(2, "0");
      setTime(`${h}:${m}`);
      setSeconds(s);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Weather from geolocation + Open-Meteo (free, no API key)
  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`
          );
          const data = await res.json();
          if (data.current) {
            setTemperature(`${Math.round(data.current.temperature_2m)}°`);
            setWeatherIcon(getWeatherIcon(data.current.weather_code));
          }
        } catch {
          // Silently fail — weather is optional
        }
      },
      () => {
        // Geolocation denied — try IP-based location
        fetchWeatherByIP();
      },
      { timeout: 5000 }
    );
  }, []);

  const fetchWeatherByIP = async () => {
    try {
      // Use Open-Meteo geocoding with Paris as fallback (most users are French)
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=48.8566&longitude=2.3522&current=temperature_2m,weather_code&timezone=auto`
      );
      const data = await res.json();
      if (data.current) {
        setTemperature(`${Math.round(data.current.temperature_2m)}°`);
        setWeatherIcon(getWeatherIcon(data.current.weather_code));
      }
    } catch {
      // Weather unavailable
    }
  };

  const greeting = getGreeting();
  const firstName = userName?.split(" ")[0] ?? userName;

  return (
    <div className="flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="ProxStock"
        width={40}
        height={40}
        className="rounded-xl flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold lg:text-2xl truncate">
            {greeting} {firstName} 👋
          </h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-mono tabular-nums">
            {time}<span className="text-muted-foreground/50">:{seconds}</span>
          </span>
          {temperature && (
            <>
              <span className="text-muted-foreground/30">·</span>
              <span>{weatherIcon} {temperature}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "Bonne nuit";
  if (hour < 12) return "Bonjour";
  if (hour < 18) return "Bon apres-midi";
  return "Bonsoir";
}

function getWeatherIcon(code: number): string {
  // WMO Weather interpretation codes
  if (code === 0) return "☀️";
  if (code <= 3) return "⛅";
  if (code <= 49) return "🌫️";
  if (code <= 59) return "🌧️";
  if (code <= 69) return "🌨️";
  if (code <= 79) return "❄️";
  if (code <= 84) return "🌧️";
  if (code <= 94) return "🌩️";
  return "⛈️";
}
