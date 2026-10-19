// Variables and expressions used inside flow node texts.
//
//   {name}                    -> value of a variable ({null} / {undefined} when empty or unset)
//   {name} = value            -> assigns a variable (also {name}=={value} outside rules/determine)
//   {a} == b && {c} like %x%  -> expressions (rules / determine): == like "yes in" "not in" && || !!

export type Vars = Record<string, string | null | undefined>;

const PLACEHOLDER = /\{+\s*([A-Za-z_][\w.]*)\s*\}+/g;
const HAS_PLACEHOLDER = /\{+\s*[A-Za-z_][\w.]*\s*\}+/;
const ASSIGNMENT = /^\s*\{+\s*([A-Za-z_][\w.]*)\s*\}+\s*={1,2}(?!=)\s*(.*)$/;
const OPERATOR = /(==|&&|\|\||!!|\s(?:like|not in|yes in)\s)/i;

const NODE_NAME = /^\s*\[([A-Za-z_]\w*)\]\s*/;

/** A node is named with `[node_name]` at the start of its text. */
export function splitNodeName(text: string): { name: string | null; body: string } {
  const m = NODE_NAME.exec(text);
  return m ? { name: m[1], body: text.slice(m[0].length) } : { name: null, body: text };
}

export const RESERVED_VARS = ["input", "output", "data"];

export function show(v: string | null | undefined) {
  return v === undefined ? "{undefined}" : v === null ? "{null}" : v;
}

export function interpolate(text: string, vars: Vars, encode = false) {
  return text.replace(PLACEHOLDER, (_, name: string) => {
    const v = name === "null" || name === "undefined" ? `{${name}}` : show(vars[name]);
    return encode ? encodeURIComponent(v) : v;
  });
}

/** `{name} = value` / `{name}=={value}` -> [name, rawValue], otherwise null. */
export function parseAssignment(line: string): [string, string] | null {
  const m = ASSIGNMENT.exec(line);
  return m ? [m[1], m[2]] : null;
}

/** A line is an expression when it uses a {variable} together with an operator. */
export function isExpressionLine(line: string) {
  return HAS_PLACEHOLDER.test(line) && OPERATOR.test(line);
}

function truthy(v: string) {
  return !["", "{null}", "{undefined}", "false", "0"].includes(v.trim().toLowerCase());
}

function operand(raw: string, vars: Vars) {
  let t = raw.trim();
  const quoted = /^(["'])([\s\S]*)\1$/.exec(t);
  if (quoted) t = quoted[2];
  return interpolate(t, vars).trim().toLowerCase();
}

function like(value: string, pattern: string) {
  if (!pattern.includes("%")) return value.includes(pattern);
  const re = pattern
    .split("%")
    .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("[\\s\\S]*");
  return new RegExp(`^${re}$`).test(value);
}

function isIn(value: string, list: string) {
  const items = list.split(/[,;|]/).map((i) => i.trim());
  return items.length > 1 ? items.includes(value) : value !== "" && list.includes(value);
}

function term(raw: string, vars: Vars) {
  let t = raw.trim();
  let negate = false;
  while (t.startsWith("!!")) {
    negate = !negate;
    t = t.slice(2).trim();
  }

  const m = /^([\s\S]*?)(?:\s*(==)\s*|\s+(not in|yes in|like)\s+)([\s\S]*)$/i.exec(t);
  let result: boolean;
  if (!m) {
    result = truthy(operand(t, vars));
  } else {
    const op = (m[2] ?? m[3]).toLowerCase();
    const left = operand(m[1], vars);
    const right = operand(m[4], vars);
    result =
      op === "==" ? left === right : op === "like" ? like(left, right) : op === "yes in" ? isIn(left, right) : !isIn(left, right);
  }
  return negate ? !result : result;
}

/** `||` has the lowest precedence, then `&&`; `!!` negates a single comparison. */
export function evalExpression(line: string, vars: Vars) {
  return line.split("||").some((or) => or.split("&&").every((t) => term(t, vars)));
}
