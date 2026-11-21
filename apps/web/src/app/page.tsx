import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import { ArrowUpRight, CalendarDays, Mail, Sparkles } from "lucide-react";
import { InstagramIcon } from "../components/ui/brand-icons";

const integrations: { Icon: ComponentType<SVGProps<SVGSVGElement>>; title: string; description: string }[] = [
  { Icon: Mail, title: "Gmail", description: "Draft, find, and reply to email" },
  { Icon: CalendarDays, title: "Google Calendar", description: "Find time and coordinate meetings" },
  { Icon: InstagramIcon, title: "Instagram", description: "Create and review social posts" },
];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(132,93,255,0.16),transparent_55%)]" />
      <nav className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight"><Sparkles className="size-5 text-primary" /> Sutra</Link>
        <Link href="/login" className="rounded-full border border-border px-4 py-2 text-sm transition hover:bg-muted">Sign in <ArrowUpRight className="ml-1 inline size-4" /></Link>
      </nav>
      <section className="relative mx-auto grid max-w-7xl items-center gap-14 px-6 pb-24 pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:px-10 lg:pb-36 lg:pt-28">
        <div>
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3.5 py-2 text-xs text-muted-foreground"><span className="size-1.5 rounded-full bg-primary" /> Your work, in one conversation</div>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.04] tracking-[-0.055em] sm:text-6xl lg:text-7xl">Make space for <span className="bg-gradient-to-r from-primary to-violet-300 bg-clip-text text-transparent">meaningful work.</span></h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">Sutra brings your inbox, calendar, and social publishing into a focused AI workspace. Describe the task, review the plan, and stay in control.</p>
          <div className="mt-9 flex flex-wrap items-center gap-3"><Link href="/login" className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90">Get started <ArrowUpRight className="size-4" /></Link><Link href="/chat" className="rounded-full border border-border px-5 py-3 text-sm transition hover:bg-muted">Explore workspace</Link></div>
          <p className="mt-5 text-xs text-muted-foreground">You approve every external action before it runs.</p>
        </div>
        <div className="rounded-3xl border border-border bg-card/60 p-5 shadow-2xl shadow-violet-950/20 backdrop-blur-xl sm:p-7">
          <div className="mb-7 flex items-center justify-between"><div><p className="text-sm font-medium">Your productivity agents</p><p className="mt-1 text-xs text-muted-foreground">One workspace. Connected tools.</p></div><span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">Preview</span></div>
          <div className="space-y-3">
            {integrations.map(({ Icon, title, description }) => <div key={title} className="flex items-center gap-4 rounded-2xl border border-border/80 bg-background/60 p-4"><div className="grid size-10 place-items-center rounded-xl bg-muted text-primary"><Icon className="size-5" /></div><div><p className="text-sm font-medium">{title}</p><p className="mt-1 text-xs text-muted-foreground">{description}</p></div><ArrowUpRight className="ml-auto size-4 text-muted-foreground" /></div>)}
          </div>
          <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/[0.06] p-4"><p className="text-xs text-muted-foreground">SUTRA ASSISTANT</p><p className="mt-2 text-sm leading-6">“I found two open times next week. Want me to draft an invite for Tuesday at 10?”</p><div className="mt-3 inline-flex rounded-lg border border-primary/25 px-3 py-1.5 text-xs text-primary">Review action</div></div>
        </div>
      </section>
      <footer className="relative border-t border-border/70 px-6 py-6 text-center text-xs text-muted-foreground">Thoughtful automation, with you in control.</footer>
    </main>
  );
}
