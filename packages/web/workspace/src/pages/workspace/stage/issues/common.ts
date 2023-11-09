import { Resource } from "@console/core/app/resource";

export function getLogInfo(resources: Resource.Info[], logGroup?: string) {
  const name = logGroup?.split("/").at(-1);
  return resources
    .flatMap((x) => {
      // NextjsSite per-route log group
      if (
        x.type === "NextjsSite" &&
        x.metadata.routes?.logGroupPrefix &&
        logGroup?.startsWith(x.metadata.routes?.logGroupPrefix)
      ) {
        return (
          (() => {
            // get the server function for the NextjsSite
            const serverFunction = resources.find(
              (y) =>
                y.type === "Function" && y.metadata.arn === x.metadata.server
            );
            if (!serverFunction) return;

            // get the route matching the log group
            const route = x.metadata.routes.data.find((route) =>
              logGroup?.endsWith(route.logGroupPath)
            );
            if (!route) return;

            return [
              {
                uri: `${serverFunction.id}?logGroup=${logGroup}`,
                name: `Route: ${route.route}`,
                missingSourcemap: serverFunction.metadata.missingSourcemap,
              },
            ];
          })() ?? []
        );
      }
      // Function log group
      else if (x.type === "Function" && name && x.metadata.arn.endsWith(name)) {
        return [
          {
            uri: x.id,
            name: x.metadata.handler,
            missingSourcemap: x.metadata.missingSourcemap,
          },
        ];
      }
      return [];
    })
    .at(0);
}
