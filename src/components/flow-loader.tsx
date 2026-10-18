"use client";

import dynamic from "next/dynamic";

const FlowEditor = dynamic(() => import("./flow-editor").then((m) => m.FlowEditor), {
  ssr: false,
  loading: () => <div className="h-[70vh] rounded-xl border border-slate-200 dark:border-slate-800" />,
});

export function FlowLoader() {
  return <FlowEditor />;
}
