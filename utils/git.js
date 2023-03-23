const getBranch = async (git, branchName) => {
  const { branches } = await git.branch();
  const branch = branches[branchName];

  if (!branch) {
    throw new Error(`Ветки ${branchName} не существует`);
  }

  return branch;
};

const isCleanGuard = async (git) => {
  const isClean = (await git.status()).isClean();

  if (!isClean) {
    throw new Error("Есть не закоммиченные изменения");
  }
};

module.exports = {
  getBranch,
  isCleanGuard,
};
