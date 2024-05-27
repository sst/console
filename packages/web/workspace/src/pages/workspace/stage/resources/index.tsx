import { Route, Routes } from "@solidjs/router";
import { NotFound } from "../../../not-found";
import { Logs } from "../logs";
import { List } from "./list";

export function Resources() {
  return (
    <Routes>
      <Route path="" element={<List />} />
      <Route path="logs/:resourceID/*" component={Logs} />
      <Route path="*" element={<NotFound inset="stage" />} />
    </Routes>
  );
}
