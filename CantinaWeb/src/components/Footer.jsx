

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="mt-auto flex shrink-0 flex-col gap-2 border-t border-slate-200 bg-white/80 px-4 py-4 text-sm text-slate-600 backdrop-blur md:flex-row md:items-center md:justify-between md:px-6">
      <div>
        <strong>Copyright © {currentYear} CDSystem.</strong> Todos los derechos reservados.
      </div>
      <div>
        <b>Version</b> 1.0.0
      </div>
    </footer>
  )
}