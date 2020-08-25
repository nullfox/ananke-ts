import {
  fill,
  set,
  zipObject,
} from 'lodash';

import Plugin, { Key } from '../plugin';
import File, { RPC, Type } from './file';

const replacePsuedo = (tag: string, string: string, replacements: { [key: string]: string } = {}): string => {
  const regex = new RegExp(`#{${tag}::([^}]+)}`, 'g');

  let match = regex.exec(string);
  const matches = [];

  while (match !== null) {
    matches.push(match[1]);
    match = regex.exec(string);
  }

  if (matches.length === 0) {
    return string;
  }

  let replaced = string;

  matches.forEach((key) => {
    replaced = replaced.replace(`#{${tag}::${key}}`, replacements[key]);
  });

  return replaced;
};

export default class Handler {
  file: File | RPC
  plugin: Plugin

  static factory(file: File | RPC, plugin: Plugin) {
    return new Handler(file, plugin);
  }

  constructor(file: File | RPC, plugin: Plugin) {
    this.file = file;
    this.plugin = plugin;
  }

  getKey(): string {
    return this.file.getPath().split('/').pop()!.replace(/\.ts|\.js/, '').replace(/\./g, '-');
  }

  getName(): string {
    return `${this.plugin.options.stage}-${this.plugin.sls.service.getServiceName()}-${this.getKey()}`;
  }

  getHandlerName(): string {
    return `${this.file.getOutputPath().replace(/\.ts|\.js/, '')}.handler`;
  }

  toServerless(): object {
   return {
      name: this.getName(),
      type: this.file.getType(),
      handler: this.getHandlerName(),
      events: [this.generateEvent()],
    };
  }

  generateEvent(): { [key: string]: any } {
    switch (this.file.getType()) {
      case Type.Queue:
        return this.generateQueueEvent();
      case Type.Schedule:
        return this.generateScheduleEvent();
      case Type.RPC:
        return this.generateRpcEvent();
      case Type.REST:
        return this.generateRestEvent();
      default:
        return {};
    }
  }

  generateQueueEvent(): { [key: string]: any } {
    const {
      queue,
    } = this.file.getTags();

    const replacements = {
      StageName: this.plugin.options.stage!,
    };

    const replaced = replacePsuedo(
      this.plugin.getCustomValue(Key.PsuedoName, 'Ananke'),
      queue,
      replacements,
    );

    return {
      sqs: `arn:aws:sqs:#{AWS::Region}:#{AWS::AccountId}:${replaced}`,
    };
  }

  generateScheduleEvent(): { [key: string]: any } {
    return {
      schedule: this.file.getTags().schedule,
    };
  }

  generateRpcEvent(): { [key: string]: any } {
    return {
      http: {
        method: 'POST',
        path: this.file.getTags().rpc,
        cors: true,
      },
    };
  }

  generateRestEvent(): { [key: string]: any } {
    const rest = {
      method: this.file.getTags().rest.split(' ').shift(),
      path: this.file.getTags().rest.split(' ').pop(),
      cors: true,
    };

    const pathParams = (rest.path!.match(/\{(\w+)\}/g) || [])
      .map((param) => param.replace(/[{}]+/g, ''));

    set(
      rest,
      'request.parameters.paths',
      zipObject(
        pathParams,
        fill(Array(pathParams.length), true),
      ),
    );

    return {
      http: rest,
    };
  }
}
