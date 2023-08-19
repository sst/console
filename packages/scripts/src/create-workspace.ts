import { provideActor } from "@console/core/actor";
import { User } from "@console/core/user";
import { Workspace } from "@console/core/workspace";
import inquirer from "inquirer";

const result = await inquirer.prompt([
  {
    type: "input",
    name: "name",
    message: "Workspace name",
  },
  {
    type: "input",
    name: "email",
    message: "Email of initial user",
  },
]);

const workspace = await Workspace.create({
  slug: result.name,
});

provideActor({
  type: "system",
  properties: {
    workspaceID: workspace,
  },
});

await User.create({
  email: result.email,
});
