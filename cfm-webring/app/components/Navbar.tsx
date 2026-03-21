"use client"

import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/class", label: "Class" },
  { href: "/webring", label: "Webring" },
  { href: "https://github.com/DanielWLiu07/CFM", label: "Github", external: true },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <NavigationMenu.Root className="relative z-10">
      <NavigationMenu.List
        className="flex items-center m-0 list-none"
        style={{
          background: '#fff',
          border: '2px solid #000',
          boxShadow: '3px 3px 0 #000',
          padding: '4px',
          gap: '4px',
        }}
      >
        {links.map(({ href, label, external }) => (
          <React.Fragment key={href}>
            <NavigationMenu.Item key={href}>
              <NavigationMenu.Link asChild active={pathname === href}>
                <Link
                  href={href}
                  target={external ? '_blank' : undefined}
                  rel={external ? 'noopener noreferrer' : undefined}
                  onClick={pathname === href && !external ? () => window.location.reload() : undefined}
                  className="block no-underline select-none outline-none transition-colors"
                  style={{
                    fontFamily: 'var(--font-arcade)',
                    fontSize: '18px',
                    letterSpacing: '0.08em',
                    padding: '5px 16px',
                    color: pathname === href ? '#fff' : '#000',
                    background: pathname === href ? '#000' : 'transparent',
                  }}
                  onMouseEnter={e => {
                    if (pathname !== href) {
                      (e.currentTarget as HTMLElement).style.background = '#000';
                      (e.currentTarget as HTMLElement).style.color = '#fff';
                    }
                  }}
                  onMouseLeave={e => {
                    if (pathname !== href) {
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
        ))}
      </NavigationMenu.List>
    </NavigationMenu.Root>
  );
}
