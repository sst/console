import {
  Row,
  TabTitle,
} from "$/ui";
import { useAppContext } from "../context";
import { Link, Route, Routes } from "@solidjs/router";
import { Header, PageHeader } from "../../header";
import { NotFound } from "../../../not-found";
import { Detail } from "./detail";
import { List } from "./list";

export function Autodeploy() {
  const ctx = useAppContext();
  return (
    <>
      <Header app={ctx.app.name} />
      <PageHeader>
        <Row space="5" vertical="center">
          <Link href="../">
            <TabTitle size="sm">Stages</TabTitle>
          </Link>
          <Link href="">
            <TabTitle size="sm">Autodeploy</TabTitle>
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
