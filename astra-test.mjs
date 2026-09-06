import OpenAI from "openai";
import readline from "readline";
import fs from "fs/promises";
import path from "path";
import "dotenv/config";

/*
========================================================
ASTRA CONFIGURATION
========================================================
Your API credentials come from PowerShell environment
variables:

EXPLABS_API_KEY
========================================================
*/

const apiKey = process.env.EXPLABS_API_KEY;

if (!apiKey) {
  console.error("EXPLABS_API_KEY is not set. Please create one under Settings -> API keys and export it.");
  process.exit(1);
}

const client = new OpenAI({
  apiKey: apiKey,
  baseURL: "https://api.experientiallabs.ai/v1"
});

/*
========================================================
CODEBASE
========================================================
process.cwd() automatically uses the folder from which
you start Astra.

For you this should be:

D:\CODE\F1 Game
========================================================
*/

const CODEBASE = process.cwd();

/*
========================================================
ASTRA MEMORY
========================================================
Astra remembers the conversation during this session.
========================================================
*/

const messages = [
  {
    role: "system",
    content: `
You are Astra, an AI coding assistant working with the user's local project.

The user's project is connected through a local Node.js program.

Important rules:

1. Only claim to know code that has actually been provided to you.
2. When the user provides files or search results, analyze the actual code.
3. Do not invent filenames, functions, variables, or project structure.
4. Help the user understand, debug, improve, and modify their project.
5. Give practical programming explanations.
6. When suggesting a change, explain what should change and why.
7. Remember previously provided code during this conversation.
8. Never claim you can directly see the whole computer. You can only see project files that the local program sends to you.
`
  }
];

/*
========================================================
TERMINAL
========================================================
*/

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "You: "
});

/*
========================================================
SECURITY
========================================================
These files/folders will NOT be read.
========================================================
*/

function isBlocked(relativePath) {
  const normalized = relativePath.replace(/\\/g, "/");

  if (
    normalized.includes("node_modules/") ||
    normalized.startsWith(".git/") ||
    normalized === ".env" ||
    normalized.startsWith(".env.")
  ) {
    return true;
  }

  return false;
}

/*
========================================================
GET ALL PROJECT FILES
========================================================
*/

async function getAllFiles(dir, results = []) {
  const entries = await fs.readdir(dir, {
    withFileTypes: true
  });

  for (const entry of entries) {
    /*
    Skip folders that should not be inspected.
    */

    if (
      entry.name === "node_modules" ||
      entry.name === ".git" ||
      entry.name === ".cache" ||
      entry.name === "dist" ||
      entry.name === "build"
    ) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(CODEBASE, fullPath);

    if (entry.isDirectory()) {
      await getAllFiles(fullPath, results);
    } else {
      if (!isBlocked(relativePath)) {
        results.push(relativePath);
      }
    }
  }

  return results;
}

/*
========================================================
READ ONE FILE
========================================================
*/

async function readCodeFile(relativePath) {
  if (!relativePath) {
    throw new Error("No file path was provided.");
  }

  if (isBlocked(relativePath)) {
    throw new Error("That file is blocked for safety.");
  }

  const root = path.resolve(CODEBASE);
  const fullPath = path.resolve(CODEBASE, relativePath);

  /*
  Prevent reading files outside the project folder.
  */

  if (
    fullPath !== root &&
    !fullPath.startsWith(root + path.sep)
  ) {
    throw new Error(
      "You can only read files inside the project folder."
    );
  }

  return await fs.readFile(fullPath, "utf8");
}

/*
========================================================
SEARCH THE CODEBASE
========================================================
*/

async function searchCode(query) {
  if (!query) {
    return [];
  }

  const files = await getAllFiles(CODEBASE);
  const results = [];

  for (const relativePath of files) {
    const fullPath = path.join(CODEBASE, relativePath);

    try {
      const content = await fs.readFile(
        fullPath,
        "utf8"
      );

      /*
      Case-insensitive search.
      */

      if (
        content
          .toLowerCase()
          .includes(query.toLowerCase())
      ) {
        results.push({
          file: relativePath,
          content
        });
      }
    } catch {
      /*
      Ignore binary files or files Node cannot read as UTF-8.
      */
    }
  }

  return results;
}

/*
========================================================
SEND MESSAGE TO ASTRA
========================================================
*/

async function askAstra(text) {
  messages.push({
    role: "user",
    content: text
  });

  const response =
    await client.chat.completions.create({
      model: "gpt-6-astra",
      messages: messages
    });

  const reply =
    response.choices?.[0]?.message?.content;

  if (!reply) {
    throw new Error(
      "Astra returned an empty response."
    );
  }

  messages.push({
    role: "assistant",
    content: reply
  });

  return reply;
}

/*
========================================================
STARTUP
========================================================
*/

console.log("");
console.log("========================================");
console.log("              ASTRA AI");
console.log("========================================");
console.log("");
console.log("Workspace:");
console.log(CODEBASE);
console.log("");
console.log("Astra can inspect your project.");
console.log("");
console.log("Commands:");
console.log("/tree");
console.log("/read <file>");
console.log("/search <text>");
console.log("/exit");
console.log("");
console.log("========================================");
console.log("");

rl.prompt();

/*
========================================================
USER INPUT
========================================================
*/

rl.on("line", async (input) => {
  const text = input.trim();

  /*
  Empty input
  */

  if (!text) {
    rl.prompt();
    return;
  }

  /*
  ======================================================
  EXIT
  ======================================================
  */

  if (
    text.toLowerCase() === "/exit" ||
    text.toLowerCase() === "exit"
  ) {
    console.log("");
    console.log("Astra: Goodbye!");
    console.log("");

    rl.close();
    return;
  }

  /*
  ======================================================
  TREE
  ======================================================
  */

  if (text.toLowerCase() === "/tree") {
    try {
      const files =
        await getAllFiles(CODEBASE);

      console.log("");
      console.log(
        "========== PROJECT FILES =========="
      );
      console.log("");

      if (files.length === 0) {
        console.log(
          "No readable project files were found."
        );
      } else {
        for (const file of files) {
          console.log(file);
        }
      }

      console.log("");
      console.log(
        "==================================="
      );
      console.log("");
    } catch (error) {
      console.log("");
      console.log("Could not read project:");
      console.log(error?.message || error);
      console.log("");
    }

    rl.prompt();
    return;
  }

  /*
  ======================================================
  READ FILE
  ======================================================
  */

  if (
    text
      .toLowerCase()
      .startsWith("/read ")
  ) {
    const relativePath =
      text.slice(6).trim();

    if (!relativePath) {
      console.log("");
      console.log(
        "Usage: /read filename.js"
      );
      console.log("");

      rl.prompt();
      return;
    }

    try {
      const content =
        await readCodeFile(relativePath);

      console.log("");
      console.log(
        `Astra loaded: ${relativePath}`
      );
      console.log("");

      /*
      Send the real file contents to Astra.
      */

      messages.push({
        role: "user",
        content: `
The user has loaded this actual file from their local project.

FILE:
${relativePath}

CONTENT:
\`\`\`
${content}
\`\`\`

Use this actual file content as context for future questions.
Do not claim access to files that were not provided.
`
      });
    } catch (error) {
      console.log("");
      console.log("Could not read file:");
      console.log(error?.message || error);
      console.log("");
    }

    rl.prompt();
    return;
  }

  /*
  ======================================================
  SEARCH
  ======================================================
  */

  if (
    text
      .toLowerCase()
      .startsWith("/search ")
  ) {
    const query =
      text.slice(8).trim();

    if (!query) {
      console.log("");
      console.log(
        "Usage: /search tyre"
      );
      console.log("");

      rl.prompt();
      return;
    }

    console.log("");
    console.log(
      `Searching project for: ${query}`
    );
    console.log("");

    try {
      const results =
        await searchCode(query);

      if (results.length === 0) {
        console.log(
          "No matching files found."
        );
        console.log("");
      } else {
        console.log(
          `Found ${results.length} matching file(s).`
        );
        console.log("");

        /*
        Show matching files in terminal.
        */

        for (const result of results) {
          console.log(
            "----------------------------------------"
          );

          console.log(
            `FILE: ${result.file}`
          );

          console.log(
            "----------------------------------------"
          );

          /*
          Only print the first 20,000 characters
          of a file to keep the terminal usable.
          */

          const preview =
            result.content.length > 20000
              ? result.content.slice(
                  0,
                  20000
                ) +
                "\n\n[FILE CONTINUES...]"
              : result.content;

          console.log(preview);
          console.log("");
        }

        /*
        Send matching files to Astra.
        Limit to the first 10 matching files
        to prevent extremely large requests.
        */

        const context =
          results
            .slice(0, 10)
            .map((result) => {
              const content =
                result.content.length > 20000
                  ? result.content.slice(
                      0,
                      20000
                    ) +
                    "\n\n[FILE CONTINUES...]"
                  : result.content;

              return `
FILE:
${result.file}

CONTENT:
${content}
`;
            })
            .join(
              "\n\n============================\n\n"
            );

        messages.push({
          role: "user",
          content: `
The local project search found the following actual files.

${context}

Use these files as factual context for my next question.
`
        });

        console.log(
          "The matching code has been provided to Astra."
        );

        console.log("");
      }
    } catch (error) {
      console.log("");
      console.log("Search failed:");
      console.log(error?.message || error);
      console.log("");
    }

    rl.prompt();
    return;
  }

  /*
  ======================================================
  NORMAL CHAT
  ======================================================
  */

  try {
    process.stdout.write("\nAstra: ");

    const reply =
      await askAstra(text);

    console.log(reply);
    console.log("");
  } catch (error) {
    console.log("");
    console.log("Astra error:");
    console.log(
      error?.message || error
    );
    console.log("");
  }

  rl.prompt();
});

/*
========================================================
CLOSE
========================================================
*/

rl.on("close", () => {
  process.exit(0);
});