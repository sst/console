import { Route, Routes } from "@solidjs/router";
import { List } from "./list";
import { Detail } from "./detail";
import { HeaderSlot } from "../../header";
import { SplitOptions, SplitOptionsOption } from "$/ui";

export function Issues() {
  return (
    <>
      <Routes>
        <Route path="" element={<List />} />
        <Route path=":issueID" element={<Detail />} />
      </Routes>
    </>
  );
}
