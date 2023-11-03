import {
  Route,
  Routes,
  useLocation,
  useNavigate,
  useSearchParams,
} from "@solidjs/router";
import { List } from "./list";
import { Detail } from "./detail";
import { HeaderSlot } from "../../header";
import { SplitOptions, SplitOptionsOption } from "$/ui";
import { useCommandBar } from "../../command-bar";
import { IconApp } from "$/ui/icons/custom";
import { IconArrowRight } from "$/ui/icons";

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
