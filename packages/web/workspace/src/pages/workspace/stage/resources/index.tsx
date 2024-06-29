import { Route, Routes } from "@solidjs/router";
import { Detail as ResourceLogs } from "../logs/detail";
import { NotFound } from "../../../not-found";
import { Updates } from "./updates";
import { Detail } from "./detail";
import { List } from "./list";

export function Resources() {
  return (
    <Routes>
      <Route path="" element={<List />} />
      <Route path="updates/*" component={Updates} />
      <Route path="logs/:resourceID/*" component={ResourceLogs} />
      <Route path=":urn" component={Detail} />
      <Route path="*" element={<NotFound inset="header-tabs" />} />
    </Routes>
  );
}
