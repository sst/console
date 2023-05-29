import { Navigate, Route, Routes, useParams } from "@solidjs/router";
import { ReplicacheProvider } from "../../data/replicache";
import { Connect } from "./connect";
import { Apps } from "./apps";
import { CommandBar } from "./command-bar";

export function Workspace() {
  const params = useParams();

  return (
    <ReplicacheProvider
      accountID={params.accountID}
      workspaceID={params.workspaceID}
    >
      <CommandBar>
        <Routes>
          <Route path="connect" component={Connect} />
          <Route path="apps/*" component={Apps} />
          <Route path="*" element={<Navigate href="apps" />} />
        </Routes>
      </CommandBar>
    </ReplicacheProvider>
  );
}
