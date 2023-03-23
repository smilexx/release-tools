#! /usr/bin/env node
const { program } = require("commander");
const simpleGit = require("simple-git");
const inquirer = require("inquirer");
const packageJson = require("../package.json");
const { getBranch, isCleanGuard } = require("../utils/git");
const log = require("fancy-log");

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
          name: "PhpStorm",
          value: "phpstorm -w",
        },
        {
          name: "TextEdit (macOS)",
          value: "open -W -n",
        },
        {
          name: "nano",
          value: "nano -w",
        },
        {
          name: "Default",
          value: undefined,
        },
      ],
    },
  ]);

  const git = simpleGit({
    baseDir: process.cwd(),
    config: editor
      ? [(`core.editor=${editor}`, `sequence.editor=${editor}`)]
      : [],
  });
  const options = program.opts();

  await isCleanGuard(git);
  log.info("Проверка репозитория заверешена");

  const fromBranch = await getBranch(git, options.from);
  const toBranch = await getBranch(git, options.to);
  log.info("Проверка веток заверешена");

  await git.checkout(fromBranch.name);
  log.info(`Перешли на ветку ${fromBranch.name}`);

  try {
    await git.rebase(["--interactive", toBranch.commit]);
    log.info("Ребейс успешно завершен (Возможно необходимо решить конфликты)");
  } catch (e) {
    log.error(e.message);
  }

  log.info("Подготовка успешно выполнена");
};

main().then(() => {
  process.exit(1);
});
