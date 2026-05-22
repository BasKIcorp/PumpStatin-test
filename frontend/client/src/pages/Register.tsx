import React, { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Register() {
  const { register } = useAuth();
  const [, navigate] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(email, password, name);
      navigate("/account");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Ошибка регистрации");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 text-foreground">
      <Card className="w-full max-w-md border-border bg-card shadow-lg ring-1 ring-[color-mix(in_srgb,var(--funnel-accent)_20%,transparent)]">
        <CardContent className="p-8">
          <div className="flex justify-center mb-6">
            <img src="/assets/logo.png" alt="Logo" className="h-12 object-contain" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-center text-foreground mb-6 tracking-wide uppercase">
            Регистрация
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="reg-name">Имя</Label>
              <Input
                id="reg-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Иван Иванов"
                className="bg-[var(--funnel-input-bg)]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reg-email">Email</Label>
              <Input
                id="reg-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="bg-[var(--funnel-input-bg)]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reg-password">Пароль</Label>
              <Input
                id="reg-password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Минимум 8 символов"
                className="bg-[var(--funnel-input-bg)]"
              />
            </div>

            {error ? <p className="text-destructive text-sm">{error}</p> : null}

            <Button type="submit" disabled={loading} className="w-full selection-work-btn-primary">
              {loading ? "Регистрация..." : "Зарегистрироваться"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Уже есть аккаунт?{" "}
            <a href="/account" className="text-primary hover:underline">
              Личный кабинет
            </a>
          </p>
          <p className="text-center text-sm text-muted-foreground mt-2">
            <a href="/" className="text-muted-foreground hover:text-foreground hover:underline">
              ← На главную
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
