"use client"

import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <NavigationMenu.Root className="relative z-10">
      <NavigationMenu.List
        className="flex items-center gap-1 rounded-md px-1 py-1 m-0 list-none"
        style={{ backgroundImage: "url('/images/nav_bg.png')", backgroundSize: '300%', backgroundPosition: 'center' }}
      >
        {links.map(({ href, label }) => (
          <NavigationMenu.Item key={href}>
            <NavigationMenu.Link asChild active={pathname === href}>
              <Link
                href={href}
                className="block px-3 py-1.5 rounded leading-none no-underline select-none outline-none text-white hover:text-white data-[active]:text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] transition-colors"
                style={{ fontFamily: 'var(--font-arcade)', fontSize: '13px', letterSpacing: '0.1em', textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000' }}
              >
                {label}
              </Link>
            </NavigationMenu.Link>
          </NavigationMenu.Item>
        ))}
      </NavigationMenu.List>
    </NavigationMenu.Root>
  );
}
