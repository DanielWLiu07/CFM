"use client"

import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import React, { useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from "react";
import Link from "next/link";

const links = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/class", label: "Class" },
  { href: "/webring", label: "Webring" },
  { href: "/github", label: "Github" },
];

export interface NavbarHandle {
  setActiveRoute: (route: string) => void;
}

const Navbar = forwardRef<NavbarHandle>(function Navbar(_, ref) {
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const currentRouteRef = useRef('/');

  const applyActive = useCallback((route: string) => {
    linkRefs.current.forEach((el, i) => {
      if (!el) return;
      const isActive = links[i].href === route;
      el.style.color = isActive ? '#fff' : '#000';
      el.style.background = isActive ? '#000' : 'transparent';
    });
  }, []);

  useImperativeHandle(ref, () => ({
    setActiveRoute: (route: string) => {
      if (route === currentRouteRef.current) return;
      currentRouteRef.current = route;
      applyActive(route);
    },
  }), [applyActive]);

  // Apply initial state after mount
  useEffect(() => {
    applyActive(currentRouteRef.current);
  }, [applyActive]);

  return (
    <NavigationMenu.Root className="relative z-10">
      <NavigationMenu.List
        className="flex items-center m-0 list-none flex-wrap"
        style={{
          background: '#fff',
          border: '2px solid #000',
          boxShadow: '3px 3px 0 #000',
          padding: '3px',
          gap: '2px',
        }}
      >
        {links.map(({ href, label }, i) => {
          const isScrollTarget = true;

          const handleClick = (e: React.MouseEvent) => {
            if (!isScrollTarget) return;
            e.preventDefault();
            if (href === '/') {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              const el = document.getElementById(href.slice(1));
              el?.scrollIntoView({ behavior: 'smooth' });
            }
          };

          return (
            <React.Fragment key={href}>
              <NavigationMenu.Item>
                <NavigationMenu.Link asChild>
                  <Link
                    href={href}
                    ref={el => { linkRefs.current[i] = el; }}
                    onClick={handleClick}
                    className="nav-link block no-underline select-none outline-none transition-colors"
                    style={{
                      fontFamily: 'var(--font-arcade)',
                      fontSize: 'clamp(11px, 2.2vw, 18px)',
                      letterSpacing: '0.08em',
                      padding: 'clamp(3px, 0.6vw, 5px) clamp(8px, 1.8vw, 16px)',
                      color: '#000',
                      background: 'transparent',
                    }}
                    onMouseEnter={e => {
                      if (currentRouteRef.current !== href) {
                        (e.currentTarget as HTMLElement).style.background = '#000';
                        (e.currentTarget as HTMLElement).style.color = '#fff';
                      }
                    }}
                    onMouseLeave={e => {
                      if (currentRouteRef.current !== href) {
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                        (e.currentTarget as HTMLElement).style.color = '#000';
                      }
                    }}
                  >
                    {label}
                  </Link>
                </NavigationMenu.Link>
              </NavigationMenu.Item>
            </React.Fragment>
          );
        })}
      </NavigationMenu.List>
    </NavigationMenu.Root>
  );
});

export default Navbar;
