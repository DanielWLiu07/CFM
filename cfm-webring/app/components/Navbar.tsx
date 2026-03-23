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
  { href: "/github", label: "Github" },
];

interface NavbarProps {
  activeRoute?: string;
}

export default function Navbar({ activeRoute }: NavbarProps) {
  const pathname = usePathname();
  const currentRoute = activeRoute ?? pathname;

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
        {links.map(({ href, label, external }) => {
          const isScrollTarget = href === '/' || href === '/about' || href === '/class' || href === '/webring' || href === '/github';
          const isActive = currentRoute === href;

          const handleClick = (e: React.MouseEvent) => {
            if (!isScrollTarget || external) return;
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
                <NavigationMenu.Link asChild active={isActive}>
                  <Link
                    href={href}
                    target={external ? '_blank' : undefined}
                    rel={external ? 'noopener noreferrer' : undefined}
                    onClick={isScrollTarget && !external ? handleClick : undefined}
                    className="block no-underline select-none outline-none transition-colors"
                    style={{
                      fontFamily: 'var(--font-arcade)',
                      fontSize: '18px',
                      letterSpacing: '0.08em',
                      padding: '5px 16px',
                      color: isActive ? '#fff' : '#000',
                      background: isActive ? '#000' : 'transparent',
                    }}
                    onMouseEnter={e => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.background = '#000';
                        (e.currentTarget as HTMLElement).style.color = '#fff';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isActive) {
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
}
