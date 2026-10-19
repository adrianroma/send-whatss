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
      <details className="rounded-lg border border-slate-200 p-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
        <summary className="cursor-pointer font-medium">Variables y expresiones</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <code>{"{nombre}"}</code> inserta una variable; si no tiene valor se muestra <code>{"{null}"}</code> o{" "}
            <code>{"{undefined}"}</code>.
          </li>
          <li>
            <code>{"{input}"}</code> = lo que escribió el usuario · <code>{"{output}"}</code> = lo que generó el nodo
            anterior · <code>{"{data}"}</code> = resultado de la última acción.
          </li>
          <li>
            Nombra un nodo con <code>[nombre_del_nodo]</code> al inicio de su texto (letras, números y _). El nombre no
            se muestra al usuario; con él puedes leer <code>{"{nombre_del_nodo.output}"}</code> (lo que generó) y{" "}
            <code>{"{nombre_del_nodo.input}"}</code> desde nodos posteriores.
          </li>
          <li>
            Asignar (en cualquier nodo que no sea Reglas/Determinar): <code>{"{ciudad} = {input}"}</code>. La línea no
            se muestra al usuario.
          </li>
          <li>
            Condiciones en Reglas/Determinar: <code>{"{a} == {b}"}</code>, <code>{"{a} like %hola%"}</code>,{" "}
            <code>{"{a} yes in rojo, azul"}</code>, <code>{"{a} not in 1,2"}</code>, y se combinan con{" "}
            <code>&&</code>, <code>||</code> y <code>!!</code> (negar). Las líneas sin variables se evalúan con IA.
          </li>
        </ul>
      </details>
      <details className="rounded-lg border border-slate-200 p-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
        <summary className="cursor-pointer font-medium">Nodos de control</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <b>Inicio</b>: punto de entrada. Si existe, solo las Solicitudes del usuario conectadas a él pueden iniciar
            una conversación nueva. Sus líneas <code>{"{x} = valor"}</code> se aplican al empezar.
          </li>
          <li>
            <b>Espera</b>: detiene el flujo y espera el siguiente mensaje, que debe coincidir con una Respuesta del
            usuario conectada.
          </li>
          <li>
            <b>Pausa</b>: detiene el flujo; el siguiente mensaje, sea cual sea, lo reanuda desde las salidas de la pausa.
          </li>
          <li>
            <b>Detener</b>: corta la ejecución en ese punto sin responder nada; se conservan las variables y el siguiente
            mensaje se evalúa como una conversación nueva.
          </li>
          <li>
            <b>Fin</b>: termina la conversación; el siguiente mensaje empieza de cero y se borran las variables.
          </li>
        </ul>
      </details>
      <FlowLoader />
    </div>
  );
}
