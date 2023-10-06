import { Workspace } from "@console/core/workspace";
import { Accessor, createContext, useContext } from "solid-js";

export const WorkspaceContext = createContext<Accessor<Workspace.Info>>();

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("No workspace context");
  return context;
}
