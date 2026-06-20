import Link from 'next/link';

const links = [
  { href: '/', label: 'Overview' },
  { href: '/documents', label: 'Documents' },
  { href: '/languages', label: 'Languages' },
  { href: '/escalation', label: 'Escalation' },
  { href: '/branding', label: 'Branding' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/embed', label: 'Embed Code' },
];

export function Nav() {
  return (
    <nav className="w-56 bg-axon-primary text-white min-h-screen p-4">
      <h1 className="text-xl font-bold mb-8">Axon</h1>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="block px-3 py-2 rounded hover:bg-axon-light transition">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
