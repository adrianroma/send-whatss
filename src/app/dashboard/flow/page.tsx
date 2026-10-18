import { FlowLoader } from "@/components/flow-loader";

export default function FlowPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Flujo</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Mapa del diálogo del chatbot y sus decisiones. Arrastra para conectar nodos; usa × en el nodo, o Backspace/Supr
          para eliminar el seleccionado.
        </p>
      </div>
      <FlowLoader />
    </div>
  );
}
