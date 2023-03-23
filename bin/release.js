#! /usr/bin/env node
const { program } = require("commander");
const simpleGit = require("simple-git");
const inquirer = require("inquirer");
const packageJson = require("../package.json");
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const { getBranch, isCleanGuard } = require("../utils/git");

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
  .option(
    "-s, --script <script>",
    "какой скрипт запускать для релиза из package.json",
    "up"
  )
  .parse();

const main = async () => {
  const git = simpleGit({ baseDir: process.cwd() });

  const options = program.opts();

  await isCleanGuard(git);

  const fromBranch = await getBranch(git, options.from);
  const toBranch = await getBranch(git, options.to);

  const { all } = await git.log({
    from: toBranch.commit,
    to: fromBranch.commit,
  });

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

  await git.checkout(options.from);
  await git.reset(["--hard", commit]);
  await git.checkout(options.to);
  await git.rebase([options.from]);

  await exec(`npm run ${options.script}`);
  await git.push(["--follow-tags"]);

  await git.checkout(from);
  await git.pull();
  await git.rebase([options.to]);
};

main().then(() => {
  process.exit(0);
});
