import { Route, Routes } from "@solidjs/router";
import { List } from "./list";
import { Detail } from "./detail";

export function Issues() {
  return (
    <Routes>
      <Route path="" element={<List />} />
      <Route path=":issueID" element={<Detail />} />
    </Routes>
  );
}
