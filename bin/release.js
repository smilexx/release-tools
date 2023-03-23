#! /usr/bin/env node
const { program } = require("commander");
const simpleGit = require("simple-git");
const inquirer = require("inquirer");
const packageJson = require("../package.json");
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const { getBranch, isCleanGuard } = require("../utils/git");
const log = require("fancy-log");

program.version(packageJson.version);

program
  .description(
    "Команда для релиза проекта \n Перед релизом необходимо превести в порядок коммиты в ветке, из которой будет происходить релиз!"
  )
  .option("-t, --to <to>", "в какую ветку будет собираться релиз", "release")
  .option(
    "-f, --from <from>",
    "из какой ветки будет собираться релиз",
    "develop"
  )
  .requiredOption(
    "-s, --script <script>",
    "какой скрипт запускать для релиза из package.json"
  )
  .parse();

const main = async () => {
  const git = simpleGit({ baseDir: process.cwd() });

  const options = program.opts();

  await isCleanGuard(git);
  log.info("Проверка репозитория заверешена");

  const fromBranch = await getBranch(git, options.from);
  const toBranch = await getBranch(git, options.to);
  log.info("Проверка веток заверешена");

  log.info("Получение коммитов");
  const { all } = await git.log({
    from: toBranch.commit,
    to: fromBranch.commit,
  });
  log.info(`Получение коммитов заверешно. Всего коммитов ${all.length}`);

  const { commit } = await inquirer.prompt([
    {
      type: "list",
      name: "commit",
      message: "Выберите коммит, с которого будет релиз",
      loop: false,
      choices: all.map(({ message, body, hash }) => {
        // const closes = body.match(/(Closes) (.*)/gim);

        return {
          name: `[${hash.slice(0, 8)}] ${message}`,
          value: hash,
        };
      }),
    },
  ]);

  log.info(`Выбран коммит: ${commit}`);

  await git.checkout(options.from);
  log.info(`Выполнен переход на ветку ${options.from}`);

  await git.reset(["--hard", commit]);
  log.info(`Выполнен сброс на коммит ${commit}`);

  await git.checkout(options.to);
  log.info(`Выполнен переход на ветку ${options.to}`);

  log.info(`Перенос коммитов из ветки ${options.from} в ветку ${options.to}`);
  await git.rebase([options.from]);

  log.info("Запуск скрипта релиза");
  await exec(`npm run ${options.script}`);
  log.info("Скрипт релиза выполнен");

  log.info(`Отправка коммитов ветки ${options.to}`);
  await git.push(["--follow-tags"]);

  await git.checkout(options.from);
  log.info(`Выполнен переход на ветку ${options.from}`);

  log.info(`Получение коммитов ветки ${options.from}`);
  await git.pull();

  log.info(`Перенос коммитов из ветки ${options.to} в ветку ${options.from}`);
  await git.rebase([options.to]);

  log.info("Релиз выполнен успешно");
};

main().then(() => {
  process.exit(0);
});
