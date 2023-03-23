#! /usr/bin/env node
const { program } = require("commander");
const simpleGit = require("simple-git");
const inquirer = require("inquirer");
const packageJson = require("../package.json");
const util = require("util");
const { getBranch, isCleanGuard } = require("../utils/git");

program.version(packageJson.version);

program
  .description(
    "Команда для ребейса коммитов \n Для перемещения коммитов будет использоваться ребейс, необходимо будет выбрать эдитор в котором это будет происходить"
  )
  .option("-t, --to <to>", "в какую ветку будет собираться релиз", "release")
  .option(
    "-f, --from <from>",
    "из какой ветки будет собираться релиз",
    "develop"
  )
  // .option(
  //   "-s, --script <script>",
  //   "какой скрипт запускать для релиза из package.json",
  //   "up"
  // )
  .parse();

const main = async () => {
  const { editor } = await inquirer.prompt([
    {
      type: "list",
      name: "editor",
      message: "Выберите эдитор в котором будет происходить ребейс",
      loop: false,
      choices: [
        {
          name: "VSCode",
          value: "code --wait --reuse-window",
        },
        {
          name: "WebStorm",
          value: "webstorm -w",
        },
        {
          name: "Nano",
          value: "nano",
        },
      ],
    },
  ]);

  const git = simpleGit({
    baseDir: process.cwd(),
    config: [`core.editor=${editor}`, `sequence.editor=${editor}`],
  });
  const options = program.opts();

  await isCleanGuard(git);

  const fromBranch = await getBranch(git, options.from);
  const toBranch = await getBranch(git, options.to);

  await git.checkout(fromBranch.name);

  try {
    await git.rebase(["--interactive", toBranch.commit]);
  } catch (e) {
    console.info(e.message);
  }

  const { push } = await inquirer.prompt([
    {
      type: "confirm",
      name: "forcePush",
      message:
        "Сделать форс пуш в репозиторий? \n Необходимо проверить коммиты, история коммитов будет ПЕРЕЗАПИСАНА!)",
      default: false,
    },
  ]);

  if (push) {
    await git.push(["--force"]);
  }
};

main().then(() => {});

//-c "core.editor=code --wait --reuse-window"
