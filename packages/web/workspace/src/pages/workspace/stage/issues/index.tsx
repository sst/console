import {
  Link,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useSearchParams,
} from "@solidjs/router";
import { Match, Switch } from "solid-js";
import { List } from "./list";
import { Detail } from "./detail";
import { styled } from "@macaron-css/solid";
import { HeaderSlot } from "../../header";
import { theme, utility, Stack, Fullscreen } from "$/ui";
import { IconExclamationTriangle } from "$/ui/icons";
import { useCommandBar } from "../../command-bar";
import { IconApp } from "$/ui/icons/custom";
import { IconArrowRight } from "$/ui/icons";
import { Warning } from "../";
import { useWorkspace } from "../../context";
import { useStageContext } from "../context";

export function Issues() {
  const ctx = useStageContext();
  const workspace = useWorkspace();
  return (
    <>
      <Switch>
        <Match when={workspace().timeGated != null && !ctx.connected}>
          <Fullscreen inset="stage">
            <Warning
              title="Update billing details"
              description={
                <>
                  Your usage is above the free tier,{" "}
                  <Link href={`/${workspace().slug}/settings#billing`}>
                    update your billing details
                  </Link>
                  .<br />
                  Note, you can continue using the Console for local stages.
                  <br />
                  Just make sure `sst dev` is running locally.
                </>
              }
            />
          </Fullscreen>
        </Match>
        <Match when={true}>
          <Routes>
            <Route path="" element={<List />} />
            <Route path=":issueID" element={<Detail />} />
          </Routes>
        </Match>
      </Switch>
    </>
  );
}
