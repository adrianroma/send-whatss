"use client";

import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useState } from "react";
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

const STORAGE_KEY = "chatbot-flow";

type Kind = "userRequest" | "userResponse" | "botRequest" | "botResponse";
type FlowNodeData = { text: string };
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
};

function MessageNode({ id, type, data, selected }: NodeProps<FlowNode>) {
  const { updateNodeData } = useReactFlow();
  const kind = KINDS[type as Kind];
  return (
    <div
      className={`w-56 rounded-lg border-2 p-2 shadow-sm ${kind.style} ${selected ? "ring-2 ring-slate-900 dark:ring-white" : ""}`}
    >
      <Handle type="target" position={Position.Top} />
      <div className="mb-1 text-[10px] font-bold uppercase tracking-wide opacity-70">{kind.label}</div>
      <textarea
        value={data.text}
        rows={3}
        onChange={(e) => updateNodeData(id, { text: e.target.value })}
        className="nodrag nowheel w-full resize-none rounded bg-white/60 p-1 text-sm outline-none dark:bg-black/30"
      />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

const nodeTypes = {
  userRequest: MessageNode,
  userResponse: MessageNode,
  botRequest: MessageNode,
  botResponse: MessageNode,
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

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as typeof initial;
  } catch {}
  return initial;
}

function Editor() {
  const [start] = useState(load);
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(start.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(start.edges);
  const { screenToFlowPosition } = useReactFlow();

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes, edges }));
    } catch {}
  }, [nodes, edges]);

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
      </div>
      <div className="h-[70vh] overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
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
  return (
    <ReactFlowProvider>
      <Editor />
    </ReactFlowProvider>
  );
}
