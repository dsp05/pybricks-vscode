import * as vscode from 'vscode';
import { parse, walk } from '@pybricks/python-program-analysis';
import { compile } from '@pybricks/mpy-cross-v6';
import path from 'path';

type Module = {
  name: string;
  path: string;
  content: string;
}

export async function compileAsync(): Promise<Blob> {
  await vscode.commands.executeCommand('workbench.action.files.saveAll');
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    throw new Error('No active text editor found. Please open a Python file to compile.');
  }
  const content = editor.document.getText();
  const folder = path.dirname(editor.document.uri.fsPath);

  const parts: BlobPart[] = [];

  const modules: Module[] = [{
    name: '__main__',
    path: '__main__.py',
    content: content
  }];

  const checkedModules = new Set<string>();

  while (modules.length > 0) {
    const module = modules.pop()!;
    if (checkedModules.has(module.name)) {
      continue;
    }
    checkedModules.add(module.name);

    console.log(`Compiling module: ${module.name} (${module.path})`);
    const importedModules = findImportedModules(module.content);
    for (const importedModule of importedModules) {
      if (checkedModules.has(importedModule)) {
        continue;
      }
      const resolvedModule = await resolveModuleAsync(folder, importedModule);
      if (resolvedModule) {
        modules.push(resolvedModule);
      } else {
        checkedModules.add(importedModule);
      }
    }

    const compiled = await compile(
      module.path,
      module.content,
      undefined,
      undefined,
    );
    if (compiled.status !== 0 || !compiled.mpy) {
      throw new Error(`Failed to compile ${module.name}`);
    }

    parts.push(encodeUInt32LE(compiled.mpy.length));
    parts.push(cString(module.name));
    parts.push(compiled.mpy);

    checkedModules.add(module.name);
  }

  return new Blob(parts);
}

async function resolveModuleAsync(folder: string, module: string): Promise<Module | undefined> {
  const relativePath = module.replace(/\./g, path.sep) + '.py';
  let absolutePath = path.join(folder, relativePath);
  try {
    const uri = vscode.Uri.file(absolutePath);
    const stats = await vscode.workspace.fs.stat(uri);
    if (stats.type === vscode.FileType.File) {
      return {
        name: module,
        path: relativePath,
        content: Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8'),
      };
    }
  } catch { }
}

const encoder = new TextEncoder();

function cString(str: string): Uint8Array {
  return encoder.encode(str + '\x00');
}

function encodeUInt32LE(value: number): ArrayBuffer {
  const buf = new ArrayBuffer(4);
  const view = new DataView(buf);
  view.setUint32(0, value, true);
  return buf;
}

function findImportedModules(py: string): ReadonlySet<string> {
  const modules = new Set<string>();

  const tree = parse(py);

  walk(tree, {
    onEnterNode(node, _ancestors) {
      if (node.type === 'import') {
        for (const name of node.names) {
          modules.add(name.path);
        }
      } else if (node.type === 'from') {
        modules.add(node.base);
      }
    },
  });

  return modules;
}
