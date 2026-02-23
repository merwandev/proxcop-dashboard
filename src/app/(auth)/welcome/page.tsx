"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function WelcomePage() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger fade-in
    const showTimeout = setTimeout(() => setVisible(true), 100);

    // Redirect after animation
    const redirectTimeout = setTimeout(() => {
      router.replace("/dashboard");
    }, 2500);

    return () => {
      clearTimeout(showTimeout);
      clearTimeout(redirectTimeout);
    };
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div
        className={`flex flex-col items-center gap-6 transition-all duration-700 ${
          visible ? "opacity-100 scale-100" : "opacity-0 scale-95"
        }`}
      >
        {/* Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="ProxStock"
          width={80}
          height={80}
          className="rounded-full"
        />

        {/* Welcome text */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Bienvenue sur ProxStock</h1>
          <p className="text-muted-foreground text-sm">
            Connexion reussie, redirection en cours...
          </p>
        </div>

        {/* Loading spinner */}
        <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );
}
