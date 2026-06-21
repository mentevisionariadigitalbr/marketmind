/** Marca um ponto do rascunho que EXIGE revisão de advogado antes de produção. */
export function ReviewNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <strong>⚠ Revisar com advogado:</strong> {children}
    </div>
  );
}
