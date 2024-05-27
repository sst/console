import { Route, Routes } from "@solidjs/router";
import { Detail as ResourceLogs } from "../logs/detail";
import { NotFound } from "../../../not-found";
import { Detail } from "./detail";
import { List } from "./list";

export function Resources() {
  return (
    <Routes>
      <Route path="" element={<List />} />
      <Route path=":urn" component={Detail} />
      <Route path="logs/:resourceID/*" component={ResourceLogs} />
      <Route path="*" element={<NotFound inset="stage" />} />
    </Routes>
  );
}
