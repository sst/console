import { Row, TextButton } from "$/ui";
import { IconChevronRight } from "$/ui/icons";
import { Link } from "@solidjs/router";
import { useAppContext } from "./context";

export function Overview() {
  const app = useAppContext();

  return (
    <>
      <h3>App: {app.app.name}</h3>
      <Link href="settings">
        <TextButton>
          <Row space="0.5" horizontal="center">
            Manage app
            <IconChevronRight width="13" height="13" />
          </Row>
        </TextButton>
      </Link>
    </>
  );
}
