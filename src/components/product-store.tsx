"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

const PAGE_SIZE = 50;
const PHONE_KEY = "store-phone";

type Product = {
  id: string;
  name: string;
  brand: string;
  price: string;
  stock: string;
  unit: string;
};

const PHONE_EVENT = "store-phone-change";

function subscribe(cb: () => void) {
  window.addEventListener(PHONE_EVENT, cb);
  return () => window.removeEventListener(PHONE_EVENT, cb);
}

function readPhone(): string | null {
  try {
    return localStorage.getItem(PHONE_KEY);
  } catch {
    return null;
  }
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function toProducts(text: string): Product[] {
  const [header, ...rows] = parseCsv(text.replace(/^﻿/, ""));
  const col = (n: string) => header.indexOf(n);
  const [id, name, brand, maker, price, stock, unit] = [
    "Item ID",
    "Item Name",
    "Brand",
    "Manufacturer",
    "Selling Price",
    "Stock On Hand",
    "Unit Name",
  ].map(col);
  return rows.map((r) => ({
    id: r[id] ?? "",
    name: r[name] ?? "",
    brand: r[brand] || r[maker] || "",
    price: r[price] ?? "",
    stock: r[stock] ?? "",
    unit: r[unit] ?? "",
  }));
}

function PhoneModal({ onSave }: { onSave: (phone: string) => void }) {
  const [value, setValue] = useState("");
  const valid = /^\d{10}$/.test(value);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="phone-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onSave(value);
        }}
        className="w-full max-w-sm space-y-4 rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-900"
      >
        <h2 id="phone-title" className="text-lg font-semibold">
          Ingresa tu número de teléfono
        </h2>
        <p className="text-sm text-zinc-500">
          Escribe tu número de 10 dígitos para ver los productos.
        </p>
        <input
          autoFocus
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={10}
          placeholder="5512345678"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
          className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 tracking-widest outline-none focus:border-zinc-500 dark:border-zinc-700"
        />
        <button
          type="submit"
          disabled={!valid}
          className="w-full rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white disabled:opacity-40 dark:bg-white dark:text-zinc-900"
        >
          Continuar
        </button>
      </form>
    </div>
  );
}

export function ProductStore() {
  const stored = useSyncExternalStore(subscribe, readPhone, () => undefined);
  const [saved, setSaved] = useState<string | null>(null);
  const phone = saved ?? stored ?? null;
  const ready = stored !== undefined;
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!phone) return;
    fetch("/store-product.csv")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.text();
      })
      .then((t) => setProducts(toProducts(t)))
      .catch(() => setError(true));
  }, [phone]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q)
    );
  }, [products, query]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  function savePhone(value: string) {
    try {
      localStorage.setItem(PHONE_KEY, value);
    } catch {}
    setSaved(value);
    window.dispatchEvent(new Event(PHONE_EVENT));
  }

  if (!ready) return null;
  if (!phone) return <PhoneModal onSave={savePhone} />;

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 space-y-4 p-4">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-xl font-semibold">Productos</h1>
        <span className="text-sm text-zinc-500">Tel: {phone}</span>
        <input
          type="search"
          placeholder="Buscar por nombre o marca…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm sm:w-72 dark:border-zinc-700"
        />
        <Link
          href="/login"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-zinc-900"
        >
          Iniciar sesión
        </Link>
      </header>

      {error ? (
        <p className="text-red-600">No se pudo cargar el catálogo.</p>
      ) : !products.length ? (
        <p className="text-zinc-500">Cargando…</p>
      ) : (
        <>
          <p className="text-sm text-zinc-500">
            {filtered.length} resultados
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {visible.map((p) => (
              <article
                key={p.id}
                className="flex flex-col gap-1 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
              >
                <h3 className="text-sm font-medium">{p.name}</h3>
                {p.brand && (
                  <p className="text-xs text-zinc-500">{p.brand}</p>
                )}
                <p className="mt-auto pt-2 font-semibold">{p.price}</p>
                <p className="text-xs text-zinc-500">
                  Stock: {p.stock || 0} {p.unit}
                </p>
              </article>
            ))}
          </div>
          <nav className="flex items-center justify-center gap-3 py-4 text-sm">
            <button
              onClick={() => setPage(current - 1)}
              disabled={current <= 1}
              className="rounded border border-zinc-300 px-3 py-1 disabled:opacity-40 dark:border-zinc-700"
            >
              Anterior
            </button>
            <span>
              Página {current} de {pages}
            </span>
            <button
              onClick={() => setPage(current + 1)}
              disabled={current >= pages}
              className="rounded border border-zinc-300 px-3 py-1 disabled:opacity-40 dark:border-zinc-700"
            >
              Siguiente
            </button>
          </nav>
        </>
      )}
    </main>
  );
}
