import {
  readFileSync,
  writeFileSync,
} from 'fs';

import {
  basename,
  dirname,
  join,
  relative,
  resolve,
} from 'path';

import {
  fromPairs,
  get,
  has,
  keys,
  intersection,
  template as compileTemplate,
  merge,
  omit,
} from 'lodash';

import DocBlock from 'docblock';

import Plugin, { Key } from '../plugin';
import Handler from './handler';
import RPC from './file/rpc';

export enum Type {
  Unknown = 'unknown',
  RPC = 'rpc',
  REST = 'rest',
  Schedule = 'schedule',
  Queue = 'queue',
  Method = 'method',
}

export default class File {
  path: string
  plugin: Plugin
  tags: { [key: string]: string }
  type: Type

  static getTags(file: string): { [key: string]: string } {
    const db = new DocBlock();
  
    if (!/.*(ts|js)$/.test(file)) {
      throw new Error(`${file} must end in .js or .ts`);
    }
  
    const code = readFileSync(file);
  
    const tags = db.parse(
      code,
      'js',
    )
      .shift();

    if (has(tags.tags, 'unknown')) {
      return omit(
        merge(
          tags.tags,
          fromPairs(
            tags.tags.unknown.map((tag: { [key: string]: string }) => [tag.tag, tag.value])
          )
        ),
        'unknown',
      );
    }

    return tags.tags;
  }

  static getType(tags: object): Type {
    const types = Object.values(Type);

    const foundTypes = intersection(types, keys(tags));

    if (foundTypes.length > 1) {
      throw new Error(`File contains more than one handler type ${foundTypes.join(', ')}`)
    }

    // Makes it work with enums
    switch (foundTypes.shift()) {
      case 'rpc':
        return Type.RPC;
      case 'rest':
        return Type.REST;
      case 'schedule':
        return Type.Schedule;
      case 'queue':
        return Type.Queue;
      case 'method':
        return Type.Method;
      default:
        return Type.Unknown;
    }
  }

  static getTemplate(name: string): Function {
    const template = readFileSync(
      join(
        __dirname,
        'templates',
        `${name}.js.template`,
      ),
    )
      .toString();

    return compileTemplate(template);
  }

  static factory(path: string, plugin: Plugin): File {
    return new File(path, plugin);
  }

  constructor(path: string, plugin: Plugin) {
    this.path = path;
    this.plugin = plugin;
    this.tags = File.getTags(path);
    this.type = File.getType(this.tags);
  }

  getPath(): string {
    return this.path;
  }

  getTags(): { [key: string]: string } {
    return this.tags;
  }

  getType(): Type {
    return this.type;
  }

  getHandler(): Handler {
    return Handler.factory(this, this.plugin);
  }

  getOptions(): object {
    const tags: { [key: string]: any } = this.getTags();
  
    const options: { [key: string]: any } = {
      auth: get(tags, 'auth') !== 'false',
    };

    if (tags.params) {
      options.validation = fromPairs(
        tags.params.map((param: { [key: string]: string }) => (
          [param.name, param.type]
        )),
      );
    }

    return options;
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

  shouldRegister(): boolean {
    return this.getType() !== Type.Unknown
      && this.getType() !== Type.Method;
  }

  write(): void {
    const tmpl = File.getTemplate(this.type);

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
    };
  
    return writeFileSync(
      this.getOutputPath(),
      tmpl(replacements),
    );
  }
}

export {
  RPC,
};
