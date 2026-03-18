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
      <NavigationMenu.List className="flex items-center gap-0 bg-white/90 backdrop-blur-sm rounded-md shadow-[0_2px_10px_rgba(0,0,0,0.15)] px-1 py-1 m-0 list-none">
        {links.map(({ href, label }) => (
          <NavigationMenu.Item key={href}>
            <NavigationMenu.Link asChild active={pathname === href}>
              <Link
                href={href}
                className="block px-3 py-2 rounded text-[15px] font-medium leading-none no-underline select-none outline-none text-violet-700 hover:bg-violet-50 focus:shadow-[0_0_0_2px] focus:shadow-violet-400 data-[active]:text-violet-900 data-[active]:bg-violet-100 transition-colors"
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
