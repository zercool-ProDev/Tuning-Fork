import { Nav } from "@/components/nav";

/**
 * Shell for every signed-in screen.
 *
 * The bottom padding on mobile clears the fixed nav bar; without it the last
 * card sits underneath it and looks like the page is cut off.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-5 pb-28 sm:pb-10">
        {children}
      </main>
    </div>
  );
}
