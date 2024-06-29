import { Row, TabTitle } from "$/ui";
import { useAppContext } from "../context";
import { Link, Route, Routes } from "@solidjs/router";
import { Header, PageHeader } from "../../header";
import { NotFound } from "../../../not-found";
import { Detail } from "./detail";
import { List } from "./list";
import { createSubscription } from "$/providers/replicache";
import { RunStore } from "$/data/app";
import { DateTime } from "luxon";

export function Autodeploy() {
  const ctx = useAppContext();
  const latestRunError = createSubscription(async (tx) => {
    const runs = await RunStore.all(tx);
    const run = runs
      .filter((run) => run.appID === ctx.app.id)
      .sort(
        (a, b) =>
          DateTime.fromISO(b.time.created).toMillis() -
          DateTime.fromISO(a.time.created).toMillis()
      )[0];
    return (
      run?.error &&
      run.error.type !== "config_target_returned_undefined" &&
      run.error.type !== "config_branch_remove_skipped" &&
      run.error.type !== "target_not_matched"
    );
  });
  return (
    <>
      <Header app={ctx.app.name} />
      <PageHeader>
        <Row space="5" vertical="center">
          <Link href="../">
            <TabTitle size="sm">Stages</TabTitle>
          </Link>
          <Link href="">
            <TabTitle size="sm" count={latestRunError.value ? "•" : ""}>
              Autodeploy
            </TabTitle>
          </Link>
          <Link href="../settings">
            <TabTitle size="sm">Settings</TabTitle>
          </Link>
        </Row>
      </PageHeader>
      <Routes>
        <Route path="" element={<List />} />
        <Route path=":runID" element={<Detail />} />
        <Route path="*" element={<NotFound inset="header-tabs" />} />
      </Routes>
    </>
  );
}
