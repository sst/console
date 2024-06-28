import { Route, Routes } from "@solidjs/router";
import { NotFound } from "../../../not-found";
import { Detail } from "./detail";
import { List } from "./list";

export function Logs() {
  return (
    <Routes>
      <Route path="" element={<List />} />
      <Route path=":resourceID/*" component={Detail} />
      <Route path="*" element={<NotFound inset="header-tabs" />} />
    </Routes>
  );
}
