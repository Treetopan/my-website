"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useAdmin } from "@/lib/admin";

/**
 * The username in the top bar, and what is behind it.
 *
 * The name was already the one piece of the header that names the account, so
 * it becomes the way into everything that belongs to it: the profile, the admin
 * area if there is one, and signing out. Signing out moves in here with them
 * rather than staying outside — a bar with a menu and a stray button beside it
 * reads as two places to look for the same thing.
 *
 * The Admin item is absent, not disabled, for everybody else. A disabled door
 * still tells you there is a room.
 */
export function AccountMenu() {
  const { username, signOut } = useAuth();
  const { isAdmin } = useAdmin();

  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  // Closed by anything that means "I'm done here": a press outside it, Escape,
  // or following one of its own links. Listening on pointerdown rather than
  // click so the menu is gone before whatever was pressed underneath reacts.
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((was) => !was)}
        className={`flex items-center gap-1.5 rounded-sm px-1.5 py-1 font-mono text-[11px] transition-colors ${
          open ? "text-ink" : "text-muted hover:text-ink"
        }`}
      >
        {username ?? "—"}
        <span
          aria-hidden="true"
          className={`text-[8px] transition-transform duration-150 ${
            open ? "rotate-180" : ""
          }`}
        >
          ▼
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="box absolute right-0 z-50 mt-2 flex w-44 flex-col py-1.5 shadow-[0_6px_24px_rgb(34_31_58/0.12)]"
        >
          <Item href="/profile" onDone={() => setOpen(false)}>
            Profile
          </Item>

          {isAdmin && (
            <Item href="/admin" onDone={() => setOpen(false)}>
              Admin
            </Item>
          )}

          <span className="my-1.5 h-px bg-line-soft" aria-hidden="true" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              signOut();
            }}
            className="px-3.5 py-2 text-left text-[13.5px] text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function Item({
  href,
  onDone,
  children,
}: {
  href: string;
  onDone: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onDone}
      className="px-3.5 py-2 text-[13.5px] text-muted transition-colors hover:bg-surface-2 hover:text-ink"
    >
      {children}
    </Link>
  );
}
