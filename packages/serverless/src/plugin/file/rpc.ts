import {
  basename,
  dirname,
  join,
  relative,
  resolve,
} from 'path';

import {
  writeFileSync,
} from 'fs';

import { sync } from 'mkdirp';

import Plugin, { Key } from '../../plugin';
import Handler from '../handler';

import File, { Type } from '../file';

export default class RPC {
  plugin: Plugin

  static factory(plugin: Plugin): RPC {
    return new RPC(plugin);
  }

  constructor(plugin: Plugin) {
    this.plugin = plugin;
  }

  getPath(): string {
    return join(
      this.plugin.getCustomValue(Key.FunctionSource),
      'rpc.js',
    );
  }

  getTags(): { [key: string]: string } {
    return {
      rpc: this.plugin.getCustomValue(Key.RpcPath),
    };
  }

  getType(): Type {
    return Type.RPC;
  }

  getHandler(): Handler {
    return Handler.factory(this, this.plugin);
  }

  getOptions(): object {
    return {};
  }

  getOutputFile(): string {
    return `_${basename(this.getPath())}`;
  }
  
  getOutputPath(): string {
    return join(
      dirname(this.getPath()),
      this.getOutputFile(),
    );
  }

  write(): void {
    const tmpl = File.getTemplate(this.getType());

    const contextPath = relative(
      resolve(dirname(this.getPath())),
      resolve(this.plugin.getCustomValue(Key.Context)),
    );

    const sourcePath = relative(
      resolve(dirname(this.getPath())),
      resolve(this.getPath()),
    )
      .replace(/\.ts|\.js/, '');

    const replacements = {
      contextPath: contextPath,
      sourcePath: sourcePath,
      options: JSON.stringify(this.getOptions()),
      path: resolve(this.plugin.getCustomValue(Key.RpcMethodSource)),
    };

    // Ensures the directory exists...
    sync(dirname(this.getOutputPath()));
  
    return writeFileSync(
      this.getOutputPath(),
      tmpl(replacements),
    );
  }
}