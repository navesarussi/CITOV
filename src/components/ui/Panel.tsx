import type { ReactNode } from "react";

export function Panel(props: {
  as?: "div" | "aside" | "section" | "article";
  className?: string;
  children?: ReactNode;
}) {
  const Tag = props.as ?? "div";
  return (
    <Tag className={`panel rounded-[var(--panel-radius)] ${props.className ?? ""}`}>
      {props.children}
    </Tag>
  );
}
