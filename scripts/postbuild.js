import fs from "fs";
import path from "path";

async function postbuild() {
  try {
    const distDir = path.resolve(process.cwd(), "dist");
    const publicDir = path.resolve(process.cwd(), ".output/public");
    const serverEntry = path.resolve(process.cwd(), ".output/server/index.mjs");

    fs.mkdirSync(distDir, { recursive: true });

    if (fs.existsSync(publicDir)) {
      fs.cpSync(publicDir, distDir, { recursive: true });
    }

    if (fs.existsSync(serverEntry)) {
      const server = await import(serverEntry);
      if (server.default?.fetch) {
        const res = await server.default.fetch(
          new Request("http://localhost:3000/"),
          {},
          { waitUntil: () => {} },
        );
        const html = await res.text();
        fs.writeFileSync(path.join(distDir, "index.html"), html, "utf8");
      }
    }
  } catch (err) {
    console.error("Postbuild error:", err);
  }
}

postbuild();
