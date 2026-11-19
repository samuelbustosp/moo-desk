import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#09090b] text-zinc-400 text-xs gap-2">
      <p>Página no encontrada</p>
      <Link href="/" className="text-zinc-200 underline">
        Volver al inicio
      </Link>
    </div>
  );
}
