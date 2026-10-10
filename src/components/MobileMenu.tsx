"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type NavItem = { href: string; label: string };

/*
 * Small-screen menu (hidden from 900px, where the inline nav takes over).
 * A disclosure, not a modal: Escape, a link or a tap outside closes it, focus moves into the panel on open and back to the button
 * when it is dismissed. The panel is a solid paper sheet (never backdrop-filter over the canvas) and only fades/slides,
 * which the global reduced-motion rule turns into a cut.
 */
export default function MobileMenu({ nav, cta }: { nav: readonly NavItem[]; cta: NavItem }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef(true);

  const close = useCallback((returnFocus: boolean) => {
    restoreFocus.current = returnFocus;
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const body = document.body;
    const button = buttonRef.current;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(true);
    };
    // the sheet doesn't cover the whole screen: a tap on the page below it dismisses it
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!panelRef.current?.contains(target) && !button?.contains(target)) close(true);
    };
    // the button disappears at the desktop breakpoint: don't leave the page locked behind a hidden panel
    const wide = window.matchMedia("(min-width: 900px)");
    const onWide = () => wide.matches && close(false);
    document.addEventListener("keydown", onKey);
    // tabbing past the last item leaves the sheet: close it rather than leave it covering the page
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as Node;
      if (!panelRef.current?.contains(target) && !button?.contains(target)) close(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("focusin", onFocusIn);
    wide.addEventListener("change", onWide);
    return () => {
      body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("focusin", onFocusIn);
      wide.removeEventListener("change", onWide);
      // after a link click the browser moves focus to the section; otherwise hand it back to the button
      if (restoreFocus.current) button?.focus({ preventScroll: true });
      restoreFocus.current = true;
    };
  }, [open, close]);

  const onLinkClick = () => {
    // unlock before the browser follows the hash so the jump is never blocked
    document.body.style.overflow = "";
    close(false);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="menu-button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => (open ? close(true) : setOpen(true))}
      >
        <span className="menu-button__icon" data-open={open} aria-hidden="true">
          <span />
          <span />
        </span>
        <span className="menu-button__label">Menu</span>
      </button>
      <div ref={panelRef} id="mobile-menu" className="mobile-menu" data-open={open}>
        <nav aria-label="Main">
          <ul className="mobile-menu__list">
            {nav.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="mobile-menu__link" onClick={onLinkClick}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <a href={cta.href} className="btn btn--solid mobile-menu__cta" onClick={onLinkClick}>
          {cta.label}
        </a>
      </div>
    </>
  );
}
