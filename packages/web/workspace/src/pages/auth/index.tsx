import { Route, Routes } from "@solidjs/router";

export function Auth() {
  return (
    <Routes>
      <Route path="" component={Provider} />
    </Routes>
  );
}

function Provider() {
  const params = {
    client_id: "solid",
    redirect_uri: location.origin + "/auth/workspaces",
    response_type: "token",
  };

  return (
    <ol>
      <li>
        <a
          href={
            import.meta.env.VITE_AUTH_URL +
            "/authorize?" +
            new URLSearchParams({
              ...params,
              provider: "github",
            }).toString()
          }
        >
          Github
        </a>
      </li>
    </ol>
  );
}
