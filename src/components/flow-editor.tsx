"use client";

import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  addEdge,
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";

type Kind =
  | "userRequest"
  | "userResponse"
  | "botRequest"
  | "botResponse"
  | "rules"
  | "action"
  | "determine"
  | "start"
  | "await"
  | "stop"
  | "end"
  | "pause";
type FlowNodeData = {
  text: string;
  actionType?: "api" | "file";
  method?: "GET" | "POST";
  target?: string;
};
type FlowNode = Node<FlowNodeData, Kind>;

const KINDS: Record<Kind, { label: string; style: string }> = {
  userRequest: {
    label: "Solicitud del usuario",
    style: "border-sky-400 bg-sky-50 text-sky-900 dark:bg-sky-950 dark:text-sky-100",
  },
  userResponse: {
    label: "Respuesta del usuario",
    style: "border-indigo-400 bg-indigo-50 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-100",
  },
  botRequest: {
    label: "Solicitud del bot",
    style: "border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
  },
  botResponse: {
    label: "Respuesta del bot",
    style: "border-emerald-400 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
  },
  rules: {
    label: "Reglas",
    style: "border-violet-400 bg-violet-50 text-violet-900 dark:bg-violet-950 dark:text-violet-100",
  },
  action: {
    label: "Acción",
    style: "border-rose-400 bg-rose-50 text-rose-900 dark:bg-rose-950 dark:text-rose-100",
  },
  determine: {
    label: "Determinar",
    style: "border-orange-400 bg-orange-50 text-orange-900 dark:bg-orange-950 dark:text-orange-100",
  },
  start: {
    label: "Inicio",
    style: "border-lime-500 bg-lime-50 text-lime-900 dark:bg-lime-950 dark:text-lime-100",
  },
  await: {
    label: "Espera",
    style: "border-cyan-400 bg-cyan-50 text-cyan-900 dark:bg-cyan-950 dark:text-cyan-100",
  },
  end: {
    label: "Fin",
    style: "border-zinc-700 bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100",
  },
  stop: {
    label: "Detener",
    style: "border-slate-500 bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100",
  },
  pause: {
    label: "Pausa",
    style: "border-yellow-500 bg-yellow-50 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-100",
  },
};

function MessageNode({ id, type, data, selected }: NodeProps<FlowNode>) {
  const { updateNodeData, deleteElements } = useReactFlow();
  const kind = KINDS[type as Kind];
  return (
    <div
      className={`w-56 rounded-lg border-2 p-2 shadow-sm ${kind.style} ${selected ? "ring-2 ring-slate-900 dark:ring-white" : ""}`}
    >
      {type !== "start" && <Handle type="target" position={Position.Top} />}
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wide opacity-70">{kind.label}</span>
        <button
          type="button"
          title="Eliminar nodo"
          aria-label="Eliminar nodo"
          onClick={() => deleteElements({ nodes: [{ id }] })}
          className="nodrag flex h-5 w-5 items-center justify-center rounded text-sm leading-none opacity-60 hover:bg-black/10 hover:opacity-100 dark:hover:bg-white/20"
        >
          ×
        </button>
      </div>
      <textarea
        value={data.text}
        rows={3}
        onChange={(e) => updateNodeData(id, { text: e.target.value })}
        className="nodrag nowheel w-full resize-none rounded bg-white/60 p-1 text-sm outline-none dark:bg-black/30"
      />
      {type === "action" && (
        <div className="nodrag mt-1 space-y-1 text-xs">
          <div className="flex gap-1">
            <select
              value={data.actionType ?? "api"}
              onChange={(e) => updateNodeData(id, { actionType: e.target.value as "api" | "file" })}
              className="rounded bg-white/60 p-1 dark:bg-black/30"
            >
              <option value="api">API</option>
              <option value="file">Archivo</option>
            </select>
            {(data.actionType ?? "api") === "api" && (
              <select
                value={data.method ?? "GET"}
                onChange={(e) => updateNodeData(id, { method: e.target.value as "GET" | "POST" })}
                className="rounded bg-white/60 p-1 dark:bg-black/30"
              >
                <option>GET</option>
                <option>POST</option>
              </select>
            )}
          </div>
          <input
            value={data.target ?? ""}
            onChange={(e) => updateNodeData(id, { target: e.target.value })}
            placeholder={(data.actionType ?? "api") === "api" ? "https://…" : "public/archivo.csv"}
            className="w-full rounded bg-white/60 p-1 outline-none dark:bg-black/30"
          />
        </div>
      )}
      {type === "determine" ? (
        <>
          <div className="mt-1 flex justify-between px-4 text-[10px] font-bold opacity-70">
            <span>Sí</span>
            <span>No</span>
          </div>
          <Handle id="yes" type="source" position={Position.Bottom} style={{ left: "25%" }} />
          <Handle id="no" type="source" position={Position.Bottom} style={{ left: "75%" }} />
        </>
      ) : (
        type !== "stop" && type !== "end" && <Handle type="source" position={Position.Bottom} />
      )}
    </div>
  );
}

const nodeTypes = {
  userRequest: MessageNode,
  userResponse: MessageNode,
  botRequest: MessageNode,
  botResponse: MessageNode,
  rules: MessageNode,
  action: MessageNode,
  determine: MessageNode,
  start: MessageNode,
  await: MessageNode,
  stop: MessageNode,
  end: MessageNode,
  pause: MessageNode,
};

const initial: { nodes: FlowNode[]; edges: Edge[] } = {
  nodes: [
    { id: "1", type: "userRequest", position: { x: 0, y: 0 }, data: { text: "Hola, quiero cotizar un auto" } },
    { id: "2", type: "botResponse", position: { x: 0, y: 150 }, data: { text: "¡Hola! Con gusto te ayudo." } },
    { id: "3", type: "botRequest", position: { x: 0, y: 300 }, data: { text: "¿Qué modelo te interesa?" } },
    { id: "4", type: "userResponse", position: { x: 0, y: 450 }, data: { text: "Un sedán" } },
  ],
  edges: [
    { id: "e1-2", source: "1", target: "2" },
    { id: "e2-3", source: "2", target: "3" },
    { id: "e3-4", source: "3", target: "4" },
  ],
};

function Editor({ start }: { start: typeof initial }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(start.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(start.edges);
  const { screenToFlowPosition, deleteElements } = useReactFlow();

  const [status, setStatus] = useState<"saved" | "saving" | "error">("saved");
  const firstRun = useRef(true);

  const save = useCallback(async () => {
    setStatus("saving");
    try {
      const res = await fetch("/api/flow", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes, edges }),
      });
      setStatus(res.ok ? "saved" : "error");
    } catch {
      setStatus("error");
    }
  }, [nodes, edges]);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const timer = setTimeout(save, 600);
    return () => clearTimeout(timer);
  }, [save]);

  const selectedNodes = nodes.filter((n) => n.selected);
  const selectedEdges = edges.filter((e) => e.selected);
  const hasSelection = selectedNodes.length > 0 || selectedEdges.length > 0;

  const onConnect = useCallback(
    (c: Connection) => setEdges((eds) => addEdge({ ...c, label: "" }, eds)),
    [setEdges]
  );

  const addNode = (type: Kind) => {
    const offset = nodes.length * 12;
    const position = screenToFlowPosition({ x: window.innerWidth / 2 + offset, y: window.innerHeight / 2 + offset });
    setNodes((ns) => [...ns, { id: crypto.randomUUID(), type, position, data: { text: "" } }]);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(KINDS) as Kind[]).map((k) => (
          <button
            key={k}
            onClick={() => addNode(k)}
            className={`rounded-lg border-2 px-3 py-1.5 text-sm font-medium ${KINDS[k].style}`}
          >
            + {KINDS[k].label}
          </button>
        ))}
        <button
          onClick={() => deleteElements({ nodes: selectedNodes, edges: selectedEdges })}
          disabled={!hasSelection}
          className="ml-auto rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 disabled:opacity-40 dark:border-red-800 dark:text-red-400"
        >
          Eliminar seleccionado
        </button>
        <button
          onClick={save}
          disabled={status === "saving"}
          className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-slate-900"
        >
          Guardar
        </button>
        <span className="self-center text-xs text-slate-500">
          {status === "saving" ? "Guardando…" : status === "error" ? "Error al guardar" : "Guardado"}
        </span>
      </div>
      <div className="h-[70vh] overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          deleteKeyCode={["Backspace", "Delete"]}
          colorMode="system"
          fitView
        >
          <Background />
          <Controls />
          <MiniMap pannable zoomable />
        </ReactFlow>
      </div>
    </div>
  );
}

export function FlowEditor() {
  const [start, setStart] = useState<typeof initial | null>(null);

  useEffect(() => {
    fetch("/api/flow")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setStart(d?.flow ?? initial))
      .catch(() => setStart(initial));
  }, []);

  if (!start) return <div className="h-[70vh] rounded-xl border border-slate-200 dark:border-slate-800" />;

  return (
    <ReactFlowProvider>
      <Editor start={start} />
    </ReactFlowProvider>
  );
}
